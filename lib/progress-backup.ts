import { z } from "zod";
import { Chess } from "chess.js";
import { initialProgress, type Progress } from "./chess/content.ts";
const str = z.string();
const number = z.number().finite();
const count = number.int().nonnegative();
const strings = z.array(str);
const record = <T extends z.ZodType>(value: T) => z.record(str, value);
const object = z.record(str, z.unknown());
const answer = z.object({ taskId: str, uci: str.nullable(), correct: z.boolean(), at: str });
const draft = z.object({ id: str, startedAt: str, answers: z.array(answer) });
const exercise = z.object({ id: str, fen: str, line: strings, title: str, theme: str, explanation: str, hint: str, rating: number }).passthrough();
const move = z.object({ ply: count, fen: str, uci: str, san: str, at: str, loss: number, label: str, best: str, line: str, depth: count, explanation: str });
const game = z.object({ id: str, pgn: str, white: str, black: str, result: str, source: str, date: str }).passthrough();
const schema = z.object({
  focusSessions: z.array(z.object({ id: str.max(100), minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]), startedAt: z.iso.datetime(), finishedAt: z.iso.datetime().optional(), steps: z.array(z.object({ id: str.max(100), kind: z.enum(["lesson", "puzzle"]), reason: str.max(200), completedAt: z.iso.datetime().optional(), clean: z.boolean().optional() })).min(1).max(7) })).max(20).optional(),
  completed: strings, puzzles: z.array(z.object({ id: str, correct: z.boolean(), at: str })),
  xp: count, puzzleRating: number.nonnegative(), days: strings, lessonDates: record(str),
  analyses: z.array(z.object({ id: str, pgn: str, rows: z.array(object) }).passthrough()),
  goal: str.max(200), minutes: z.union([z.literal(10),z.literal(15),z.literal(30),z.literal(45),z.literal(60),z.literal(90)]),
  repertoire: strings, reviews: record(z.object({ due: str, interval: number.nonnegative() })),
  games: z.array(game), accounts: record(object),
  theme: z.enum(["light", "dark"]), boardTheme: z.enum(["violet", "sage", "wood"]), dockStyle: z.enum(["glass", "solid"]),
  savedExercises: strings.optional(), explainMoves: z.boolean().optional(),
  explanations: z.array(z.object({ id: str, correctFirstTry: z.boolean(), at: str })).optional(),
  practiceReminder: z.object({ enabled: z.boolean(), time: str.regex(/^\d{2}:\d{2}$/), days: z.array(count.max(6)), dismissedDay: str.optional(), snoozeUntil: str.optional() }).optional(),
  assessmentDraft: draft.nullable(), assessments: z.array(draft.extend({ completedAt: str, version: z.literal(1) })),
  guidedSessions: z.array(z.object({ id: str, startedAt: str, updatedAt: str, player: z.enum(["w", "b"]), opponentSkill: number.optional(), pgn: str, result: str, completed: z.boolean(), moves: z.array(move) })),
  offlineImports: strings,
  onboarding: z.object({ version: z.literal(1), completed: z.boolean(), experience: str, finishedAt: str, skipped: z.boolean().optional() }).nullable(),
  arcade: z.object({ bests: z.object({ sprint: count, survival: count, vision: count }), history: z.array(z.object({ id: str, mode: z.enum(["sprint", "survival", "vision"]), score: number, solved: count, errors: count, hints: count, startedAt: str, finishedAt: str, seconds: number, misses: z.array(exercise) })) }),
  revenge: z.object({ positions: z.array(z.object({ id: str, gameId: str, pgnHash: str, white: str, black: str, source: str, ply: count, color: z.enum(["w", "b"]), fen: str, played: str, playedUci: str, bestUci: str, line: strings, loss: number, label: str, theme: str, explanation: str, depth: count, createdAt: str })), records: record(z.object({ attempts: count, solves: count, cleanDays: strings, dueAt: str, lastAttemptAt: str, xpDay: str })) }),
});
export function validateProgress(data: unknown): Progress {
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray((data as any).completed)) throw new Error("Choose an Academy progress export or device backup JSON.");
  const result = schema.safeParse({ ...initialProgress, ...data });
  if (!result.success) throw new Error(`Invalid progress field: ${result.error.issues[0]?.path.join(".") || "data"}. Your current progress has been kept.`);
  return result.data as Progress;
}
export function parseProgressBackup(raw: string): Progress {
  if (new TextEncoder().encode(raw).length > 1800000) throw new Error("This backup exceeds the 1.8 MB import limit. Keep your original file and export fewer games.");
  const parsed = JSON.parse(raw, (key, value) => ["__proto__", "constructor", "prototype", "token", "accessToken", "refreshToken", "password", "authorization"].includes(key) ? undefined : value);
  const result = validateProgress(parsed?.data || parsed);
  for (const game of result.games) {
    try { const board = new Chess(); board.loadPgn(game.pgn); }
    catch { throw new Error(`The game ${game.id} contains invalid PGN. Nothing was imported.`); }
  }
  return result;
}
