import { test } from "node:test";
import assert from "node:assert/strict";
import { createViewMotion, dropOffset } from "../lib/ui-motion.ts";

function nativeHarness() {
  const transitions = [];
  const state = { reduced: false, destination: "home" };
  const motion = createViewMotion({
    reduced: () => state.reduced,
    commit: update => update(),
    start(update) {
      let finish;
      const transition = {
        update, skipped: false,
        ready: Promise.resolve(),
        finished: new Promise(resolve => { finish = resolve; }),
        skipTransition() { this.skipped = true; },
        finish() { finish(); },
      };
      transitions.push(transition);
      return transition;
    },
  });
  return { state, motion, transitions };
}
test("rapid navigation commits only the latest destination, even when skipped callbacks run late", () => {
  const { state, motion, transitions } = nativeHarness();
  motion.run(() => { state.destination = "puzzles"; });
  motion.run(() => { state.destination = "learn"; });
  assert.equal(transitions[0].skipped, true);
  transitions[1].update();
  transitions[0].update();
  assert.equal(state.destination, "learn");
});
test("reduced motion changes the page immediately and invalidates pending animation callbacks", () => {
  const { state, motion, transitions } = nativeHarness();
  motion.run(() => { state.destination = "puzzles"; });
  state.reduced = true;
  motion.run(() => { state.destination = "play"; });
  transitions[0].update();
  assert.equal(state.destination,"play");
  assert.equal(transitions.length,1);
  assert.equal(motion.running,false);
});
test("unavailable native motion or an open drawer never delays navigation", () => {
  let committed = 0;
  createViewMotion({ reduced:()=>false, commit:update=>update() }).run(()=>committed++);
  assert.equal(committed,1);
  const {state,motion,transitions}=nativeHarness();
  motion.run(()=>{state.destination="review";},false);
  assert.equal(state.destination,"review");
  assert.equal(transitions.length,0);
});
test("a finishing old transition cannot clear a newer transition; unmount prevents stale updates", async () => {
  const {state,motion,transitions}=nativeHarness();
  motion.run(()=>{state.destination="puzzles";});
  motion.run(()=>{state.destination="learn";});
  transitions[0].finish();
  await Promise.resolve();
  assert.equal(motion.running,true);
  motion.dispose();
  transitions[1].update();
  assert.equal(state.destination,"home");
  assert.equal(motion.running,false);
});
test("native startup failures fall back exactly once and skipped animations consume rejections", async () => {
  let count=0;
  const fallback=createViewMotion({ reduced:()=>false,commit:update=>update(),start:()=>{throw Error("unavailable");} });
  fallback.run(()=>count++);
  assert.equal(count,1);
  const skipped=createViewMotion({reduced:()=>false,commit:update=>update(),start:update=>{
    queueMicrotask(update);
    return {ready:Promise.reject(Error("skipped")),finished:Promise.resolve(),skipTransition(){}};
  }});
  skipped.run(()=>count++);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(count,2);
  assert.equal(skipped.running,false);
});
test("dropped pieces settle from the finger position, rather than jumping back to their source", () => {
  // White-view e4 at index 36, with a 50px square size.
  assert.deepEqual(dropOffset(36,225,225,50),{x:0,y:0});
  assert.deepEqual(dropOffset(36,234,219,50),{x:9,y:-6});
  // The same square is index 27 when the board is flipped.
  assert.deepEqual(dropOffset(27,175,175,50),{x:0,y:0});
  assert.deepEqual(dropOffset(27,170,184,50),{x:-5,y:9});
});
