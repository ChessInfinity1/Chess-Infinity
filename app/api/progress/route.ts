import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import {
  readProgress,
  writeProgress,
  deleteProgress,
  SaveConflict,
} from "../../../lib/progress-store";
import { validateProgress } from "../../../lib/progress-backup";
import { env } from "cloudflare:workers";
export async function GET() {
  const u = await getChatGPTUser();
  if (!u)
    return Response.json(
      { error: "Sign in to save across devices." },
      { status: 401 },
    );
  return Response.json(await readProgress(getDb(), u.userId), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function PUT(req: Request) {
  const u = await getChatGPTUser();
  if (!u) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return new Response(null, { status: 403 });
  const raw = await req.text();
  if (raw.length > 1900000)
    return new Response(
      "Progress is too large. Export and remove older games.",
      { status: 413 },
    );
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return new Response("Invalid data", { status: 400 });
  }
  if (
    !b.data ||
    !Array.isArray(b.data.completed) ||
    !Number.isInteger(b.version) ||
    b.version < 0
  )
    return new Response("Invalid progress", { status: 400 });
  try { b.data = validateProgress(b.data); }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
  try {
    return Response.json(
      await writeProgress(getDb(), u.userId, b.data, b.version),
    );
  } catch (e) {
    if (e instanceof SaveConflict)
      return Response.json({ error: e.message }, { status: 409 });
    return Response.json(
      { error: "Cloud save failed. Your device will retry." },
      { status: 503 },
    );
  }
}
export async function DELETE(req: Request) {
  const u = await getChatGPTUser();
  if (!u) return new Response(null, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return new Response(null, { status: 403 });
  await deleteProgress(getDb(), u.userId);
  await env.DB!.prepare("DELETE FROM practice_push WHERE user_id = ?").bind(u.userId).run();
  return Response.json({ deleted: true });
}
