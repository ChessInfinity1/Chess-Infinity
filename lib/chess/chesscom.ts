async function read(url: string) {
  let r: Response;
  try {
    r = await fetch(url, {
      headers: {
        "User-Agent": "ChessInfinity/1.0 (public-profile training importer)",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new Error(
      /timeout|abort/i.test((e as Error).name)
        ? "Chess.com took too long to respond. Please retry, or connect later."
        : "Chess.com could not be reached. Please retry in a moment, or skip this step and connect later.",
    );
  }
  if (!r.ok)
    throw new Error(
      r.status === 429
        ? "Chess.com rate limit reached. Please wait one minute before syncing again."
        : r.status === 404
          ? "This public profile was not found."
          : `Chess.com returned ${r.status}. Please try later.`,
    );
  return r.json() as any;
}
export function parseArchiveCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const m = cursor.match(/^(\d{4})\/(0[1-9]|1[0-2]):(\d{1,7})$/);
  if (!m || +m[1] < 2007 || +m[3] > 1000000)
    throw new Error("Invalid archive cursor. Sync the profile again.");
  return { month: m[1] + "/" + m[2], offset: +m[3] };
}
export async function fetchChessCom(name: string, cursor?: string) {
  const parsed = parseArchiveCursor(cursor);
  const root = `https://api.chess.com/pub/player/${encodeURIComponent(name)}`;
  const profile = await read(root);
  const stats = await read(root + "/stats");
  const response = await read(root + "/games/archives");
  const archives = (response.archives || [])
    .filter(
      (u: unknown) =>
        typeof u === "string" &&
        /^https:\/\/api\.chess\.com\/pub\/player\/[-_a-z0-9]+\/games\/\d{4}\/(0[1-9]|1[0-2])$/i.test(
          u,
        ),
    )
    .sort()
    .reverse() as string[];
  let index = parsed
    ? archives.findIndex((u) => u.endsWith("/" + parsed.month))
    : 0;
  if (index < 0)
    throw new Error(
      "This game archive is no longer available. Sync the profile again.",
    );
  let offset = parsed?.offset || 0;
  const games: any[] = [];
  let nextCursor: string | null = null;
  // One bounded page, serial provider requests, including overflow within a month.
  for (
    let visited = 0;
    index < archives.length && visited < 3;
    visited++, index++
  ) {
    const archive = archives[index];
    const batch = await read(archive);
    const available = (batch.games || [])
      .filter((g: any) => g.rules === "chess" && g.end_time && g.pgn)
      .sort((a: any, b: any) => b.end_time - a.end_time);
    const take = available.slice(offset, offset + 40 - games.length);
    games.push(...take);
    offset += take.length;
    if (games.length === 40) {
      nextCursor =
        offset < available.length
          ? archive.slice(-7) + ":" + offset
          : archives[index + 1]
            ? archives[index + 1].slice(-7) + ":0"
            : null;
      break;
    }
    offset = 0;
    nextCursor = archives[index + 1]
      ? archives[index + 1].slice(-7) + ":0"
      : null;
  }
  return {
    profile,
    stats,
    games,
    syncedAt: new Date().toISOString(),
    nextCursor,
    archiveCount: archives.length,
    coverage: nextCursor
      ? "Showing a page of up to 40 completed standard games. Load older games to continue through all available monthly archives."
      : "All remaining completed standard games from the available archives are loaded.",
  };
}
