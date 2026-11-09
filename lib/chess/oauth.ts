import { cookies } from "next/headers";
import { getChatGPTUser } from "../../app/chatgpt-auth";
export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};
export function base64url(b: Uint8Array) {
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export async function lichessFetch(path: string) {
  const jar = await cookies();
  const token = jar.get("ci_lichess")?.value;
  const user = await getChatGPTUser();
  if (!token || !user || jar.get("ci_lichess_owner")?.value !== user.userId)
    throw new Error("Lichess is not connected for this academy account.");
  const r = await fetch("https://lichess.org" + path, {
    headers: {
      Accept: path.startsWith("/api/games/")
        ? "application/x-ndjson"
        : "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok)
    throw new Error(
      r.status === 401
        ? "Lichess authorization expired. Reconnect your account."
        : r.status === 429
          ? "Lichess rate limit reached. Wait one minute."
          : `Lichess returned ${r.status}.`,
    );
  return r;
}
