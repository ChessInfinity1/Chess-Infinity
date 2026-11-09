import { Chess } from "chess.js";
import { lessons, puzzles, type Progress } from "./content.ts";
import { gameSide } from "./revenge.ts";
export function localDay(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export function weekRange(offset = 0, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(
    start.getDate() -
      ((start.getDay() + 6) % 7) -
      Math.max(0, Math.min(52, offset)) * 7,
  );
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return localDay(d);
  });
  return { start: localDay(start), end: localDay(end), days };
}
function day(value: unknown) {
  if (typeof value !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + "T12:00:00");
    return Number.isFinite(d.getTime()) && localDay(d) === value ? value : "";
  }
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? localDay(d) : "";
}
export function weeklyReport(
  progress: Progress,
  offset = 0,
  now = new Date(),
  options: { includeGameDetails?: boolean } = {},
) {
  const range = weekRange(offset, now);
  const within = (value: unknown) => {
    const k = day(value);
    return !!k && k >= range.start && k < range.end && k <= localDay(now);
  };
  const byId = new Map(puzzles.map((p) => [p.id, p]));
  const attempts = progress.puzzles.filter(
    (a) => within(a.at) && byId.has(a.id),
  );
  const clean = attempts.filter((a) => a.correct).length;
  const knownLessons = new Set(lessons.map((l) => l.id));
  const lessonIds = Object.entries(progress.lessonDates)
    .filter(
      ([id, at]) =>
        knownLessons.has(id) && progress.completed.includes(id) && within(at),
    )
    .map(([id]) => id);
  const patterns = new Map<string, { attempts: number; clean: number }>();
  for (const a of attempts) {
    const theme = byId.get(a.id)!.theme;
    const t = patterns.get(theme) || { attempts: 0, clean: 0 };
    t.attempts++;
    if (a.correct) t.clean++;
    patterns.set(theme, t);
  }
  const skills = [...patterns.entries()]
    .map(([theme, s]) => ({
      theme,
      ...s,
      rate: Math.round((s.clean / s.attempts) * 100),
    }))
    .sort((a, b) => a.rate - b.rate || b.attempts - a.attempts);
  const guided = (progress.guidedSessions || [])
    .flatMap((s) => s.moves)
    .filter((m) => within(m.at));
  const assessments = (progress.assessments || []).filter((a) =>
    within(a.completedAt),
  );
  const arcade = (progress.arcade?.history || []).filter((a) =>
    within(a.finishedAt),
  );
  const active = new Set(progress.days.filter(within));
  const actionDays = new Map(range.days.map((d) => [d, 0]));
  for (const at of [
    ...attempts.map((a) => a.at),
    ...lessonIds.map((id) => progress.lessonDates[id]),
    ...guided.map((m) => m.at),
    ...assessments.map((a) => a.completedAt),
    ...arcade.map((a) => a.finishedAt),
  ]) {
    const d = day(at);
    if (actionDays.has(d)) {
      actionDays.set(d, actionDays.get(d)! + 1);
      active.add(d);
    }
  }
  const games = { wins: 0, draws: 0, losses: 0, total: 0 };
  const seenGames = new Set<string>();
  for (const game of options.includeGameDetails === false
    ? []
    : progress.games) {
    if (!within(game.date) || !["1-0", "0-1", "1/2-1/2"].includes(game.result))
      continue;
    const side = gameSide(game, progress.accounts);
    if (!side) continue;
    try {
      const g = new Chess();
      g.loadPgn(game.pgn);
      const key = g.history().join(" ") + JSON.stringify(g.getHeaders());
      if (
        !g.history().length ||
        g.getHeaders().Result !== game.result ||
        seenGames.has(key)
      )
        continue;
      seenGames.add(key);
    } catch {
      continue;
    }
    games.total++;
    if (game.result === "1/2-1/2") games.draws++;
    else if (game.result === (side === "w" ? "1-0" : "0-1")) games.wins++;
    else games.losses++;
  }
  const review = { reports: 0, moves: 0, loss: 0, blunders: 0, missedMates: 0 };
  for (const a of options.includeGameDetails === false
    ? []
    : progress.analyses) {
    if (!within(a.date) || !a.complete || a.summary?.version !== 1) continue;
    try {
      const g = new Chess();
      g.loadPgn(a.pgn);
      const h = g.getHeaders();
      const side =
        a.playerSide === "w" || a.playerSide === "b"
          ? a.playerSide
          : gameSide(
              { white: h.White || "", black: h.Black || "" },
              progress.accounts,
            );
      if (!side) continue;
      const s = a.summary.sides?.[side];
      const actual = g
        .history({ verbose: true })
        .filter((m) => m.color === side).length;
      if (
        !s ||
        s.moves !== actual ||
        ![s.loss, s.blunders, s.missedMates].every(
          (n) => Number.isFinite(n) && n >= 0,
        ) ||
        s.blunders > s.moves
      )
        continue;
      review.reports++;
      review.moves += s.moves;
      review.loss += s.loss;
      review.blunders += s.blunders;
      review.missedMates += s.missedMates;
    } catch {
      continue;
    }
  }
  return {
    range,
    attempts: attempts.length,
    clean,
    cleanRate: attempts.length
      ? Math.round((clean / attempts.length) * 100)
      : null,
    lessonIds,
    activeDays: active.size,
    skills,
    guided: {
      moves: guided.length,
      blunders: guided.filter((m) => m.loss >= 2).length,
    },
    assessments: assessments.length,
    arcade: arcade.length,
    games,
    review,
    daily: [...actionDays.entries()].map(([date, actions]) => ({
      date,
      actions,
    })),
  };
}
export function compareWeeks(
  current: ReturnType<typeof weeklyReport>,
  previous: ReturnType<typeof weeklyReport>,
) {
  return {
    puzzleChange:
      current.attempts >= 5 && previous.attempts >= 5
        ? current.cleanRate! - previous.cleanRate!
        : null,
    blunderRateChange:
      current.review.moves >= 20 && previous.review.moves >= 20
        ? (current.review.blunders / current.review.moves -
            previous.review.blunders / previous.review.moves) *
          100
        : null,
  };
}
