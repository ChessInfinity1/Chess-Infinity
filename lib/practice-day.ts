// Device-local calendar days keep streaks, rewards and reminders on one boundary.
export function practiceDay(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
export function practicedToday(at: string, now = new Date()) { return practiceDay(at) === practiceDay(now); }
