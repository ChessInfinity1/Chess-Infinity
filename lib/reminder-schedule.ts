// Wall-clock scheduling is independent of the server's UTC timezone.
export type ReminderSchedule = { time: string; days: number[]; timeZone: string };
const formats = new Map<string, Intl.DateTimeFormat>();
export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 80) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}
export function parseReminderSchedule(value: unknown): ReminderSchedule {
  const r = value as Partial<ReminderSchedule> | null;
  if (!r || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time || "") || !validTimeZone(r.timeZone) || !Array.isArray(r.days) || !r.days.length || r.days.length > 7 || r.days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error("Choose a valid time, timezone and at least one practice day.");
  return { time: r.time!, days: [...new Set(r.days)].sort(), timeZone: r.timeZone };
}
function parts(at: number, zone: string) {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    if (formats.size > 100) formats.clear();
    formats.set(zone, format);
  }
  const p = Object.fromEntries(format.formatToParts(at).map(p => [p.type, p.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute };
}
function wall(at: number, zone: string) { const p = parts(at, zone); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute); }
export function reminderDayAt(at: number, zone: string) {
  const p = parts(at, zone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
export function nextReminderAt(schedule: ReminderSchedule, after = Date.now(), skipDay?: string): number {
  const local = parts(after, schedule.timeZone);
  const [hour, minute] = schedule.time.split(":").map(Number);
  for (let n = 0; n < 9; n++) {
    const date = new Date(Date.UTC(local.year, local.month - 1, local.day + n));
    if (!schedule.days.includes(date.getUTCDay()) || date.toISOString().slice(0, 10) === skipDay) continue;
    const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute);
    // Both offsets cover a DST transition. No server-local Date arithmetic.
    const offsets = [...new Set([-18, 0, 18].map(h => { const t = target + h * 3600000; return wall(t, schedule.timeZone) - t; }))];
    const candidates = offsets.map(offset => target - offset).filter(t => wall(t, schedule.timeZone) === target).sort((a, b) => a - b);
    // A missing spring-forward time moves forward by the clock change.
    if (!candidates.length) candidates.push(...offsets.map(offset => target - offset).filter(t => wall(t, schedule.timeZone) > target && wall(t, schedule.timeZone) - target <= 3 * 3600000).sort((a, b) => a - b));
    const next = candidates.find(t => t > after);
    if (next !== undefined) return next;
  }
  throw new Error("Could not find the next practice time.");
}
