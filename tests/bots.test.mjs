import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { trainingBots, botById, beginnerMove, styledEngineMove, botReply, uci } from '../lib/chess/bots.ts';
import { Engine } from '../lib/chess/engine.ts';
const start=new Chess().fen();
const apply=(g,u)=>g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
test('eleven selectable opponents have unique identities, bounded settings and distinct policies',()=>{
  assert.equal(trainingBots.length,11);
  assert.equal(new Set(trainingBots.map(b=>b.id)).size,11);
  for(const b of trainingBots){assert.ok(b.skill>=0&&b.skill<=20);assert.ok(b.ms>=180&&b.ms<=1800);assert.ok(b.description&&b.tagline);}
  assert.equal(botById('unknown').id,'custom');
});
test('gentle bots play legal games for either color and handle check, en passant and promotion positions',()=>{
  for(const style of ['curious','learner']){
    for(const random of [()=>0,()=>.999,()=>.51]){
      const g=new Chess();
      for(let ply=0;ply<16&&!g.isGameOver();ply++) {const u=beginnerMove(g.fen(),style,random);assert.ok(u);assert.ok(apply(g,u));}
      for(const fen of ['7k/P7/8/8/8/8/8/7K w - - 0 1','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','4k3/8/8/8/8/8/4r3/4K3 w - - 0 1']){
        const g=new Chess(fen);assert.ok(apply(g,beginnerMove(fen,style,random)));
      }
    }
  }
  assert.equal(beginnerMove('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1','curious'),null);
});
test('simple bots recognize an immediate mate instead of choosing random alternatives',()=>{
  const fen='7k/8/5KQ1/8/8/8/8/8 w - - 0 1';
  for(const style of ['curious','learner']) {const g=new Chess(fen);apply(g,beginnerMove(fen,style,()=>.99));assert.equal(g.isCheckmate(),true);}
});
test('attacking and defensive profiles choose different equally scored legal candidates',()=>{
  const fen='r3k2r/ppp2ppp/2n5/3p4/3P4/2N5/PPP2PPP/R3K2R w KQkq - 0 1';
  const evaluation={best:'e1g1',score:0,mate:null,depth:12,pv:['e1g1'],lines:[{score:0,mate:null,depth:12,pv:['e1g1']},{score:0,mate:null,depth:12,pv:['c3d5']}]};
  assert.equal(styledEngineMove(fen,botById('atlas'),evaluation),'e1g1');
  assert.equal(styledEngineMove(fen,botById('ember'),evaluation),'c3d5');
  assert.equal(styledEngineMove(fen,botById('stockfish'),evaluation),'e1g1');
  const unsafe={...evaluation,lines:[evaluation.lines[0],{...evaluation.lines[1],score:-5}]};
  assert.equal(styledEngineMove(fen,botById('ember'),unsafe),'e1g1');
  assert.throws(()=>styledEngineMove(fen,botById('ember'),{...evaluation,best:'e1e8'}),/legal move/);
});
test('candidate score perspective is correct for Black and incomplete-depth lines are ignored',()=>{
  const g=new Chess();g.move('e4');const fen=g.fen();
  const r={best:'e7e5',score:-1,mate:null,depth:10,pv:['e7e5'],lines:[{score:-1,mate:null,depth:10,pv:['e7e5']},{score:5,mate:null,depth:10,pv:['d7d5']},{score:-20,mate:null,depth:9,pv:['b8c6']}]};
  assert.equal(styledEngineMove(fen,botById('ember'),r),'e7e5');
});
test('bot dispatch uses the selected strength/budget and custom skill, while beginners need no engine',async()=>{
  const calls=[];
  const analyze=async(...args)=>{calls.push(args);return {best:'e2e4',score:0,mate:null,depth:8,pv:['e2e4']};};
  for(const b of trainingBots.filter(b=>!['curious','learner'].includes(b.style))) {
    const u=await botReply(start,b,analyze,6); assert.equal(u,'e2e4');
    const [,ms,skill,count]=calls.at(-1);assert.equal(ms,b.ms);assert.equal(skill,b.id==='custom'?6:b.skill);assert.equal(count,b.style==='balanced'?1:4);
  }
  const count=calls.length;assert.ok(await botReply(start,botById('pip'),analyze));assert.equal(calls.length,count);
});
test('MultiPV parser preserves the primary evaluation, separates candidates, and resets to one line for analysis',async()=>{
  const original=globalThis.Worker;
  class FakeWorker {
    listeners=new Set();commands=[];
    addEventListener(t,fn){if(t==='message')this.listeners.add(fn);}
    removeEventListener(t,fn){this.listeners.delete(fn);}
    emit(data){for(const fn of [...this.listeners])fn({data});}
    postMessage(cmd){this.commands.push(cmd);if(cmd==='uci')queueMicrotask(()=>this.emit('uciok')); if(cmd.startsWith('go '))queueMicrotask(()=>{
      this.emit('info depth 12 multipv 1 score cp 42 pv e2e4 e7e5');
      this.emit('info depth 12 multipv 2 score cp 12 pv d2d4 d7d5');
      this.emit('info depth 13 multipv 2 score cp 90 lowerbound pv d2d4');
      this.emit('bestmove e2e4');
    });}
    terminate(){}
  }
  globalThis.Worker=FakeWorker;
  try{
    const e=new Engine();const r=await e.analyze(start,350,5,4);
    assert.equal(r.score,.42);assert.deepEqual(r.pv,['e2e4','e7e5']);assert.equal(r.lines.length,2);assert.equal(r.lines[1].score,.12);
    assert.ok(e.worker.commands.includes('setoption name MultiPV value 4'));
    await e.analyze(start,350);
    assert.ok(e.worker.commands.includes('setoption name MultiPV value 1'));e.destroy();
  }finally{globalThis.Worker=original;}
});
