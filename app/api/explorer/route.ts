import { Chess } from "chess.js";
import { cookies } from "next/headers";
import { getChatGPTUser } from "../../chatgpt-auth";
export async function GET(req: Request) {
  try {
    const fen = new URL(req.url).searchParams.get("fen") || "";
    new Chess(fen);
    const jar = await cookies();
    const user = await getChatGPTUser();
    const token =
      user && jar.get("ci_lichess_owner")?.value === user.userId
        ? jar.get("ci_lichess")?.value
        : undefined;
    const url = new URL("https://explorer.lichess.org/lichess");
    url.search = new URLSearchParams({
      variant: "standard",
      fen,
      speeds: "rapid,classical",
      ratings: "1600,1800,2000,2200,2500",
      topGames: "0",
      recentGames: "0",
      moves: "8",
    }).toString();
    const r = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw new Error(
        r.status === 401
          ? "Connect Lichess to authorize opening-explorer access."
          : r.status === 429
            ? "The explorer is rate-limited. Wait one minute before trying again."
            : `The opening explorer returned ${r.status}. Please try later.`,
      );
    const lines = (await r.text()).trim().split("\n").filter(Boolean);
    const b = JSON.parse(lines[lines.length - 1]);
    return Response.json(
      {
        white: b.white,
        draws: b.draws,
        black: b.black,
        moves: b.moves,
        opening: b.opening,
      },
      { headers: { "Cache-Control": "private,max-age=300" } },
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
