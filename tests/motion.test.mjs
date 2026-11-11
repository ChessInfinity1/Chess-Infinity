import { test } from "node:test";
import assert from "node:assert/strict";
import { createPageMotion, dropOffset } from "../lib/ui-motion.ts";

function harness() {
  const animations = [];
  const state = { reduced: false };
  const element = { animate(frames, options) {
    let finish, reject;
    const animation = {
      frames, options, cancelled: false,
      finished: new Promise((resolve, fail) => { finish = resolve; reject = fail; }),
      cancel() { this.cancelled = true; reject(Error("cancelled")); },
      finish() { finish(); },
    };
    animations.push(animation);
    return animation;
  }};
  return { state, element, animations, motion: createPageMotion(() => state.reduced) };
}

test("rapid page changes cancel the old fade without deferring the next destination", () => {
  const { motion, element, animations } = harness();
  let page = "home";
  const navigate = destination => { page = destination; motion.play(element); };
  navigate("puzzles");
  navigate("learn");
  assert.equal(page,"learn");
  assert.equal(animations.length,2);
  assert.equal(animations[0].cancelled,true);
  assert.equal(animations[1].cancelled,false);
  assert.equal(motion.running,true);
});
test("reduced motion cancels an active fade and starts no additional animation", async () => {
  const {state,element,motion,animations}=harness();
  motion.play(element);
  state.reduced=true;
  motion.play(element);
  assert.equal(animations.length,1);
  assert.equal(animations[0].cancelled,true);
  assert.equal(motion.running,false);
  await new Promise(resolve=>setImmediate(resolve));
});
test("missing animation support and removed content remain safe", () => {
  const {motion,element,animations}=harness();
  motion.play(element);
  motion.play(null);
  assert.equal(animations[0].cancelled,true);
  assert.equal(motion.running,false);
  assert.doesNotThrow(()=>motion.play({}));
  assert.doesNotThrow(()=>motion.play({animate(){throw Error("unavailable");}}));
  assert.equal(motion.running,false);
});
test("a finishing old fade cannot clear a newer fade, and unmount cancels pending motion", async () => {
  const {motion,element,animations}=harness();
  motion.play(element);
  animations[0].finish();
  motion.play(element);
  await Promise.resolve();
  assert.equal(motion.running,true);
  motion.dispose();
  assert.equal(animations[1].cancelled,true);
  assert.equal(motion.running,false);
  await new Promise(resolve=>setImmediate(resolve));
});
test("page fades use only opacity and leave no persistent style after completion", async () => {
  const {motion,element,animations}=harness();
  motion.play(element);
  assert.deepEqual(animations[0].frames,[{opacity:.15},{opacity:1}]);
  assert.ok(animations[0].options.duration<=250);
  assert.equal(animations[0].options.fill,undefined);
  animations[0].finish();
  await Promise.resolve();
  assert.equal(motion.running,false);
});
test("dropped pieces settle from the finger position, rather than jumping back to their source", () => {
  assert.deepEqual(dropOffset(36,225,225,50),{x:0,y:0});
  assert.deepEqual(dropOffset(36,234,219,50),{x:9,y:-6});
  assert.deepEqual(dropOffset(27,175,175,50),{x:0,y:0});
  assert.deepEqual(dropOffset(27,170,184,50),{x:-5,y:9});
});
