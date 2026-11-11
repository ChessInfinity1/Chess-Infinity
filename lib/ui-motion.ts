export const motionEase = "cubic-bezier(.22, .8, .25, 1)";
export const panelMotionMs = 220;

export function dropOffset(index: number, x: number, y: number, squareSize: number) {
  return { x: x - (index % 8 + .5) * squareSize, y: y - (Math.floor(index / 8) + .5) * squareSize };
}

type ViewAnimation = { ready: Promise<unknown>; finished: Promise<unknown>; skipTransition: () => void };
type ViewMotionOptions = {
  start?: (update: () => void) => ViewAnimation;
  commit: (update: () => void) => void;
  reduced: () => boolean;
};

// A skipped native transition still runs its callback. Guard stale callbacks so
// rapid taps cannot send the player back to an older destination.
export function createViewMotion(options: ViewMotionOptions) {
  let generation = 0;
  let active: ViewAnimation | undefined;
  return {
    get running() { return !!active; },
    run(update: () => void, native = true) {
      const current = ++generation;
      active?.skipTransition();
      active = undefined;
      if (!native || !options.start || options.reduced()) {
        options.commit(update);
        return;
      }
      let committed = false;
      try {
        const transition = options.start(() => {
          if (current !== generation) return;
          committed = true;
          options.commit(update);
        });
        active = transition;
        // ready rejects when the browser skips an animation (e.g. background tab).
        void transition.ready.catch(() => {});
        void transition.finished.then(() => {
          if (active === transition) active = undefined;
        }, () => {
          if (active === transition) active = undefined;
        });
      } catch (error) {
        active = undefined;
        if (!committed) options.commit(update);
        else throw error;
      }
    },
    dispose() {
      ++generation;
      active?.skipTransition();
      active = undefined;
    },
  };
}

export function reducedMotion() {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animate the native details element itself: no wrapper changes or fake ARIA. */
export function installSmoothDetails(root: HTMLElement) {
  const animations = new Map<HTMLDetailsElement, { animation: Animation; opening: boolean; height: string; overflow: string }>();
  function click(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || reducedMotion()) return;
    const target = event.target instanceof Element ? event.target : null;
    const summary = target?.closest("summary");
    const details = summary?.parentElement;
    if (!(details instanceof HTMLDetailsElement) || !root.contains(details) || typeof details.animate !== "function") return;
    if (target?.closest("a,button,input,select,textarea")) return;
    event.preventDefault();
    const previous = animations.get(details);
    const opening = previous ? !previous.opening : !details.open;
    const from = details.getBoundingClientRect().height;
    const height = previous?.height ?? details.style.height;
    const overflow = previous?.overflow ?? details.style.overflow;
    previous?.animation.cancel();
    details.style.height = height;
    details.style.overflow = overflow;
    details.open = opening;
    const to = details.getBoundingClientRect().height;
    // Retain closing content until the animation ends, then close natively.
    details.open = true;
    details.style.height = `${from}px`;
    details.style.overflow = "hidden";
    const animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: panelMotionMs, easing: motionEase, fill: "forwards" });
    const record = { animation, opening, height, overflow };
    animations.set(details, record);
    void animation.finished.then(() => {
      if (animations.get(details) !== record) return;
      details.open = opening;
      details.style.height = height;
      details.style.overflow = overflow;
      animations.delete(details);
      animation.cancel();
    }, () => {});
  }
  root.addEventListener("click", click);
  return () => {
    root.removeEventListener("click", click);
    for (const [details, record] of animations) {
      record.animation.cancel();
      details.open = record.opening;
      details.style.height = record.height;
      details.style.overflow = record.overflow;
    }
    animations.clear();
  };
}
