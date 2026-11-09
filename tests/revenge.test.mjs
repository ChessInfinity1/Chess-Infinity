import assert from "node:assert/strict";
import { test } from "node:test";
import { Chess } from "chess.js";
import {
  emptyRevenge,
  gameSide,
  replayCompletedGame,
  positionsFromReport,
  positionFromRow,
  mergeRevenge,
  recordRevenge,
  reviewGameForRevenge,
  evaluationLoss,
  legalVariation,
} from "../lib/chess/revenge.ts";
import { puzzles, originalPuzzles } from "../lib/chess/content.ts";
import {
  filterPuzzles,
  puzzleTags,
  libraryPuzzles,
} from "../lib/chess/puzzle-library.ts";
import {
  parseOfflinePractice,
  mergeOfflinePractice,
} from "../lib/chess/offline-progress.ts";
import { initialProgress } from "../lib/chess/content.ts";
import { readFile } from "node:fs/promises";
const pgn =
  '[White "Learner"]\n[Black "Opponent"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
const game = {
  id: "local-test",
  pgn,
  white: "Learner",
  black: "Opponent",
  result: "0-1",
  source: "Local practice",
  date: "2026-11-07T12:00:00Z",
  whiteRating: null,
  blackRating: null,
};
const history = replayCompletedGame(game);
const row = {
  ply: 3,
  san: "g4",
  fen: history[2].before,
  loss: 8,
  label: "Blunder",
  bestUci: "g2g3",
  pv: ["g2g3", "d7d5", "f1g2"],
  theme: "Calculation",
  depth: 14,
};
const position = positionFromRow(game, row, "w");
test("revenge records only the selected player, at a legally matching point in a completed PGN", () => {
  assert.ok(position);
  assert.equal(position.played, "g4");
  assert.equal(position.color, "w");
  assert.equal(positionFromRow(game, row, "b"), null);
  assert.equal(
    positionFromRow(game, { ...row, fen: new Chess().fen() }, "w"),
    null,
  );
  assert.equal(positionFromRow(game, { ...row, bestUci: "a1a8" }, "w"), null);
  assert.equal(positionFromRow(game, { ...row, loss: 0.2 }, "w"), null);
  assert.equal(positionFromRow(game, { ...row, san: "e4" }, "w"), null);
  assert.throws(() => replayCompletedGame({ ...game, result: "*" }));
  assert.throws(() => replayCompletedGame({ ...game, result: "1-0" }));
  assert.equal(
    gameSide(game, { chesscom: { profile: { username: "LEARNER" } } }),
    "w",
  );
  assert.equal(
    gameSide(game, { lichess: { profile: { username: "Opponent" } } }),
    "b",
  );
  assert.equal(gameSide(game, {}), null);
  assert.equal(
    gameSide(game, {
      a: { profile: { username: "Learner" } },
      b: { profile: { username: "Opponent" } },
    }),
    null,
  );
});
test("saved reports must match the game; variations stop at illegal moves", () => {
  assert.equal(positionsFromReport(game, { pgn, rows: [row] }, "w").length, 1);
  assert.equal(
    positionsFromReport(game, { pgn: "1. e4 e5 *", rows: [row] }, "w").length,
    0,
  );
  assert.deepEqual(legalVariation(row.fen, ["g2g3", "e9e8", "d7d5"]), ["g2g3"]);
  assert.deepEqual(legalVariation(row.fen, ["a1a8"]), []);
});
test("re-analysis updates a stored position without erasing its recall history", () => {
  const first = mergeRevenge(emptyRevenge, [position]);
  const recalled = recordRevenge(
    first,
    position.id,
    true,
    new Date("2026-11-07T12:00:00Z"),
  ).progress;
  const merged = mergeRevenge(recalled, [{ ...position, depth: 20 }]);
  assert.equal(merged.positions.length, 1);
  assert.equal(merged.positions[0].depth, 20);
  assert.equal(merged.records[position.id].attempts, 1);
});
test("clean recall needs separate practice days; duplicate same-day solves award no extra XP", () => {
  let p = mergeRevenge(emptyRevenge, [position]);
  let r = recordRevenge(p, position.id, true, new Date("2026-11-07T12:00:00Z"));
  assert.equal(r.xp, 15);
  assert.equal(r.progress.records[position.id].cleanDays.length, 1);
  assert.equal(
    r.progress.records[position.id].dueAt,
    "2026-11-08T12:00:00.000Z",
  );
  r = recordRevenge(
    r.progress,
    position.id,
    true,
    new Date("2026-11-07T13:00:00Z"),
  );
  assert.equal(r.xp, 0);
  assert.equal(r.progress.records[position.id].cleanDays.length, 1);
  r = recordRevenge(
    r.progress,
    position.id,
    true,
    new Date("2026-11-08T12:00:00Z"),
  );
  assert.equal(r.xp, 15);
  assert.equal(r.progress.records[position.id].cleanDays.length, 2);
  assert.equal(
    r.progress.records[position.id].dueAt,
    "2026-11-11T12:00:00.000Z",
  );
  r = recordRevenge(
    r.progress,
    position.id,
    false,
    new Date("2026-11-08T13:00:00Z"),
  );
  assert.equal(r.xp, 0);
  assert.equal(r.progress.records[position.id].cleanDays.length, 0);
  assert.equal(
    r.progress.records[position.id].dueAt,
    "2026-11-08T13:00:00.000Z",
  );
  assert.equal(recordRevenge(r.progress, "unknown", true).xp, 0);
});
test("review computes perspective-correct losses and finds an actual recorded mistake", async () => {
  const evaluation = (score, best, mate = null) => ({
    score,
    best,
    mate,
    depth: 14,
    pv: [best],
  });
  const map = new Map([
    [history[0].before, evaluation(0, "e2e4")],
    [history[0].after, evaluation(-0.2, "e7e5")],
    [history[2].before, evaluation(-0.5, "g2g3")],
    [history[2].after, evaluation(-100, "d8h4", -1)],
  ]);
  const progress = [];
  const result = await reviewGameForRevenge(
    game,
    "w",
    async (fen) => {
      new Chess(fen);
      assert.ok(map.has(fen));
      return map.get(fen);
    },
    (done, total) => progress.push([done, total]),
    () => false,
  );
  assert.equal(result.positions.length, 1);
  assert.equal(result.positions[0].played, "g4");
  assert.equal(result.positions[0].loss, 9.5);
  assert.equal(result.positions[0].bestUci, "g2g3");
  assert.deepEqual(progress, [
    [1, 2],
    [2, 2],
  ]);
  assert.equal(evaluationLoss(evaluation(-1, ""), evaluation(2, ""), "b"), 3);
  assert.equal(evaluationLoss(evaluation(1, ""), evaluation(-2, ""), "w"), 3);
});
test("cancelled analysis stops before generating practice from incomplete evaluations", async () => {
  let stop = false;
  let calls = 0;
  const result = await reviewGameForRevenge(
    game,
    "w",
    async () => {
      calls++;
      stop = true;
      return { best: "e2e4", score: 0, mate: null, depth: 12, pv: ["e2e4"] };
    },
    () => {},
    () => stop,
  );
  assert.equal(calls, 1);
  assert.equal(result.cancelled, true);
  assert.equal(result.positions.length, 0);
});
test("the 2400 licensed positions advance the published setup move before training", async () => {
  const raw = JSON.parse(
    await readFile(
      new URL("../data/lichess-subset-raw.json", import.meta.url),
      "utf8",
    ),
  );
  const byId = new Map(raw.map((p) => ["lichess-" + p.PuzzleId, p]));
  assert.equal(libraryPuzzles.length, 2400);
  assert.equal(puzzles.length, 2506);
  assert.equal(originalPuzzles.length, 10);
  assert.equal(new Set(libraryPuzzles.map((p) => p.fen)).size, 2400);
  const bands = [0, 0, 0, 0];
  for (const p of libraryPuzzles) {
    const source = byId.get(p.id);
    assert.ok(source);
    const g = new Chess(source.FEN);
    const [u, ...line] = source.Moves.split(" ");
    g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    assert.equal(p.fen, g.fen(), p.id);
    assert.deepEqual(p.line, line);
    assert.equal(p.source.license, "CC0-1.0");
    assert.match(
      p.source.url,
      /^https:\/\/lichess\.org\/training\/[A-Za-z0-9]+$/,
    );
    for (const m of line)
      g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    if (p.themes.includes("mate")) assert.ok(g.isCheckmate(), p.id);
    bands[
      p.rating < 1000 ? 0 : p.rating < 1400 ? 1 : p.rating < 1800 ? 2 : 3
    ]++;
  }
  assert.deepEqual(bands, [600, 600, 600, 600]);
});
test("puzzle search combines all source tags, rating bands, and exact source IDs", () => {
  assert.equal(
    filterPuzzles(puzzles, "", "All patterns", "beginner").filter(
      (p) => p.source,
    ).length,
    600,
  );
  assert.equal(
    filterPuzzles(puzzles, libraryPuzzles[0].id, "All patterns", "all").length,
    1,
  );
  const forks = filterPuzzles(puzzles, "", "Forks", "all");
  assert.ok(forks.length > 20);
  assert.ok(forks.every((p) => puzzleTags(p).includes("Forks")));
  assert.equal(
    filterPuzzles(puzzles, "impossible-query-zzzz", "All patterns", "all")
      .length,
    0,
  );
  assert.ok(
    filterPuzzles(puzzles, "", "All patterns", "advanced").every(
      (p) => p.rating >= 1800,
    ),
  );
});
test("offline results preserve full source puzzle IDs when imported", () => {
  const id = libraryPuzzles[0].id;
  const pack = parseOfflinePractice({
    puzzles: [{ id, correct: true, at: "2026-11-07T12:00:00Z" }],
  });
  assert.equal(pack.puzzles[0].id, id);
  const once = mergeOfflinePractice(structuredClone(initialProgress), pack);
  assert.equal(once.puzzles[0].id, id);
  assert.equal(once.xp, 20);
  assert.deepEqual(mergeOfflinePractice(once, pack), once);
});
