"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createPageMotion, installSmoothDetails, panelMotionMs, reducedMotion } from "../lib/ui-motion";

export function useAcademyMotion(viewKey: string) {
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const animator = useRef(createPageMotion(reducedMotion));
  const previousKey = useRef(viewKey);
  useEffect(() => shell.current ? installSmoothDetails(shell.current) : undefined, []);
  useEffect(() => () => animator.current.dispose(), []);
  useLayoutEffect(() => {
    if (previousKey.current === viewKey) return;
    previousKey.current = viewKey;
    animator.current.play(content.current);
  }, [viewKey]);
  const changeView = useCallback((change: () => void) => flushSync(change), []);
  return { shell, content, changeView };
}

// Keep a closing panel mounted but inert until its opacity transition finishes.
export function useAnimatedPresence(open: boolean) {
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setPresent(true);
      if (reducedMotion()) { setVisible(true); return; }
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    if (reducedMotion()) { setPresent(false); return; }
    const timer = setTimeout(() => setPresent(false), panelMotionMs);
    return () => clearTimeout(timer);
  }, [open]);
  return { mounted: open || present, visible: open && visible };
}
