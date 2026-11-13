import test from "node:test";
import assert from "node:assert/strict";
import { initialProgress } from "../lib/chess/content.ts";
import { puzzleTags } from "../lib/chess/puzzle-library.ts";
import { trailStops, trailExercise, stampStop } from "../lib/chess/puzzle-trail.ts";
import { validateProgress } from "../lib/progress-backup.ts";

test("every trail checkpoint selects a playable exercise or a supported arcade session", () => {
  assert.equal(new Set(trailStops.map(stop => stop.id)).size, 8);
  for (const { activity } of trailStops) {
    if (activity.kind === "arcade") {
      assert.ok(["sprint", "survival", "vision"].includes(activity.mode));
      continue;
    }
    const position = trailExercise(activity, initialProgress, "2026-11-13");
    assert.ok(position.fen && position.line.length);
    if (activity.kind === "theme") {
      assert.ok(puzzleTags(position).includes(activity.tag));
      const played = { ...initialProgress, puzzles: [{ id: position.id, correct: true, at: "2026-11-13T12:00:00Z" }] };
      assert.notEqual(trailExercise(activity, played, "2026-11-13").id, position.id);
    }
    if (activity.kind === "daily") assert.equal(trailExercise(activity, { ...initialProgress, puzzleRating: 1800 }, "2026-11-13").id, position.id);
  }
});

test("trail stamps survive progress validation and replays earn one stamp", () => {
  const legacy = validateProgress(initialProgress);
  const stamps = stampStop(legacy.trailStamps, "forks");
  assert.deepEqual(stampStop(stamps, "forks"), ["forks"]);
  assert.deepEqual(validateProgress({ ...legacy, trailStamps: stampStop(stamps, "vision") }).trailStamps, ["forks", "vision"]);
});
