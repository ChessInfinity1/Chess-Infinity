type Identity = { id: string; email?: string };
export type DeveloperContext = {
  db: D1Database;
  ownerUserId?: string;
  origin: string;
  getSession: (headers: Headers) => Promise<{ user: Identity } | null>;
};

// The owner is provisioned by an operator using an existing immutable account ID.
// Email addresses are not verified by this app and never confer privileges.
export function isOwnerId(userId: string | undefined, ownerId: string | undefined) {
  return !!ownerId?.trim() && !!userId && userId === ownerId.trim();
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff",
  } });
}

const safeData = "CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END";
const countAt = (path: string) => `COALESCE(json_array_length(${safeData}, '${path}'),0)`;
const userFields = `u.id, u.name, u.email, u.email_verified AS emailVerified,
  u.created_at AS createdAt, u.updated_at AS updatedAt, p.updated_at AS lastSaveAt,
  COALESCE(p.version,0) AS saveVersion,
  COALESCE(CAST(json_extract(${safeData}, '$.xp') AS INTEGER),0) AS xp,
  ${countAt("$.completed")} AS lessons, ${countAt("$.puzzles")} AS puzzleAttempts,
  ${countAt("$.games")} AS games,
  (SELECT count(*) FROM auth_session s WHERE s.user_id=u.id AND s.expires_at>?) AS activeSessions`;
const join = "FROM auth_user u LEFT JOIN progress p ON p.user_id=u.id";
const literalLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export async function handleDeveloperRequest(request: Request, context: DeveloperContext) {
  try {
    const session = await context.getSession(request.headers);
    if (!session) return json({ error: "Sign in to continue." }, 401);
    if (!isOwnerId(session.user.id, context.ownerUserId)) return json({ error: "Developer access required." }, 403);
    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/api\/developer\/?/, "");
    const now = Date.now();
    const week = new Date(now - 7 * 86400000).toISOString();
    const db = context.db;
    if (request.method === "POST") {
      if (request.headers.get("origin") !== context.origin || url.origin !== context.origin || request.headers.get("sec-fetch-site") === "cross-site")
        return json({ error: "This action must start from your Academy." }, 403);
      if (route !== "revoke-sessions") return json({ error: "Unknown action." }, 404);
      if (Number(request.headers.get("content-length") || 0) > 512) return json({ error: "Request too large." }, 413);
      // Read a bounded stream before parsing, including chunked requests.
      const reader = request.body?.getReader();
      let size = 0;
      const decoder = new TextDecoder();
      let text = "";
      if (reader) while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 512) { await reader.cancel(); return json({ error: "Request too large." }, 413); }
        text += decoder.decode(part.value, { stream: true });
      }
      let body: unknown;
      try { body = JSON.parse(text + decoder.decode()); }
      catch { return json({ error: "Invalid request." }, 400); }
      const targetId = body && typeof body === "object" && "userId" in body ? body.userId : null;
      if (typeof targetId !== "string" || !targetId || targetId.length > 128) return json({ error: "Choose an account." }, 400);
      if (isOwnerId(targetId, context.ownerUserId)) return json({ error: "Use the normal sign-out control for your owner account." }, 409);
      if (!await db.prepare("SELECT id FROM auth_user WHERE id=?").bind(targetId).first()) return json({ error: "Account not found." }, 404);
      // D1 batches are atomic: an audited action and its session deletion succeed together.
      const results = await db.batch<Record<string, unknown>>([
        db.prepare("DELETE FROM auth_session WHERE user_id=?").bind(targetId),
        db.prepare("INSERT INTO developer_audit(id,actor_id,target_id,action,created_at) VALUES(?,?,?,?,?)")
          .bind(crypto.randomUUID(), session.user.id, targetId, "revoke_sessions", new Date(now).toISOString()),
      ]);
      return json({ revoked: results[0].meta.changes || 0 });
    }
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
    if (route === "overview") {
      const results = await db.batch<Record<string, unknown>>([
        db.prepare("SELECT count(*) AS totalAccounts, COALESCE(sum(created_at>=?),0) AS newAccounts7d FROM auth_user").bind(now - 7 * 86400000),
        db.prepare(`SELECT count(*) AS savedProfiles, COALESCE(sum(updated_at>=?),0) AS recentSaves,
          COALESCE(sum(length(CAST(p.data AS BLOB))),0) AS progressBytes,
          COALESCE(sum(${countAt("$.completed")}),0) AS completedLessons,
          COALESCE(sum(${countAt("$.puzzles")}),0) AS puzzleAttempts,
          COALESCE(sum(${countAt("$.games")}),0) AS savedGames FROM progress p`).bind(week),
        db.prepare("SELECT count(*) AS activeSessions FROM auth_session WHERE expires_at>?").bind(now),
        db.prepare("SELECT date(created_at/1000,'unixepoch') AS day,count(*) AS count FROM auth_user WHERE created_at>=? GROUP BY day ORDER BY day").bind(now - 7 * 86400000),
      ]);
      return json({ ...results[0].results[0], ...results[1].results[0], ...results[2].results[0], signups: results[3].results, checkedAt: new Date(now).toISOString() });
    }
    if (route === "users") {
      const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
      const rawPage = Number(url.searchParams.get("page") || 1);
      const page = Number.isSafeInteger(rawPage) ? Math.max(1, Math.min(100000, rawPage)) : 1;
      const limit = 20;
      const where = query ? "WHERE (lower(u.email) LIKE ? ESCAPE '\\' OR lower(u.name) LIKE ? ESCAPE '\\')" : "";
      const filter = query ? [`%${literalLike(query.toLowerCase())}%`, `%${literalLike(query.toLowerCase())}%`] : [];
      const results = await db.batch<Record<string, unknown>>([
        db.prepare(`SELECT count(*) AS total FROM auth_user u ${where}`).bind(...filter),
        db.prepare(`SELECT ${userFields} ${join} ${where} ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?`).bind(now, ...filter, limit, (page - 1) * limit),
      ]);
      return json({ users: results[1].results.map(row => ({ ...row, isOwner: isOwnerId(String(row.id), context.ownerUserId) })), total: results[0].results[0].total, page, limit });
    }
    if (route === "user") {
      const id = url.searchParams.get("id");
      if (!id || id.length > 128) return json({ error: "Choose an account." }, 400);
      const row = await db.prepare(`SELECT ${userFields},
        (SELECT count(*) FROM json_each(${safeData}, '$.puzzles') WHERE json_extract(CASE WHEN json_valid(value) THEN value ELSE '{}' END,'$.correct')=1) AS correctPuzzles,
        ${countAt("$.analyses")} AS analyses,
        COALESCE(CAST(json_extract(${safeData}, '$.puzzleRating') AS INTEGER),0) AS puzzleRating,
        substr(CAST(json_extract(${safeData}, '$.goal') AS TEXT),1,160) AS goal,
        substr(CAST(json_extract(${safeData}, '$.accounts.chesscom.profile.username') AS TEXT),1,80) AS chesscom,
        substr(CAST(json_extract(${safeData}, '$.accounts.lichess.profile.username') AS TEXT),1,80) AS lichess,
        COALESCE(length(CAST(p.data AS BLOB)),0) AS progressBytes ${join} WHERE u.id=?`).bind(now, id).first();
      if (!row) return json({ error: "Account not found." }, 404);
      return json({ ...row, isOwner: isOwnerId(String(row.id), context.ownerUserId) });
    }
    if (route === "audit") {
      const result = await db.prepare(`SELECT a.id,a.actor_id AS actorId,a.target_id AS targetId,a.action,a.created_at AS createdAt,u.name AS targetName
        FROM developer_audit a LEFT JOIN auth_user u ON u.id=a.target_id ORDER BY a.created_at DESC LIMIT 50`).all();
      return json({ events: result.results });
    }
    return json({ error: "Not found." }, 404);
  } catch {
    return json({ error: "The developer service is unavailable. Please retry." }, 503);
  }
}
