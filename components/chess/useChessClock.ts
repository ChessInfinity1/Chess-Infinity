"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceClock,
  createClock,
  runClock,
  pauseClock,
  type ChessClock,
  type ClockSide,
} from "../../lib/chess/clock";
export function useChessClock(seconds: number) {
  const ref = useRef<ChessClock>(createClock(seconds, Date.now()));
  const [clock, setClock] = useState(ref.current);
  const apply = useCallback((fn: (c: ChessClock) => ChessClock) => {
    const next = fn(ref.current);
    ref.current = next;
    setClock(next);
    return next;
  }, []);
  const read = useCallback(
    () => apply((c) => advanceClock(c, Date.now())),
    [apply],
  );
  const run = useCallback(
    (side: ClockSide) => apply((c) => runClock(c, side, Date.now())),
    [apply],
  );
  const pause = useCallback(
    () => apply((c) => pauseClock(c, Date.now())),
    [apply],
  );
  const reset = useCallback(
    (time: number) => apply(() => createClock(time, Date.now())),
    [apply],
  );
  useEffect(() => {
    const tick = () => {
      if (ref.current.active) read();
    };
    const id = setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [read]);
  return { clock, read, run, pause, reset };
}
