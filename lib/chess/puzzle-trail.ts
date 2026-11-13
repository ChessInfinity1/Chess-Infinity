import { dailyPuzzle, type ArcadeMode } from "./arcade.ts";
import { puzzles, type Progress } from "./content.ts";
import { orderPuzzleLibrary, practiceRecommendation } from "./learning.ts";
import { puzzleTags } from "./puzzle-library.ts";

type TrailActivity =
  | { kind: "recommended" | "daily" }
  | { kind: "theme"; tag: string }
  | { kind: "arcade"; mode: ArcadeMode };

export const trailStops = [
  { id: "tactics", title: "Tactics warm-up", detail: "Solve a position picked for your puzzle rating and recent practice.", activity: { kind: "recommended" } },
  { id: "forks", title: "Fork hunt", detail: "Find a single move that threatens two targets.", activity: { kind: "theme", tag: "Forks" } },
  { id: "sprint", title: "Puzzle sprint", detail: "Score as many clean solves as you can in three minutes.", activity: { kind: "arcade", mode: "sprint" } },
  { id: "daily", title: "Daily position", detail: "Take your time on today’s featured puzzle.", activity: { kind: "daily" } },
  { id: "mate", title: "Mate in two", detail: "Calculate the reply and deliver checkmate on your second move.", activity: { kind: "theme", tag: "Mate in 2" } },
  { id: "vision", title: "Board vision", detail: "Find the named squares on the board in sixty seconds.", activity: { kind: "arcade", mode: "vision" } },
  { id: "endgame", title: "Endgame study", detail: "Find the best continuation with only a few pieces left.", activity: { kind: "theme", tag: "Endgames" } },
  { id: "survival", title: "Survival", detail: "Solve without a clock. Your run ends after three mistakes.", activity: { kind: "arcade", mode: "survival" } },
] as const satisfies ReadonlyArray<{ id: string; title: string; detail: string; activity: TrailActivity }>;

export type TrailStop = typeof trailStops[number];
export type TrailId = TrailStop["id"];

export function trailExercise(activity: Exclude<TrailActivity, { kind: "arcade" }>, progress: Progress, day: string) {
  if (activity.kind === "theme") {
    const pool = puzzles.filter(puzzle => puzzleTags(puzzle).includes(activity.tag));
    return orderPuzzleLibrary(pool, progress.puzzles, progress.puzzleRating)[0];
  }
  return activity.kind === "daily" ? dailyPuzzle(day) : practiceRecommendation(progress).puzzle;
}

export function stampStop(stamps: string[] | undefined, id: TrailId) {
  return stamps?.includes(id) ? stamps : [...(stamps || []), id];
}
