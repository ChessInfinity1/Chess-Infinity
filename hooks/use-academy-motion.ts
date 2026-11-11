"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createViewMotion, installSmoothDetails, motionEase, panelMotionMs, reducedMotion } from "../lib/ui-motion";

export function useAcademyMotion(viewKey: string) {
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const coordinator = useRef<ReturnType<typeof createViewMotion> | null>(null);
  const animation = useRef<Animation | null>(null);
  const previousKey = useRef(viewKey);
  useEffect(() => shell.current ? installSmoothDetails(shell.current) : undefined, []);
  useEffect(() => () => { coordinator.current?.dispose(); animation.current?.cancel(); }, []);
  useLayoutEffect(() => {
    if (previousKey.current === viewKey) return;
    previousKey.current = viewKey;
    animation.current?.cancel();
    if (reducedMotion() || coordinator.current?.running || !content.current?.animate) return;
    animation.current = content.current.animate([{ opacity: .15 }, { opacity: 1 }], { duration: panelMotionMs, easing: motionEase });
  }, [viewKey]);
  const changeView = useCallback((change: () => void, native = true) => {
    coordinator.current ??= createViewMotion({
      start: typeof document.startViewTransition === "function" ? update => document.startViewTransition(update) : undefined,
      commit: update => flushSync(update), reduced: reducedMotion,
    });
    // Keep the mobile dock and closing menus live. A document snapshot would
    // freeze their CSS animation and make the indicator jump at the end.
    const compact = window.matchMedia("(max-width:760px), (max-width:1100px) and (max-height:500px) and (pointer:coarse)").matches;
    const overlay = document.querySelector(".sidebar.open,.academy-actions-panel:not([inert]),.modern-profile-popup.is-open,.profile-backdrop:not([inert])");
    coordinator.current.run(change, native && !compact && !overlay);
  }, []);
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
