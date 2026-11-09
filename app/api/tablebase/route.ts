import { Chess } from "chess.js";
export async function GET(req: Request) {
  const fen = new URL(req.url).searchParams.get("fen") || "";
  try {
    const g = new Chess(fen);
    if (g.board().flat().filter(Boolean).length > 7)
      return Response.json(
        { error: "Tablebases support up to seven pieces." },
        { status: 400 },
      );
    const r = await fetch(
      "https://tablebase.lichess.ovh/standard?fen=" + encodeURIComponent(fen),
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw new Error(`Tablebase returned ${r.status}.`);
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
