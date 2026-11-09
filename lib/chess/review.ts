import { Chess, type Color } from "chess.js";
import { classification, EngineResultError, type Evaluation, type SearchOptions } from "./engine.ts";

export type ReviewRow = {
  ply: number; moveNumber: number; color: Color; san: string;
  fen: string; afterFen: string; best: string; bestUci: string;
  pv: string[]; playedPv: string[]; depth: number; score: number;
  before: Evaluation; played: Evaluation; loss: number; label: string;
  reliable: boolean; mateChange: "missed" | "allowed" | "preserved" | null;
  theme: string; explanation: string;
};
export type ReviewSearch = (fen: string, ms: number, options: SearchOptions) => Promise<Evaluation>;
export const REVIEW_MIN_DEPTH = 12;
const cap = (n: number) => Math.max(-10, Math.min(10, n));
const winner = (e: Pick<Evaluation,"score" | "mate">) => e.mate === null ? 0 : Math.sign(e.mate || e.score);

export function numberedLine(fen: string, pv: string[], limit = 8) {
  const g = new Chess(fen), out: string[] = [];
  for (const u of pv.slice(0, limit)) {
    try {
      const turn = g.turn(), number = g.fen().split(" ")[5];
      const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      out.push((turn === "w" ? `${number}. ` : out.length === 0 ? `${number}… ` : "") + m.san);
    } catch { break; }
  }
  return out.join(" ");
}
export function evaluationText(e: Pick<Evaluation, "score" | "mate">) {
  if (e.mate !== null) return `${winner(e) > 0 ? "White" : "Black"} ${e.mate === 0 ? "checkmates" : `can force mate in ${Math.abs(e.mate)}`}`;
  if (Math.abs(e.score) < 0.15) return "Approximately equal";
  return `${e.score > 0 ? "White" : "Black"} is better (${e.score > 0 ? "+" : ""}${e.score.toFixed(2)})`;
}
export function afterMoveEvaluation(e: Evaluation, color: Color): Evaluation {
  if (e.mate === null || e.mate === 0) return e;
  const direction = winner(e);
  return { ...e, mate: direction * Math.max(0, Math.abs(e.mate) - (direction === (color === "w" ? 1 : -1) ? 1 : 0)) };
}
export function compareEvaluations(before: Evaluation, played: Evaluation, color: Color) {
  const sign = color === "w" ? 1 : -1;
  const a = winner(before), b = winner(played);
  const mateChange = a && a === b ? "preserved" : b === -sign ? "allowed" : a === sign && b !== sign ? "missed" : null;
  // A longer mating line is still a forced win. Never subtract mate distances or ±100 sentinels.
  const loss = a && a === b ? 0 : Math.max(0, (cap(before.score) - cap(played.score)) * sign);
  const unstable = !a && !b && (played.score - before.score) * sign > 0.35;
  return { loss, mateChange, unstable } as const;
}
function usable(fen: string, e: Evaluation, expected?: string) {
  if (!Number.isFinite(e.score) || !Number.isInteger(e.depth) || e.depth < 1 || !e.pv.length || e.pv[0] !== e.best || (expected && e.best !== expected))
    throw new Error("Stockfish returned an incomplete comparison. Retry with more thinking time.");
  const board = new Chess(fen);
  // A line is only shown if every returned move can actually be played.
  for (const u of e.pv) board.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
}
export function makeReviewRow(fen: string, san: string, ply: number, before: Evaluation, played: Evaluation, terminal = false): ReviewRow {
  usable(fen, before);
  const g = new Chess(fen), color = g.turn();
  const moveNumber = +fen.split(" ")[5], m = g.move(san);
  const actual = m.from + m.to + (m.promotion || "");
  if (!terminal) usable(fen, played, actual);
  const c = compareEvaluations(before, played, color);
  const depth = terminal ? before.depth : Math.min(before.depth, played.depth);
  const reliable = !c.unstable && (depth >= REVIEW_MIN_DEPTH || (before.mate !== null && played.mate !== null) || g.isCheckmate());
  const isBest = actual === before.best || g.isCheckmate();
  const loss = isBest ? 0 : c.loss;
  const best = new Chess(fen).move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] }).san;
  const mateChange = c.mateChange;
  const reply = new Chess(m.after);
  let capture = "";
  try {
    const u = played.pv[1];
    if (u) { const r = reply.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); if (r.captured) capture = r.san; }
  } catch { /* Never infer a tactical fact from an invalid continuation. */ }
  const theme = mateChange === "missed" ? "Missed checkmates" : mateChange === "allowed" ? "King safety" : capture && loss >= 0.5 ? "Piece safety" : g.board().flat().filter(Boolean).length <= 10 ? "Endgame decisions" : ply <= 20 ? "Opening decisions" : "Calculation";
  const explanation = !reliable
    ? "This comparison is too shallow or inconsistent to grade confidently. Try a longer search; it is excluded from the review score and practice recommendations."
    : g.isCheckmate() ? `${san} delivers checkmate. The game is over.`
    : g.isStalemate() ? `${san} leaves the opponent with no legal move and no check: stalemate. The result is a draw.`
    : terminal && played.mate === null ? `${san} reaches a draw by a board rule. The engine comparison uses the game’s move history.`
    : isBest ? `${san} matches Stockfish’s first choice in this search. Other moves may also be good.`
    : mateChange === "preserved" ? "The same side still has a forced mate. A longer mating route is not treated as a blunder."
    : mateChange === "allowed" ? `After ${san}, the engine finds a forced mate for the opponent. Compare ${best} and check the opponent’s forcing replies.`
    : mateChange === "missed" ? `Before ${san}, the engine found a forced mate starting with ${best}. This search no longer finds that forced mate after your move; you may still have an advantage.`
    : loss < 0.5 ? `${san} is close to the engine’s preferred move, ${best}. This search finds no major drop in the position.`
    : `The engine estimates ${loss.toFixed(2)} pawns of evaluation lost compared with ${best}.${capture ? ` Its continuation after your move begins with the capture ${capture}; a capture alone does not prove material is lost.` : ""} Play through both lines to compare the opponent’s replies.`;
  return { ply, moveNumber, color, san, fen, afterFen: m.after, best, bestUci: before.best, pv: before.pv, playedPv: played.pv, depth, score: played.score, before, played, loss, label: reliable ? classification(loss, isBest) : "Uncertain", reliable, mateChange, theme, explanation };
}
export async function analyzeGame(pgn: string, search: ReviewSearch, options: {
  ms: number; cancelled: () => boolean; onRow: (rows: ReviewRow[]) => void;
}) {
  const g = new Chess(); g.loadPgn(pgn, { strict: false });
  const history = g.history({ verbose: true });
  if (!history.length) throw new Error("Load a game with moves before reviewing it.");
  const replay = new Chess(history[0].before), startFen = replay.fen();
  const ucis: string[] = [], rows: ReviewRow[] = [];
  for (let i = 0; i < history.length; i++) {
    if (options.cancelled()) break;
    const m = history[i], actual = m.from + m.to + (m.promotion || "");
    const context = { startFen, moves: [...ucis] };
    const next = new Chess(); next.loadPgn(replay.pgn()); next.move(m.san);
    // Pass full history for repetition; terminal positions need no synthetic engine score.
    const terminal = next.isCheckmate() || next.isStalemate() || next.isInsufficientMaterial() || (i === history.length - 1 && next.isDraw());
    if (replay.isCheckmate() || replay.isStalemate() || replay.isInsufficientMaterial()) throw new Error(`The PGN continues after a drawn or checkmated position at move ${m.san}. Check the game record.`);
    async function pair(ms: number) {
      const before = await search(m.before, ms, context);
      if (options.cancelled()) return null;
      usable(m.before, before);
      const terminalScore: Evaluation = { best: actual, score: next.isCheckmate() ? (m.color === "w" ? 100 : -100) : 0, mate: next.isCheckmate() ? 0 : null, depth: before.depth, pv: [actual] };
      const played = terminal ? terminalScore : actual === before.best ? before : await search(m.before, ms, { ...context, searchMoves: [actual] });
      if (options.cancelled()) return null;
      return { before, played };
    }
    let budget = options.ms;
    let comparison: Awaited<ReturnType<typeof pair>>;
    try { comparison = await pair(budget); }
    catch (e) {
      if (options.cancelled()) break;
      if (!(e instanceof EngineResultError)) throw e;
      // Some interrupted iterative searches finish without a matching exact score.
      // Retry the entire comparison once, so both candidates retain an equal budget.
      budget = Math.max(1500, budget * 2);
      comparison = await pair(budget);
    }
    if (!comparison) break;
    let { before, played } = comparison;
    const initial = makeReviewRow(m.before, m.san, i + 1, before, played, terminal);
    if (!initial.reliable || initial.loss >= 1 || (initial.mateChange && initial.mateChange !== "preserved")) {
      const verified = await pair(Math.max(1500, budget * 2));
      if (!verified) break;
      before = verified.before; played = verified.played;
    }
    rows.push(makeReviewRow(m.before, m.san, i + 1, before, played, terminal));
    options.onRow([...rows]);
    replay.move(m.san); ucis.push(actual);
  }
  return rows;
}
