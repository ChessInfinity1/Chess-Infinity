import { Chess } from "chess.js";
export function replayPosition(
  startFen: string,
  moves: string[],
  ply: number,
  headers: Record<string, string> = {},
) {
  const g = new Chess(startFen);
  for (const san of moves.slice(0, Math.max(0, Math.min(ply, moves.length))))
    g.move(san);
  for (const [key, value] of Object.entries(headers))
    if (!["FEN", "SetUp", "Result"].includes(key)) g.setHeader(key, value);
  g.setHeader("Result", "*");
  return g;
}
