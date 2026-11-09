import { Chess, type Color } from "chess.js";
import { classification, type Evaluation } from "./engine.ts";
export type GuidedMove = {
  ply: number;
  fen: string;
  uci: string;
  san: string;
  at: string;
  loss: number;
  label: string;
  best: string;
  line: string;
  depth: number;
  explanation: string;
};
export type GuidedSession = {
  id: string;
  startedAt: string;
  updatedAt: string;
  player: Color;
  opponentSkill?: number;
  pgn: string;
  result: string;
  completed: boolean;
  moves: GuidedMove[];
};
export function legalSanLine(fen: string, pv: string[], limit = 6) {
  const g = new Chess(fen);
  const line: string[] = [];
  for (const u of pv.slice(0, limit)) {
    try {
      line.push(
        g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san,
      );
    } catch {
      break;
    }
  }
  return line.join(" ");
}
export function guidedFeedback(
  fen: string,
  uci: string,
  before: Evaluation,
  after: Evaluation,
  ruleDraw = false,
): Omit<GuidedMove, "at" | "ply"> {
  const g = new Chess(fen);
  const side = g.turn();
  const move = g.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  });
  if (
    !before.best ||
    !legalSanLine(fen, [before.best]) ||
    (before.depth < 1 && !g.isGameOver())
  )
    throw new Error(
      "The engine did not return a usable comparison. Retry this position.",
    );
  if (
    !g.isGameOver() &&
    !ruleDraw &&
    (after.depth < 1 || !Number.isFinite(after.score))
  )
    throw new Error(
      "The engine did not finish the position comparison. Please retry.",
    );
  const cap = (n: number) => Math.max(-10, Math.min(10, n));
  const loss =
    uci === before.best
      ? 0
      : Math.max(
          0,
          (cap(before.score) - cap(after.score)) * (side === "w" ? 1 : -1),
        );
  const best = legalSanLine(fen, [before.best]);
  const captures = g
    .moves({ verbose: true })
    .filter((m) => m.captured && m.color !== side)
    .slice(0, 4)
    .map((m) => m.san);
  const fact = g.isCheckmate()
    ? `${move.san} delivers checkmate.`
    : g.isStalemate()
      ? "This move produces stalemate, a draw."
      : g.isDraw() || ruleDraw
        ? "The position is drawn by a board rule."
        : g.inCheck()
          ? `${move.san} gives check. The opponent must answer it.`
          : move.captured
            ? `${move.san} captures a ${pieceName(move.captured)}.`
            : `${move.san} is legal. Look at the opponent’s forcing replies before planning your next move.`;
  const warning = captures.length
    ? ` The opponent has legal captures including ${captures.join(", ")}. A capture is not automatically good; inspect the continuation.`
    : "";
  const comparison =
    uci === before.best
      ? "Your move matches the engine’s first choice in this search."
      : loss < 0.5
        ? `The search estimates less than half a pawn of loss. Its first choice was ${best}.`
        : `The estimated loss is ${loss.toFixed(1)} pawns. Compare your move with ${best} and identify the first threat in that line.`;
  return {
    fen,
    uci,
    san: move.san,
    loss,
    label: classification(loss, uci === before.best),
    best,
    line: legalSanLine(fen, before.pv),
    depth: Math.min(before.depth, after.depth || before.depth),
    explanation: `${fact}${warning} ${comparison}`,
  };
}
function pieceName(type: string) {
  return (
    (
      {
        p: "pawn",
        n: "knight",
        b: "bishop",
        r: "rook",
        q: "queen",
        k: "king",
      } as Record<string, string>
    )[type] || "piece"
  );
}
export function mergeGuidedSession(
  history: GuidedSession[],
  session: GuidedSession,
) {
  const g = new Chess();
  g.loadPgn(session.pgn);
  const hist = g.history({ verbose: true });
  const moves = session.moves.filter((r) => {
    const m = hist[r.ply - 1];
    return (
      m &&
      m.color === session.player &&
      m.before === r.fen &&
      m.san === r.san &&
      m.from + m.to + (m.promotion || "") === r.uci &&
      Number.isFinite(r.loss) &&
      r.loss >= 0 &&
      Number.isFinite(Date.parse(r.at))
    );
  });
  return [
    {
      ...session,
      moves: [...new Map(moves.map((m) => [m.ply, m])).values()].slice(-60),
    },
    ...history.filter((s) => s.id !== session.id),
  ].slice(0, 24);
}
export function summarizeReview(pgn: string, rows: any[]) {
  try {
    const g = new Chess();
    g.loadPgn(pgn);
    const hist = g.history({ verbose: true });
    if (rows.length !== hist.length || !hist.length) return null;
    const sides = {
      w: { moves: 0, loss: 0, blunders: 0, mistakes: 0, missedMates: 0 },
      b: { moves: 0, loss: 0, blunders: 0, mistakes: 0, missedMates: 0 },
    };
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i],
        m = hist[i];
      if (
        r.reliable === false ||
        r.ply !== i + 1 ||
        r.fen !== m.before ||
        r.san !== m.san ||
        !Number.isFinite(r.loss) ||
        r.loss < 0
      )
        return null;
      const s = sides[m.color];
      s.moves++;
      s.loss += r.loss;
      if (r.loss >= 2) s.blunders++;
      else if (r.loss >= 1) s.mistakes++;
      if (r.theme === "Missed checkmates" && r.loss >= 0.5) s.missedMates++;
    }
    return { version: 1 as const, plies: hist.length, sides };
  } catch {
    return null;
  }
}
