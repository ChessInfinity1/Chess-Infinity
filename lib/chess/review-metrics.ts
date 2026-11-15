import type { Color } from "chess.js";
import type { Evaluation } from "./engine.ts";

// Lichess's published evaluation-to-win% model, with our own review aggregation.
// https://lichess.org/page/accuracy — this is not a prediction for a particular player.
export function winningChances(e: Pick<Evaluation, "score" | "mate">, color: Color) {
  if (!Number.isFinite(e.score) || (e.mate !== null && !Number.isFinite(e.mate))) return NaN;
  const score = e.mate === null ? Math.max(-10, Math.min(10, e.score)) : Math.sign(e.mate || e.score) * 10;
  return 100 / (1 + Math.exp(-0.368208 * score * (color === "w" ? 1 : -1)));
}
export function chanceLoss(before: Pick<Evaluation, "score" | "mate">, played: Pick<Evaluation, "score" | "mate">, color: Color) {
  // Keeping a forced mate for the same side must never incur a penalty for distance.
  const winner = (e: Pick<Evaluation, "score" | "mate">) => e.mate === null ? 0 : Math.sign(e.mate || e.score);
  if (winner(before) && winner(before) === winner(played)) return 0;
  return Math.max(0, winningChances(before, color) - winningChances(played, color));
}
export function reviewGrade(impact: number, best = false) {
  if (!Number.isFinite(impact) || impact < 0) return "Uncertain";
  if (best) return "Best";
  return impact < 1 ? "Excellent" : impact < 5 ? "Good" : impact < 10 ? "Inaccuracy" : impact < 15 ? "Mistake" : "Blunder";
}
export function reviewAccuracy(rows: { reliable: boolean; chanceLoss?: number }[]) {
  const graded = rows.filter(row => row.reliable && Number.isFinite(row.chanceLoss));
  if (!graded.length) return null;
  return Math.round(graded.reduce((sum, row) => sum + Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * row.chanceLoss!) - 3.1669)), 0) / graded.length);
}
