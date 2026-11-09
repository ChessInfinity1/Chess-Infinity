import { lessons, puzzles, type Progress } from "./content.ts";
import {
  emptyArcade,
  saveArcadeResult,
  arcadeXp,
  createArcadeDeck,
  type ArcadeProgress,
  type ArcadeResult,
} from "./arcade.ts";
export const OFFLINE_PROGRESS_KEY = "chess-infinity-offline-practice-v1";
export type OfflinePractice = {
  version: 1;
  completed: string[];
  lessonDates: Record<string, string>;
  puzzles: { id: string; correct: boolean; at: string }[];
  arcade: ArcadeProgress;
};
export const emptyOfflinePractice: OfflinePractice = {
  version: 1,
  completed: [],
  lessonDates: {},
  puzzles: [],
  arcade: emptyArcade,
};
export function parseOfflinePractice(raw: unknown): OfflinePractice {
  if (!raw || typeof raw !== "object") return { ...emptyOfflinePractice };
  const p = raw as any;
  const lessonIds = new Set(lessons.map((l) => l.id));
  const puzzleIds = new Set(puzzles.map((x) => x.id));
  const exerciseById = new Map(createArcadeDeck().map((e) => [e.id, e]));
  const completed = Array.isArray(p.completed)
    ? ([
        ...new Set(
          p.completed.filter(
            (id: unknown) => typeof id === "string" && lessonIds.has(id),
          ),
        ),
      ].slice(0, lessons.length) as string[])
    : [];
  const attempts = (Array.isArray(p.puzzles) ? p.puzzles : [])
    .filter(
      (x: any) =>
        x &&
        puzzleIds.has(x.id) &&
        typeof x.correct === "boolean" &&
        typeof x.at === "string" &&
        Number.isFinite(Date.parse(x.at)),
    )
    .slice(-2000);
  let arcade: ArcadeProgress = { bests: { ...emptyArcade.bests }, history: [] };
  const history = (Array.isArray(p.arcade?.history) ? p.arcade.history : [])
    .slice(0, 30)
    .filter(
      (r: any) =>
        r &&
        typeof r.id === "string" &&
        r.id.length <= 100 &&
        ["sprint", "survival", "vision"].includes(r.mode) &&
        ["score", "solved", "errors", "hints", "seconds"].every(
          (k) => Number.isInteger(r[k]) && r[k] >= 0 && r[k] <= 10000,
        ) &&
        r.score <= r.solved &&
        Number.isFinite(Date.parse(r.startedAt)) &&
        Number.isFinite(Date.parse(r.finishedAt)) &&
        Date.parse(r.finishedAt) >= Date.parse(r.startedAt),
    );
  for (const r of history.reverse()) {
    const record: ArcadeResult = {
      id: r.id,
      mode: r.mode,
      score: r.score,
      solved: r.solved,
      errors: r.errors,
      hints: r.hints,
      seconds: r.seconds,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      misses: (Array.isArray(r.misses) ? r.misses : [])
        .map((e: any) => exerciseById.get(e?.id))
        .filter(Boolean)
        .slice(0, 5),
    };
    arcade = saveArcadeResult(arcade, record);
  }
  const lessonDates: Record<string, string> = {};
  for (const id of completed) {
    const date = p.lessonDates?.[id];
    if (
      typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date))
    )
      lessonDates[id] = date;
  }
  for (const mode of ["sprint", "survival", "vision"] as const) {
    const best = p.arcade?.bests?.[mode];
    if (Number.isInteger(best) && best >= 0 && best <= 10000)
      arcade.bests[mode] = Math.max(arcade.bests[mode], best);
  }
  return { version: 1, completed, lessonDates, puzzles: attempts, arcade };
}
export function mergeOfflinePractice(
  main: Progress,
  pack: OfflinePractice,
): Progress {
  const completed = [...new Set([...main.completed, ...pack.completed])];
  let xp = main.xp + (completed.length - main.completed.length) * 50;
  const days = new Set(main.days);
  const lessonDates = { ...main.lessonDates };
  for (const id of pack.completed)
    if (pack.lessonDates[id]) {
      const date = pack.lessonDates[id];
      if (!main.completed.includes(id)) lessonDates[id] = date;
      days.add(date);
    }
  const attempts = [...main.puzzles];
  const known = new Set(attempts.map((p) => p.id + "|" + p.at));
  for (const p of pack.puzzles) {
    const key = p.id + "|" + p.at;
    if (known.has(key)) continue;
    const date = p.at.slice(0, 10);
    if (!attempts.some((x) => x.id === p.id && x.at.slice(0, 10) === date))
      xp += 20;
    days.add(new Date(p.at).toLocaleDateString("en-CA"));
    attempts.push(p);
    known.add(key);
  }
  let arcade = main.arcade || emptyArcade;
  const imported = new Set(main.offlineImports || []);
  for (const record of [...pack.arcade.history].sort((a, b) =>
    a.finishedAt.localeCompare(b.finishedAt),
  )) {
    if (
      imported.has(record.id) ||
      arcade.history.some((x) => x.id === record.id)
    )
      continue;
    xp += arcadeXp(
      arcade,
      record,
      new Date(record.finishedAt).toLocaleDateString("en-CA"),
    );
    if (record.solved || record.errors)
      days.add(new Date(record.finishedAt).toLocaleDateString("en-CA"));
    arcade = saveArcadeResult(arcade, record);
    imported.add(record.id);
  }
  arcade = {
    ...arcade,
    bests: {
      sprint: Math.max(arcade.bests.sprint, pack.arcade.bests.sprint),
      survival: Math.max(arcade.bests.survival, pack.arcade.bests.survival),
      vision: Math.max(arcade.bests.vision, pack.arcade.bests.vision),
    },
  };
  return {
    ...main,
    completed,
    lessonDates,
    days: [...days],
    puzzles: attempts.slice(-2000),
    arcade,
    offlineImports: [...imported].slice(-300),
    xp,
  };
}
