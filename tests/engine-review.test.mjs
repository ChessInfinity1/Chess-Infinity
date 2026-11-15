import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {Engine} from '../lib/chess/engine.ts';
test('UCI candidate searches transmit full legal history and convert Black scores to White perspective',async()=>{
  const original=globalThis.Worker;
  class FakeWorker {
    listeners=new Set(); commands=[];
    addEventListener(t,fn){if(t==='message')this.listeners.add(fn);}
    removeEventListener(t,fn){this.listeners.delete(fn);}
    emit(data){for(const fn of [...this.listeners])fn({data});}
    postMessage(cmd){this.commands.push(cmd);if(cmd==='uci')queueMicrotask(()=>this.emit('uciok'));if(cmd.startsWith('go '))queueMicrotask(()=>{this.emit('info depth 16 score cp 150 pv e7e5 g1f3');this.emit('bestmove e7e5');});}
    terminate(){}
  }
  globalThis.Worker=FakeWorker;
  let engine;
  try {
    engine=new Engine();const g=new Chess();const start=g.fen();g.move('e4');
    const result=await engine.analyze(g.fen(),1500,20,1,{startFen:start,moves:['e2e4'],searchMoves:['e7e5']});
    assert.equal(result.score,-1.5);
    assert.ok(engine.worker.commands.includes('position fen '+start+' moves e2e4'));
    assert.ok(engine.worker.commands.includes('go movetime 1500 searchmoves e7e5'));
    await assert.rejects(engine.analyze(g.fen(),1500,20,1,{searchMoves:['e7e4']}),/Invalid move/);
    await assert.rejects(engine.analyze(g.fen(),1500,20,1,{startFen:start,moves:[]}),/history does not match/);
  }finally{engine?.destroy();globalThis.Worker=original;}
});
test('an absent score or mismatched principal variation cannot become a zero-loss best move',async()=>{
  const original=globalThis.Worker;
  class FakeWorker {
    listeners=new Set();mode='missing';
    addEventListener(t,fn){if(t==='message')this.listeners.add(fn);}
    removeEventListener(t,fn){this.listeners.delete(fn);}
    emit(data){for(const fn of [...this.listeners])fn({data});}
    postMessage(cmd){if(cmd==='uci')queueMicrotask(()=>this.emit('uciok'));if(cmd.startsWith('go '))queueMicrotask(()=>{if(this.mode==='mismatch')this.emit('info depth 14 score cp 10 pv d2d4');this.emit('bestmove e2e4');});}
    terminate(){}
  }
  globalThis.Worker=FakeWorker;let engine;
  try{engine=new Engine();await assert.rejects(engine.analyze(new Chess().fen()),/usable evaluation/);engine.worker.mode='mismatch';await assert.rejects(engine.analyze(new Chess().fen()),/usable evaluation/);}
  finally{engine?.destroy();globalThis.Worker=original;}
});

test('late shallower info and bundled UCI lines cannot overwrite the completed evaluation',async()=>{
 const original=globalThis.Worker;
 class FakeWorker{
  listeners=new Set();addEventListener(t,f){this.listeners.add(f);}removeEventListener(t,f){this.listeners.delete(f);}
  emit(data){for(const f of [...this.listeners])f({data});}
  postMessage(cmd){if(cmd==='uci')queueMicrotask(()=>this.emit('uciok'));if(cmd.startsWith('go '))queueMicrotask(()=>this.emit('info depth 16 score cp 25 pv e2e4 e7e5\ninfo depth 2 score cp -900 pv e2e4\nbestmove e2e4'));}
  terminate(){}
 }
 globalThis.Worker=FakeWorker;let engine;
 try{engine=new Engine();const result=await engine.analyze(new Chess().fen());assert.equal(result.depth,16);assert.equal(result.score,.25);}
 finally{engine?.destroy();globalThis.Worker=original;}
});
