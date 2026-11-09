import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../lib/chess/engine.ts";
import { Chess } from "chess.js";
test("destroying an active engine rejects its pending search and releases the queue promptly", async () => {
  const original = globalThis.Worker;
  class FakeWorker {
    listeners = new Set();
    terminated = false;
    addEventListener(type, fn) {
      if (type === "message") this.listeners.add(fn);
    }
    removeEventListener(type, fn) {
      this.listeners.delete(fn);
    }
    postMessage(cmd) {
      if (cmd === "uci") queueMicrotask(() => this.emit("uciok"));
    }
    emit(data) {
      for (const fn of [...this.listeners]) fn({ data });
    }
    terminate() {
      this.terminated = true;
    }
  }
  globalThis.Worker = FakeWorker;
  try {
    const engine = new Engine();
    await engine.ready;
    const search = engine.analyze(new Chess().fen(), 450);
    const rejected = assert.rejects(search, /cancelled/);
    await new Promise((resolve) => setImmediate(resolve));
    engine.destroy();
    await rejected;
    assert.equal(engine.worker.terminated, true);
    assert.equal(engine.cancelActive, null);
    await assert.rejects(engine.analyze(new Chess().fen()), /cancelled/);
  } finally {
    globalThis.Worker = original;
  }
});
test("a timed-out worker is terminated so its late bestmove cannot leak into a queued search", async () => {
  const originalWorker = globalThis.Worker;
  const originalTimeout = globalThis.setTimeout;
  let timeout;
  class FakeWorker {
    listeners = new Set(); terminated = false;
    addEventListener(type,fn) { if(type==='message') this.listeners.add(fn); }
    removeEventListener(type,fn) { this.listeners.delete(fn); }
    postMessage(cmd) { if(cmd==='uci') queueMicrotask(()=>this.emit('uciok')); }
    emit(data) { for(const fn of [...this.listeners]) fn({data}); }
    terminate() { this.terminated=true; }
  }
  globalThis.Worker=FakeWorker;
  globalThis.setTimeout=(fn,ms,...args)=> {
    if(ms===10000) { timeout=fn; return 0; }
    return originalTimeout(fn,ms,...args);
  };
  try {
    const engine=new Engine(); await engine.ready;
    const first=engine.analyze(new Chess().fen(),350);
    const firstRejected=assert.rejects(first,/timed out/);
    const second=engine.analyze(new Chess().fen(),350);
    const secondRejected=assert.rejects(second,/cancelled/);
    await new Promise(r=>setImmediate(r));
    assert.equal(typeof timeout,'function'); timeout();
    engine.worker.emit('bestmove e2e4');
    await Promise.all([firstRejected,secondRejected]);
    assert.equal(engine.dead,true); assert.equal(engine.worker.terminated,true);
  } finally { globalThis.Worker=originalWorker; globalThis.setTimeout=originalTimeout; }
});
