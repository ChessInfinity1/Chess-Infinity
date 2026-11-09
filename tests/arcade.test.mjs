import assert from "node:assert/strict";
import { test } from "node:test";
import { Chess } from "chess.js";
import {
  createArcadeDeck,
  transformExercise,
  checkExerciseMove,
  saveArcadeResult,
  arcadeXp,
  nextVisionSquare,
  dailyPuzzle,
  emptyArcade,
} from "../lib/chess/arcade.ts";
import { initialProgress, lessons, puzzles } from "../lib/chess/content.ts";
import {
  parseOfflinePractice,
  mergeOfflinePractice,
} from "../lib/chess/offline-progress.ts";
import { browserPlatform, isEmbeddedBrowser } from "../lib/pwa.ts";
const result = (id, score = 10, mode = "sprint") => ({
  id,
  score,
  mode,
  solved: score,
  errors: 0,
  hints: 0,
  seconds: 180,
  startedAt: "2026-11-07T09:00:00Z",
  finishedAt: "2026-11-07T09:03:00Z",
  misses: [],
});
test("all arcade positions have legal solutions and preserve mating patterns", () => {
  const deck = createArcadeDeck();
  assert.equal(deck.length, puzzles.length + 30);
  assert.equal(new Set(deck.map((e) => e.id)).size, deck.length);
  for (const e of deck) {
    let fen = e.fen;
    for (let i = 0; i < e.line.length; i++) {
      const u = e.line[i];
      const answer = checkExerciseMove(
        e,
        fen,
        i,
        u.slice(0, 2),
        u.slice(2, 4),
        u[4],
      );
      assert.equal(answer.ok, true, e.id + " " + u);
      fen = answer.fen;
      assert.equal(answer.done, i === e.line.length - 1);
    }
    if (e.theme === "Mate in 1") assert.ok(new Chess(fen).isCheckmate(), e.id);
  }
});
test("solutions reject illegal moves and legal non-solutions without changing the board", () => {
  const e = createArcadeDeck()[0];
  const g = new Chess(e.fen);
  const bad = g.moves({ verbose: true }).find(
    (m) =>
      m.from + m.to + (m.promotion || "") !== e.line[0] &&
      !(() => {
        const c = new Chess(e.fen);
        c.move(m);
        return c.isCheckmate();
      })(),
  );
  assert.ok(bad);
  const answer = checkExerciseMove(
    e,
    e.fen,
    0,
    bad.from,
    bad.to,
    bad.promotion,
  );
  assert.equal(answer.legal, true);
  assert.equal(answer.ok, false);
  assert.equal(answer.fen, e.fen);
  assert.equal(checkExerciseMove(e, e.fen, 0, "a9", "h9").legal, false);
});
test("color and file transforms preserve en passant and promotion legality", () => {
  const cases = [
    { id: "ep", fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2", line: ["e5d6"] },
    { id: "promo", fen: "7k/1P6/6K1/8/8/8/8/8 w - - 0 1", line: ["b7b8n"] },
  ];
  for (const e of cases)
    for (const mirror of [false, true])
      for (const swap of [false, true]) {
        const t = transformExercise(e, mirror, swap);
        const g = new Chess(t.fen);
        const u = t.line[0];
        const m = g.move({
          from: u.slice(0, 2),
          to: u.slice(2, 4),
          promotion: u[4],
        });
        assert.ok(m);
        assert.equal(
          e.id === "ep" ? m.isEnPassant() : m.promotion === "n",
          true,
        );
      }
});
test("arcade bests are monotonic, results are idempotent, and XP has a daily ceiling", () => {
  let p = saveArcadeResult(emptyArcade, result("a"));
  assert.equal(p.bests.sprint, 10);
  assert.equal(saveArcadeResult(p, result("a")), p);
  assert.equal(arcadeXp(p, result("a"), "2026-11-07"), 0);
  p = saveArcadeResult(p, result("b", 2));
  assert.equal(p.bests.sprint, 10);
  p = saveArcadeResult(saveArcadeResult(p, result("c")), result("d"));
  assert.equal(arcadeXp(p, result("e"), "2026-11-07"), 0);
  assert.equal(arcadeXp(p, result("e"), "2026-11-08"), 50);
});
test("vision targets stay on the board and do not repeat; daily position is stable", () => {
  for (let i = 0; i < 64; i++) {
    const s = nextVisionSquare("", () => i / 64);
    assert.match(s, /^[a-h][1-8]$/);
    assert.notEqual(
      nextVisionSquare(s, () => i / 64),
      s,
    );
  }
  assert.equal(dailyPuzzle("2026-11-07").id, dailyPuzzle("2026-11-07").id);
  assert.ok(puzzles.includes(dailyPuzzle("2026-11-07")));
});
test("offline parser rejects unrecognized content and canonicalizes missed positions", () => {
  const valid = result("offline-a");
  valid.misses = [{ id: createArcadeDeck()[0].id, fen: "malicious-fen" }];
  const p = parseOfflinePractice({
    completed: [lessons[0].id, "fake", lessons[0].id],
    puzzles: [
      { id: "fake", correct: true, at: "invalid" },
      { id: puzzles[0].id, correct: true, at: "2026-11-07T10:00:00Z" },
    ],
    arcade: {
      bests: { vision: 999999 },
      history: [valid, { ...result("fake"), score: -1 }],
    },
  });
  assert.deepEqual(p.completed, [lessons[0].id]);
  assert.equal(p.puzzles.length, 1);
  assert.equal(p.arcade.history.length, 1);
  assert.equal(p.arcade.bests.vision, 0);
  assert.equal(p.arcade.history[0].misses[0].fen, createArcadeDeck()[0].fen);
});
test("offline imports merge once, preserve connected data and avoid duplicate daily XP", () => {
  const main = {
    ...structuredClone(initialProgress),
    xp: 100,
    accounts: { chesscom: { platform: "chesscom", username: "real-user" } },
    games: [{ id: "real-game" }],
  };
  const pack = parseOfflinePractice({
    completed: [lessons[0].id],
    puzzles: [
      { id: puzzles[0].id, correct: true, at: "2026-11-07T10:00:00Z" },
      { id: puzzles[0].id, correct: false, at: "2026-11-07T11:00:00Z" },
    ],
    arcade: { history: [result("offline-a")] },
  });
  const once = mergeOfflinePractice(main, pack);
  assert.equal(once.xp, 220);
  assert.deepEqual(once.accounts, main.accounts);
  assert.deepEqual(once.games, main.games);
  assert.deepEqual(mergeOfflinePractice(once, pack), once);
  assert.equal(once.puzzles.length, 2);
  assert.ok(once.days.includes("2026-11-07"));
});
test("platform guidance recognizes Android in-app browsers and desktop-mode iPad", () => {
  assert.equal(browserPlatform("Mozilla Android"), "android");
  assert.equal(browserPlatform("Macintosh", 5), "ios");
  assert.equal(browserPlatform("Macintosh", 0), "desktop");
  assert.equal(isEmbeddedBrowser("Mozilla Android; wv)"), true);
  assert.equal(isEmbeddedBrowser("ChatGPT/1.0"), true);
  assert.equal(isEmbeddedBrowser("Chrome/140 Safari/537.36"), false);
});
