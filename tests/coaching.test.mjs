import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  assessmentTasks,
  answerAssessment,
  assessmentSummary,
} from "../lib/chess/assessment.ts";
import {
  guidedFeedback,
  mergeGuidedSession,
  summarizeReview,
} from "../lib/chess/guided.ts";
import { weeklyReport, weekRange, compareWeeks } from "../lib/chess/weekly.ts";
import { initialProgress, lessons } from "../lib/chess/content.ts";
import { nextLearningLesson } from "../lib/chess/learning.ts";
const at = "2026-11-07T15:00:00Z";
const ev = (best, score, depth = 15) => ({
  best,
  score,
  depth,
  mate: null,
  pv: [best],
});
test("all eight assessment tasks are legal and grade real moves, including castling and promotion", () => {
  assert.equal(assessmentTasks.length, 8);
  const answers = [];
  for (const t of assessmentTasks) {
    assert.ok(
      lessons.some((l) => l.id === t.lesson),
      t.lesson,
    );
    for (const u of t.answers)
      assert.equal(answerAssessment(t.id, u, at).correct, true, t.id);
    answers.push(answerAssessment(t.id, t.answers[0], at));
  }
  assert.equal(assessmentSummary({ answers }).score, 8);
  assert.equal(answerAssessment("knight", "g1h3", at).correct, false);
  assert.equal(answerAssessment("pawn", null, at).correct, false);
  assert.throws(() => answerAssessment("knight", "g1g5", at));
  assert.throws(() => answerAssessment("invalid", "e2e4", at));
  const p = structuredClone(initialProgress);
  p.assessments = [
    {
      id: "check",
      startedAt: at,
      completedAt: at,
      version: 1,
      answers: assessmentTasks.map((t) => answerAssessment(t.id, null, at)),
    },
  ];
  const next = nextLearningLesson(p);
  assert.ok(assessmentSummary(p.assessments[0]).lessons.includes(next.id));
  assert.deepEqual(p.completed, []);
});
test("guided feedback converts White evaluation to player perspective and validates legal engine lines", () => {
  const fen = new Chess().fen();
  const white = guidedFeedback(fen, "e2e4", ev("d2d4", 0.3), ev("e7e5", -0.7));
  assert.equal(white.loss, 1);
  assert.equal(white.label, "Mistake");
  assert.match(white.line, /d4/);
  const g = new Chess();
  g.move("e4");
  const black = guidedFeedback(g.fen(), "f7f6", ev("e7e5", 0), ev("d2d4", 2.4));
  assert.equal(black.loss, 2.4);
  assert.equal(black.label, "Blunder");
  assert.equal(
    guidedFeedback(fen, "e2e4", ev("e2e4", 0), ev("e7e5", -2)).loss,
    0,
  );
  assert.throws(() =>
    guidedFeedback(fen, "e2e5", ev("e2e4", 0), ev("e7e5", 0)),
  );
  assert.throws(() =>
    guidedFeedback(fen, "e2e4", ev("e2e6", 0), ev("e7e5", 0)),
  );
});
test("guided session saves replace repeated plies and exclude the opponent or unrelated positions", () => {
  const g = new Chess();
  g.move("e4");
  const first = guidedFeedback(
    new Chess().fen(),
    "e2e4",
    ev("e2e4", 0),
    ev("e7e5", 0),
  );
  g.move("e5");
  const good = { ...first, ply: 1, at };
  const session = {
    id: "s",
    player: "w",
    startedAt: at,
    updatedAt: at,
    pgn: g.pgn(),
    result: "*",
    completed: false,
    moves: [good, { ...good, ply: 2 }, { ...good, ply: 1 }],
  };
  const stored = mergeGuidedSession([], session);
  assert.equal(stored[0].moves.length, 1);
  assert.equal(mergeGuidedSession(stored, session).length, 1);
});
function reviewGame() {
  const g = new Chess();
  g.loadPgn(
    '[White "Learner"]\n[Black "Opponent"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1',
  );
  const rows = g.history({ verbose: true }).map((m, i) => ({
    ply: i + 1,
    fen: m.before,
    san: m.san,
    loss: i === 2 ? 4 : 0,
    theme: "Calculation",
  }));
  return { g, rows };
}
test("review summaries require every real ply and never use only selected critical rows as denominator", () => {
  const { g, rows } = reviewGame();
  const s = summarizeReview(g.pgn(), rows);
  assert.equal(s.sides.w.moves, 2);
  assert.equal(s.sides.w.blunders, 1);
  assert.equal(s.sides.b.blunders, 0);
  assert.equal(summarizeReview(g.pgn(), rows.slice(1)), null);
  assert.equal(
    summarizeReview(
      g.pgn(),
      rows.map((r) => ({ ...r, fen: new Chess().fen() })),
    ),
    null,
  );
});
test("weekly reports use local Monday boundaries across DST and exclude undated/future records", () => {
  const old = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const now = new Date("2026-11-07T15:00:00Z");
    assert.deepEqual(weekRange(0, now).days, [
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    assert.equal(weekRange(1, now).start, "2026-10-26");
    const p = structuredClone(initialProgress);
    p.puzzles = [
      { id: "p1", at: "2026-11-02T04:30:00Z", correct: true },
      { id: "p1", at: "2026-11-02T05:00:00Z", correct: false },
      { id: "p2", at: "2026-11-08T18:00:00Z", correct: true },
      { id: "bad", at, correct: true },
    ];
    p.completed = ["l1", "l3"];
    p.lessonDates = { l1: "2026-11-07", l3: "invalid" };
    const r = weeklyReport(p, 0, now);
    assert.equal(r.attempts, 1);
    assert.equal(r.clean, 0);
    assert.equal(r.lessonIds.length, 1);
    assert.equal(r.activeDays, 2);
    assert.equal(
      r.daily.reduce((s, d) => s + d.actions, 0),
      2,
    );
    assert.equal(weeklyReport(p, 1, now).clean, 1);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("weekly game results and review mistakes belong to the identified learner, not the opponent", () => {
  const p = structuredClone(initialProgress);
  const { g, rows } = reviewGame();
  const game = {
    id: "g",
    pgn: g.pgn(),
    white: "Learner",
    black: "Opponent",
    date: at,
    result: "0-1",
  };
  p.games = [game];
  p.analyses = [
    {
      pgn: g.pgn(),
      date: at,
      complete: true,
      summary: summarizeReview(g.pgn(), rows),
    },
  ];
  const now = new Date(at);
  assert.equal(weeklyReport(p, 0, now).games.total, 0);
  assert.equal(weeklyReport(p, 0, now).review.moves, 0);
  p.accounts = { chesscom: { profile: { username: "Learner" } } };
  let r = weeklyReport(p, 0, now);
  assert.equal(r.games.losses, 1);
  assert.equal(r.review.blunders, 1);
  assert.equal(r.review.moves, 2);
  p.accounts = { chesscom: { profile: { username: "Opponent" } } };
  r = weeklyReport(p, 0, now);
  assert.equal(r.games.wins, 1);
  assert.equal(r.review.blunders, 0);
  p.analyses = [{ ...p.analyses[0], summary: null, rows: [rows[2]] }];
  assert.equal(weeklyReport(p, 0, now).review.reports, 0);
});
test("weekly comparisons require minimum samples and keep clean percentage points distinct from ratings", () => {
  const p = structuredClone(initialProgress);
  const now = new Date(at);
  let a = weeklyReport(p, 0, now),
    b = weeklyReport(p, 1, now);
  assert.equal(compareWeeks(a, b).puzzleChange, null);
  assert.equal(
    compareWeeks(
      { ...a, attempts: 5, cleanRate: 80 },
      { ...b, attempts: 5, cleanRate: 40 },
    ).puzzleChange,
    40,
  );
  assert.equal(compareWeeks(a, b).blunderRateChange, null);
});

test("winding learning trail preserves all 104 lesson IDs and puts board rules before opening plans", async () => {
  const { trailUnits, trailLessons, trailPoint, trailCurve } =
    await import("../lib/chess/learning-trail.ts");
  const all = Array.from({ length: 6 }, (_, i) =>
    trailUnits(i + 1).flatMap((u) => u.lessons),
  );
  assert.equal(all.flat().length, 104);
  assert.equal(new Set(all.flat().map((l) => l.id)).size, 104);
  assert.equal(trailLessons(1)[0].id, "l17");
  assert.equal(trailLessons(1).at(-1).id, "l1");
  for (let level = 1; level <= 6; level++)
    for (const unit of trailUnits(level)) {
      assert.ok(unit.lessons.length >= 1 && unit.lessons.length <= 4);
      assert.ok(unit.lessons.every((l) => l.level === level));
      for (let i = 0; i < unit.lessons.length; i++) {
        const p = trailPoint(i);
        assert.ok(p.x >= 90 && p.x <= 390);
        assert.ok(p.y > 0);
        assert.match(
          trailCurve(unit.lessons.length),
          new RegExp(`${p.x} ${p.y}`),
        );
      }
    }
});
