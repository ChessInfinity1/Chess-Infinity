import { cookies } from "next/headers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { cookieOptions } from "../../../../lib/chess/oauth";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getChatGPTUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const jar = await cookies();
  let saved;
  try {
    saved = JSON.parse(jar.get("ci_pkce")?.value || "null");
  } catch {}
  jar.delete("ci_pkce");
  if (
    !saved ||
    saved.userId !== user.userId ||
    saved.state !== url.searchParams.get("state") ||
    !url.searchParams.get("code")
  )
    return Response.redirect(url.origin + "/?connection=denied");
  try {
    const r = await fetch("https://lichess.org/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: url.searchParams.get("code")!,
        client_id: saved.origin,
        redirect_uri: saved.origin + "/api/lichess/callback",
        code_verifier: saved.verifier,
      }),
    });
    const b = (await r.json()) as any;
    if (!r.ok || !b.access_token) throw new Error();
    jar.set("ci_lichess", b.access_token, {
      ...cookieOptions,
      maxAge: 30 * 86400,
    });
    jar.set("ci_lichess_owner", user.userId, {
      ...cookieOptions,
      maxAge: 30 * 86400,
    });
    return Response.redirect(url.origin + "/?connection=lichess");
  } catch {
    return Response.redirect(url.origin + "/?connection=error");
  }
}
