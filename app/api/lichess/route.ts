import { cookies } from "next/headers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { lichessFetch } from "../../../lib/chess/oauth";
export async function GET(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response(null, { status: 401 });
  try {
    const profile = (await (await lichessFetch("/api/account")).json()) as any;
    const response = await lichessFetch(
      `/api/games/user/${encodeURIComponent(profile.id)}?max=40&ongoing=false&clocks=false&evals=false&pgnInJson=true`,
    );
    const body = await response.text();
    let games;
    try {
      games = body
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((s) => JSON.parse(s));
    } catch {
      throw new Error(
        "Lichess returned an unreadable game export. Please sync again later.",
      );
    }
    return Response.json({
      profile,
      games,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
export async function DELETE(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response(null, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return new Response(null, { status: 403 });
  try {
    const jar = await cookies();
    const token =
      jar.get("ci_lichess_owner")?.value === user.userId
        ? jar.get("ci_lichess")?.value
        : undefined;
    if (token) {
      const r = await fetch("https://lichess.org/api/token", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok && r.status !== 401)
        return Response.json(
          {
            error:
              "Could not revoke Lichess access. Try again or revoke it on Lichess.",
          },
          { status: 502 },
        );
    }
    jar.delete("ci_lichess");
    jar.delete("ci_lichess_owner");
    return Response.json({ disconnected: true });
  } catch {
    return Response.json(
      { error: "Could not disconnect. Try again." },
      { status: 502 },
    );
  }
}
