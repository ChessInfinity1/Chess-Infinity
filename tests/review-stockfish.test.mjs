import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {Engine} from '../lib/chess/engine.ts';
import {analyzeGame} from '../lib/chess/review.ts';
// Exercise the shipped engine version, not canned evaluations. The adapter only
// translates browser Worker messaging to the package's Node UCI process.
class StockfishWorker {
 listeners=new Set();
 constructor(){this.child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/stockfish/bin/stockfish-19-lite-single.js',import.meta.url))],{stdio:['pipe','pipe','pipe']});this.reader=createInterface({input:this.child.stdout});this.reader.on('line',data=>{for(const fn of this.listeners)fn({data});});this.child.on('error',()=>this.onerror?.());this.child.stderr.resume();}
 addEventListener(type,fn){if(type==='message')this.listeners.add(fn);}
 removeEventListener(type,fn){this.listeners.delete(fn);}
 postMessage(command){/* Fixed depth avoids machine-speed and concurrent-CI timing changing the fixture. */ this.child.stdin.write(command.replace(/^go movetime \d+/, 'go depth 14')+'\n');}
 terminate(){this.reader.close();this.child.kill();}
}
test('real Stockfish distinguishes sound opening play from allowing immediate mate for both sides',{timeout:45000},async()=>{
 const original=globalThis.Worker;globalThis.Worker=StockfishWorker;const engine=new Engine();
 const run=pgn=>analyzeGame(pgn,(fen,ms,options)=>engine.analyze(fen,ms,20,1,options),{ms:350,cancelled:()=>false,onRow:()=>{}});
 try{
  const opening=await run('1. e4 e5 2. Nf3 Nc6');
  assert.equal(opening.length,4);assert.ok(opening.every(row=>row.label!=='Blunder'&&row.label!=='Mistake'));assert.ok(opening.some(row=>row.reliable));
  const mate=await run('1. f3 e5 2. g4 Qh4#');
  assert.equal(mate[2].label,'Blunder');assert.equal(mate[3].label,'Best');assert.equal(mate[3].chanceLoss,0);
  const whiteMate=await run('1. e4 f6 2. d4 g5 3. Qh5#');
  assert.equal(whiteMate[3].label,'Blunder');assert.equal(whiteMate[4].label,'Best');
 }finally{engine.destroy();globalThis.Worker=original;}
});
