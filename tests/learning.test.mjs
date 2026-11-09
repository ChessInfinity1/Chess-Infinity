import assert from "node:assert/strict";
import { test } from "node:test";
import { Chess } from "chess.js";
import { initialProgress, lessons, puzzles } from "../lib/chess/content.ts";
import {
  practiceRecommendation,
  skillBreakdown,
  startingLesson,
  nextLearningLesson,
  shouldStartWelcome,
} from "../lib/chess/learning.ts";
test("curriculum contains 104 distinct lessons, valid quizzes, and genuinely varied new positions", () => {
  assert.equal(lessons.length, 104);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 104);
  for (const l of lessons) {
    assert.ok(l.intro.length > 40, l.id);
    assert.ok(l.question.length > 10, l.id);
    assert.ok(l.answer >= 0 && l.answer < l.choices.length, l.id);
    assert.equal(new Set(l.choices).size, l.choices.length);
    const g = new Chess(l.fen);
    for (const u of l.line)
      g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    if (l.theme === "Mate in 1" || l.id === "l59")
      assert.ok(g.isCheckmate(), l.id);
  }
  assert.equal(
    new Set(
      lessons
        .filter((l) => l.id.startsWith("applied-") || l.id.startsWith("deep-"))
        .map((l) => l.fen),
    ).size,
    21,
  );
});
test("smart practice avoids repeats through 80 consecutive new positions", () => {
  const p = structuredClone(initialProgress);
  const seen = new Set();
  for (let i = 0; i < 80; i++) {
    const r = practiceRecommendation(p);
    assert.ok(!seen.has(r.puzzle.id), r.puzzle.id);
    seen.add(r.puzzle.id);
    p.puzzles.push({
      id: r.puzzle.id,
      correct: true,
      at: "2026-11-07T12:00:00Z",
    });
  }
  assert.equal(seen.size, 80);
});
test("due missed puzzles are reviewed intentionally rather than repeating a fixed starting puzzle", () => {
  const p = structuredClone(initialProgress);
  p.puzzles = [
    { id: puzzles[1].id, correct: false, at: "2026-11-01T12:00:00Z" },
    ...puzzles
      .slice(10, 36)
      .map((e) => ({ id: e.id, correct: true, at: "2026-11-06T12:00:00Z" })),
  ];
  p.reviews[puzzles[1].id] = { due: "2026-11-02T12:00:00Z", interval: 1 };
  const r = practiceRecommendation(
    p,
    puzzles,
    new Date("2026-11-07T12:00:00Z"),
  );
  assert.equal(r.review, true);
  assert.equal(r.puzzle.id, puzzles[1].id);
  const skills = skillBreakdown(p);
  assert.ok(
    skills.every((s) => s.clean <= s.attempts && s.rate >= 0 && s.rate <= 100),
  );
});
test("welcome appears once for a new learner, resumes a draft, and never resets existing progress", () => {
  const p = structuredClone(initialProgress);
  assert.equal(shouldStartWelcome(p), true);
  p.xp = 50;
  assert.equal(shouldStartWelcome(p), false);
  assert.equal(shouldStartWelcome(p, true), true);
  p.onboarding = {
    version: 1,
    completed: true,
    experience: "rules",
    finishedAt: "2026-11-07T12:00:00Z",
  };
  assert.equal(shouldStartWelcome(p), false);
  assert.equal(shouldStartWelcome(p, false, true), true);
  assert.equal(p.xp, 50);
  assert.equal(startingLesson("new").id, "l17");
  assert.equal(startingLesson("rules").id, "l35");
  assert.equal(startingLesson("regular").id, "applied-fork");
  const next = nextLearningLesson(p);
  assert.ok(next.level >= 2);
  assert.ok(!p.completed.includes(next.id));
});
