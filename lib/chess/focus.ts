import { lessons, puzzles, type Progress, type Exercise } from "./content.ts";
import { nextLearningLesson, orderPuzzleLibrary } from "./learning.ts";

export type FocusStep = {
  id: string;
  kind: "lesson" | "puzzle";
  reason: string;
  completedAt?: string;
  clean?: boolean;
};
export type FocusSession = {
  id: string;
  minutes: 5 | 10 | 15;
  startedAt: string;
  finishedAt?: string;
  steps: FocusStep[];
};

export function duePractice(progress: Progress, now = new Date()) {
  const known = new Set([...lessons, ...puzzles].map(item => item.id));
  return Object.entries(progress.reviews)
    .filter(([id, review]) => known.has(id) && Date.parse(review.due) <= now.getTime())
    .sort((a, b) => Date.parse(a[1].due) - Date.parse(b[1].due))
    .map(([id]) => id);
}

export function createFocusSession(progress: Progress, minutes: 5 | 10 | 15, id: string, now = new Date()): FocusSession {
  const due = duePractice(progress, now);
  const dueSet = new Set(due);
  const lesson = lessons.find(item => dueSet.has(item.id)) || nextLearningLesson(progress);
  const recent = new Set((progress.focusSessions || []).slice(-3).flatMap(session => session.steps.map(step => step.id)));
  const ordered = orderPuzzleLibrary(puzzles, progress.puzzles, progress.puzzleRating);
  const duePuzzles = due.map(id => puzzles.find(item => item.id === id)).filter((item): item is Exercise => !!item);
  const candidates = [...duePuzzles, ...ordered.filter(item => !recent.has(item.id)), ...ordered];
  const selected: Exercise[] = [];
  const used = new Set([lesson.id]);
  // Due reviews come first; new positions come from the learner's current difficulty band.
  for (const puzzle of candidates) {
    if (used.has(puzzle.id)) continue;
    used.add(puzzle.id);
    selected.push(puzzle);
    if (selected.length === (minutes === 5 ? 2 : minutes === 10 ? 4 : 6)) break;
  }
  return {
    id, minutes, startedAt: now.toISOString(),
    steps: [
      { id: lesson.id, kind: "lesson", reason: dueSet.has(lesson.id) ? "Refresh an idea due for review" : "Your next learning-path lesson" },
      ...selected.map(puzzle => ({ id: puzzle.id, kind: "puzzle" as const, reason: dueSet.has(puzzle.id) ? "Due review · strengthen recall" : "Fresh position · matched to your training difficulty" })),
    ],
  };
}

export function completeFocusStep(sessions: FocusSession[] | undefined, sessionId: string, exerciseId: string, kind: FocusStep["kind"], clean: boolean, now = new Date()) {
  return (sessions || []).map(session => {
    if (session.id !== sessionId || session.finishedAt) return session;
    const next = session.steps.find(step => !step.completedAt);
    if (!next || next.id !== exerciseId || next.kind !== kind) return session;
    const steps = session.steps.map(step => step === next ? { ...step, completedAt: now.toISOString(), clean } : step);
    return { ...session, steps, ...(steps.every(step => step.completedAt) ? { finishedAt: now.toISOString() } : {}) };
  });
}

export function appendFocusSession(sessions: FocusSession[] | undefined, session: FocusSession) {
  return [...(sessions || []).filter(item => item.id !== session.id), session].slice(-20);
}
