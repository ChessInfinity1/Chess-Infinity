import { cookies } from "next/headers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { base64url, cookieOptions } from "../../../../lib/chess/oauth";
export async function GET(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const origin = new URL(req.url).origin;
  const jar = await cookies();
  jar.set(
    "ci_pkce",
    JSON.stringify({ verifier, state, origin, userId: user.userId }),
    {
      ...cookieOptions,
      maxAge: 600,
    },
  );
  const url = new URL("https://lichess.org/oauth");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: origin,
    redirect_uri: origin + "/api/lichess/callback",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    scope: "",
  }).toString();
  return Response.redirect(url);
}
