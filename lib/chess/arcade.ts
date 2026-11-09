import { Chess, type Square } from "chess.js";
import { puzzles, originalPuzzles, type Exercise } from "./content.ts";
export type ArcadeMode = "sprint" | "survival" | "vision";
export type ArcadeResult = {
  id: string;
  mode: ArcadeMode;
  score: number;
  solved: number;
  errors: number;
  hints: number;
  startedAt: string;
  finishedAt: string;
  seconds: number;
  misses: Exercise[];
};
export type ArcadeProgress = {
  bests: Record<ArcadeMode, number>;
  history: ArcadeResult[];
};
export const emptyArcade: ArcadeProgress = {
  bests: { sprint: 0, survival: 0, vision: 0 },
  history: [],
};
export function transformExercise(
  exercise: Exercise,
  mirror = false,
  swap = false,
): Exercise {
  const parts = exercise.fen.split(" ");
  if (parts[2] !== "-") return { ...exercise };
  const square = (s: string) =>
    String.fromCharCode(
      mirror ? 104 - (s.charCodeAt(0) - 97) : s.charCodeAt(0),
    ) + (swap ? 9 - +s[1] : s[1]);
  const source = new Chess(exercise.fen),
    target = new Chess();
  target.clear();
  for (const row of source.board())
    for (const p of row)
      if (p)
        target.put(
          {
            type: p.type,
            color: swap ? (p.color === "w" ? "b" : "w") : p.color,
          },
          square(p.square) as Square,
        );
  const fen = [
    target.fen().split(" ")[0],
    swap ? (parts[1] === "w" ? "b" : "w") : parts[1],
    "-",
    parts[3] === "-" ? "-" : square(parts[3]),
    parts[4],
    parts[5],
  ].join(" ");
  return {
    ...exercise,
    id: `${exercise.id}-${+mirror}${+swap}`,
    fen,
    line: exercise.line.map(
      (u) => square(u.slice(0, 2)) + square(u.slice(2, 4)) + u.slice(4),
    ),
    hint:
      mirror || swap
        ? "Look for the same pattern in this transformed position. Checks, captures, and threats come first."
        : exercise.hint,
    explanation:
      mirror || swap
        ? "The same tactical pattern works from a different part of the board. Review which pieces created the threat."
        : exercise.explanation,
  };
}
export function createArcadeDeck() {
  return [
    ...originalPuzzles.flatMap((p) => [
      transformExercise(p),
      transformExercise(p, true),
      transformExercise(p, false, true),
      transformExercise(p, true, true),
    ]),
    ...puzzles.filter((p) => !!p.source || p.id.startsWith("infinity-")),
  ];
}
export function checkExerciseMove(
  exercise: Exercise,
  fen: string,
  step: number,
  from: string,
  to: string,
  promotion = "q",
) {
  const expected = exercise.line[step];
  if (!expected) return { ok: false, legal: false, fen, step, done: false };
  try {
    const g = new Chess(fen);
    const m = g.move({ from, to, promotion });
    const u = m.from + m.to + (m.promotion || "");
    const expectedGame = new Chess(fen);
    expectedGame.move({
      from: expected.slice(0, 2),
      to: expected.slice(2, 4),
      promotion: expected[4],
    });
    const done = step === exercise.line.length - 1;
    const ok =
      u === expected || (done && expectedGame.isCheckmate() && g.isCheckmate());
    return {
      ok,
      legal: true,
      fen: ok ? g.fen() : fen,
      step: ok ? step + 1 : step,
      done: ok && done,
    };
  } catch {
    return { ok: false, legal: false, fen, step, done: false };
  }
}
export function nextVisionSquare(previous: string, random = Math.random) {
  const files = "abcdefgh";
  let i = Math.min(63, Math.max(0, Math.floor(random() * 64)));
  const square = () => files[i % 8] + (Math.floor(i / 8) + 1);
  if (square() === previous) i = (i + 1) % 64;
  return square();
}
export function dailyPuzzle(day: string) {
  let n = 0;
  for (const c of day) n = (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0;
  return puzzles[n % puzzles.length];
}
export function saveArcadeResult(
  previous: ArcadeProgress | undefined,
  result: ArcadeResult,
): ArcadeProgress {
  const p = previous || emptyArcade;
  if (p.history.some((r) => r.id === result.id)) return p;
  return {
    bests: {
      ...p.bests,
      [result.mode]: Math.max(p.bests[result.mode] || 0, result.score),
    },
    history: [result, ...p.history].slice(0, 30),
  };
}
export function arcadeXp(
  previous: ArcadeProgress | undefined,
  result: ArcadeResult,
  day: string,
) {
  const history = previous?.history || [];
  if (history.some((r) => r.id === result.id)) return 0;
  const earned = history
    .filter((r) => new Date(r.finishedAt).toLocaleDateString("en-CA") === day)
    .reduce((s, r) => s + Math.min(50, r.score * 5), 0);
  return Math.max(0, Math.min(50, result.score * 5, 150 - earned));
}
