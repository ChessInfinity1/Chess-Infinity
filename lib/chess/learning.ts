import { assessmentSummary } from "./assessment.ts";
import { puzzles, lessons, type Progress, type Exercise } from "./content.ts";
export function practiceRecommendation(
  progress: Progress,
  all: Exercise[] = puzzles,
  now = new Date(),
) {
  const byId = new Map(all.map((p) => [p.id, p]));
  const history = progress.puzzles;
  const recent = new Set(history.slice(-25).map((p) => p.id));
  const latest = new Map(history.map((a) => [a.id, a]));
  const due = all.filter((p) => {
    const a = latest.get(p.id);
    return (
      a &&
      !a.correct &&
      !recent.has(p.id) &&
      progress.reviews[p.id] &&
      Date.parse(progress.reviews[p.id].due) <= now.getTime()
    );
  });
  if (due.length) {
    const p = due.sort(
      (a, b) =>
        Date.parse(progress.reviews[a.id].due) -
        Date.parse(progress.reviews[b.id].due),
    )[0];
    return {
      puzzle: p,
      reason: "Due review · revisit a pattern you missed",
      review: true,
    };
  }
  const weak = new Map<string, number>();
  for (const a of history.slice(-100))
    if (!a.correct) {
      const p = byId.get(a.id);
      if (p) weak.set(p.theme, (weak.get(p.theme) || 0) + 1);
    }
  let pool = all.filter((p) => !latest.has(p.id));
  if (!pool.length) pool = all.filter((p) => !recent.has(p.id));
  if (!pool.length) pool = all;
  const salt = history.length;
  const tie = (id: string) => {
    let n = salt;
    for (const c of id) n = (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0;
    return n % 997;
  };
  const p = [...pool].sort(
    (a, b) =>
      Math.abs(a.rating - progress.puzzleRating) -
        Math.min(160, (weak.get(a.theme) || 0) * 40) -
        (Math.abs(b.rating - progress.puzzleRating) -
          Math.min(160, (weak.get(b.theme) || 0) * 40)) ||
      tie(a.id) - tie(b.id),
  )[0];
  return {
    puzzle: p,
    reason: weak.has(p.theme)
      ? "New position · practice a recently missed pattern"
      : "New position · matched to your training strength",
    review: false,
  };
}
export function skillBreakdown(progress: Progress, all: Exercise[] = puzzles) {
  const byId = new Map(all.map((p) => [p.id, p]));
  const totals = new Map<string, { attempts: number; clean: number }>();
  for (const attempt of progress.puzzles.slice(-200)) {
    const p = byId.get(attempt.id);
    if (!p) continue;
    const s = totals.get(p.theme) || { attempts: 0, clean: 0 };
    s.attempts++;
    if (attempt.correct) s.clean++;
    totals.set(p.theme, s);
  }
  return [...totals.entries()]
    .map(([theme, s]) => ({
      theme,
      ...s,
      rate: Math.round((s.clean / s.attempts) * 100),
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 6);
}
export function startingLesson(experience: string) {
  return (
    lessons.find(
      (l) =>
        l.id ===
        (experience === "new"
          ? "l17"
          : experience === "rules"
            ? "l35"
            : "applied-fork"),
    ) || lessons[0]
  );
}
export function nextLearningLesson(progress: Progress) {
  const latest = progress.assessments?.[0];
  if (latest) {
    const suggested = assessmentSummary(latest)
      .lessons.map((id) => lessons.find((l) => l.id === id))
      .find((l) => l && !progress.completed.includes(l.id));
    if (suggested) return suggested;
  }
  const start =
    progress.onboarding?.experience === "regular"
      ? 3
      : progress.onboarding?.experience === "rules"
        ? 2
        : 1;
  return (
    lessons
      .filter((l) => !progress.completed.includes(l.id))
      .sort((a, b) => {
        const ar = a.level >= start ? 0 : 1,
          br = b.level >= start ? 0 : 1;
        return ar - br || a.level - b.level || a.rating - b.rating;
      })[0] || lessons[0]
  );
}
export function shouldStartWelcome(
  progress: Progress,
  hasDraft = false,
  forced = false,
) {
  const active =
    progress.xp > 0 ||
    progress.completed.length > 0 ||
    progress.puzzles.length > 0 ||
    progress.games.length > 0 ||
    Object.keys(progress.accounts).length > 0;
  return forced || hasDraft || (!progress.onboarding?.completed && !active);
}
export function orderPuzzleLibrary(
  all: Exercise[],
  history: { id: string }[],
  rating = 600,
) {
  const seen = new Set(history.map((a) => a.id));
  return [...all].sort(
    (a, b) =>
      Number(seen.has(a.id)) - Number(seen.has(b.id)) ||
      Math.abs(a.rating - rating) - Math.abs(b.rating - rating) ||
      a.id.localeCompare(b.id),
  );
}
