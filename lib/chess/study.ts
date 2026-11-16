import { Chess, type Color } from "chess.js";
import { lessons, puzzles, type Opening, type Progress } from "./content.ts";

export type StudyAttempt = { id: string; kind: "opening" | "endgame"; exerciseId: string; clean: boolean; at: string };
export type StudyNote = { id: string; title: string; body: string; topic: string; updatedAt: string; archived?: boolean };
export type StudyState = { attempts: StudyAttempt[]; notes: StudyNote[] };
export const emptyStudy: StudyState = { attempts: [], notes: [] };

export function recordStudy(progress: Progress, attempt: StudyAttempt): Progress {
  const study = progress.study || emptyStudy;
  if (study.attempts.some(item => item.id === attempt.id)) return progress;
  const at = new Date(attempt.at);
  if (!Number.isFinite(at.getTime())) return progress;
  const day = localStudyDay(at);
  const rewarded = study.attempts.some(item => item.kind === attempt.kind && item.exerciseId === attempt.exerciseId && localStudyDay(new Date(item.at)) === day);
  return { ...progress, study: { ...study, attempts: [...study.attempts, attempt].slice(-500) }, xp: progress.xp + (rewarded ? 0 : attempt.clean ? 10 : 6), days: [...new Set([...progress.days, day])] };
}
export function saveStudyNote(study: StudyState | undefined, note: StudyNote): StudyState {
  const value = study || emptyStudy;
  const clean = { ...note, title: note.title.trim().slice(0, 120), body: note.body.trim().slice(0, 4000), topic: note.topic.slice(0, 40) };
  if (!clean.title || !clean.body) throw new Error("Add a title and a note before saving.");
  if (!value.notes.some(item => item.id === note.id) && value.notes.length >= 100) throw new Error("Your journal has reached 100 notes. Edit an existing note or export your journal.");
  return { ...value, notes: [clean, ...value.notes.filter(item => item.id !== clean.id)] };
}
export function localStudyDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function openingLine(opening: Opening) {
  const board = new Chess();
  return opening.line.trim().split(/\s+/).map(san => {
    const move = board.move(san);
    return { san: move.san, uci: move.from + move.to + (move.promotion || ""), before: move.before, after: move.after, color: move.color };
  });
}
// Rehearsal compares with the named sample line, never labels other legal openings bad.
export function openingMove(opening: Opening, index: number, player: Color, from: string, to: string, promotion?: string) {
  const line = openingLine(opening), expected = line[index];
  if (!expected || expected.color !== player) throw new Error("Wait for the sample reply.");
  const board = new Chess(expected.before);
  const move = board.move({ from, to, promotion });
  return move.from + move.to + (move.promotion || "") === expected.uci;
}

export function studyInsights(progress: Progress, span: 7 | 28 | 90, now = new Date()) {
  const days = Array.from({ length: span }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - span + 1 + i); return { day: localStudyDay(d), actions: 0, active: false }; });
  const byDay = new Map(days.map(day => [day.day, day]));
  const dayOf = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localStudyDay(new Date(value));
  const within = (value: string) => byDay.has(dayOf(value)) && (value.length === 10 || Date.parse(value) <= now.getTime());
  const knownLessons = new Set(lessons.map(item => item.id));
  const knownPuzzles = new Map(puzzles.map(item => [item.id, item]));
  const attempts = progress.puzzles.filter(item => knownPuzzles.has(item.id) && within(item.at));
  const completed = Object.entries(progress.lessonDates).filter(([id, at]) => knownLessons.has(id) && progress.completed.includes(id) && within(at));
  const study = (progress.study?.attempts || []).filter(item => within(item.at));
  const times = [...attempts.map(item => item.at), ...completed.map(([,at]) => at), ...study.map(item => item.at), ...(progress.arcade?.history || []).map(item => item.finishedAt).filter(within), ...(progress.guidedSessions || []).flatMap(item => item.moves.map(move => move.at)).filter(within)];
  for (const at of times) { const item = byDay.get(dayOf(at)); if (item) { item.actions++; item.active = true; } }
  for (const day of progress.days) { const item = byDay.get(day); if (item) item.active = true; }
  const patterns = new Map<string, { theme: string; attempts: number; clean: number; rate: number }>();
  for (const attempt of attempts) { const theme = knownPuzzles.get(attempt.id)!.theme; const row = patterns.get(theme) || { theme, attempts: 0, clean: 0, rate: 0 }; row.attempts++; row.clean += Number(attempt.correct); row.rate = Math.round(100 * row.clean / row.attempts); patterns.set(theme, row); }
  const clean = attempts.filter(item => item.correct).length;
  return { days, active: days.filter(day => day.active).length, attempts: attempts.length, clean, rate: attempts.length ? Math.round(clean / attempts.length * 100) : null, lessons: completed.length, study: study.length, patterns: [...patterns.values()].sort((a,b) => a.rate - b.rate || b.attempts - a.attempts) };
}

export function studyMilestones(progress: Progress) {
  const known = new Set(lessons.map(item => item.id));
  const completed = new Set(progress.completed.filter(id => known.has(id))).size;
  const knownPuzzles = new Set(puzzles.map(item => item.id));
  const cleanPuzzles = new Set(progress.puzzles.filter(item => item.correct && knownPuzzles.has(item.id)).map(item => item.id)).size;
  const days = [...new Set(progress.days)].filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day) && localStudyDay(new Date(day + "T12:00:00")) === day).sort();
  let streak = 0, longest = 0, previous = "";
  for (const day of days) { const before = new Date(day + "T12:00:00"); before.setDate(before.getDate() - 1); streak = localStudyDay(before) === previous ? streak + 1 : 1; longest = Math.max(longest, streak); previous = day; }
  const attempts = progress.study?.attempts || [];
  const values = [
    { id: "first-lesson", name: "First chapter", detail: "Complete your first lesson", value: completed, target: 1, unit: "lessons" },
    { id: "ten-lessons", name: "Building a foundation", detail: "Complete 10 different lessons", value: completed, target: 10, unit: "lessons" },
    { id: "ten-puzzles", name: "Pattern finder", detail: "Solve 10 different puzzles without a hint or mistake", value: cleanPuzzles, target: 10, unit: "puzzles" },
    { id: "hundred-puzzles", name: "Tactical explorer", detail: "Solve 100 different puzzles cleanly", value: cleanPuzzles, target: 100, unit: "puzzles" },
    { id: "three-days", name: "Keep showing up", detail: "Practice on 3 consecutive days", value: longest, target: 3, unit: "days" },
    { id: "opening", name: "Opening confidence", detail: "Rehearse an opening without hints or retries", value: Number(attempts.some(item => item.kind === "opening" && item.clean)), target: 1, unit: "opening" },
    { id: "endgames", name: "Finish the job", detail: "Complete 4 different endgame drills", value: new Set(attempts.filter(item => item.kind === "endgame").map(item => item.exerciseId)).size, target: 4, unit: "drills" },
    { id: "journal", name: "Make it yours", detail: "Write your first study note", value: (progress.study?.notes || []).length, target: 1, unit: "note" },
  ];
  return values.map(item => ({ ...item, value: Math.min(item.value, item.target), earned: item.value >= item.target }));
}
