export type ClockSide = "w" | "b";
export type ChessClock = {
  remaining: [number, number];
  active: ClockSide | null;
  anchor: number;
  flagged: ClockSide | null;
};
export function createClock(seconds: number, now: number): ChessClock {
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error("Choose a positive time control.");
  return {
    remaining: [seconds * 1000, seconds * 1000],
    active: null,
    anchor: now,
    flagged: null,
  };
}
export function advanceClock(clock: ChessClock, now: number): ChessClock {
  if (!clock.active || clock.flagged) return clock;
  const elapsed = Math.max(0, now - clock.anchor);
  const i = clock.active === "w" ? 0 : 1;
  const remaining: [number, number] = [...clock.remaining];
  remaining[i] = Math.max(0, remaining[i] - elapsed);
  return {
    remaining,
    anchor: Math.max(clock.anchor, now),
    active: remaining[i] === 0 ? null : clock.active,
    flagged: remaining[i] === 0 ? clock.active : null,
  };
}
export function runClock(
  clock: ChessClock,
  side: ClockSide,
  now: number,
): ChessClock {
  const next = advanceClock(clock, now);
  if (next.flagged) return next;
  return { ...next, active: side, anchor: Math.max(now, next.anchor) };
}
export function pauseClock(clock: ChessClock, now: number): ChessClock {
  return { ...advanceClock(clock, now), active: null };
}
export function formatClock(ms: number) {
  const tenths = Math.max(0, Math.ceil(ms / 100));
  const seconds = Math.floor(tenths / 10);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${tenths % 10}`;
}
