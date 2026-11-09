import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { compareEvaluations, makeReviewRow, analyzeGame, numberedLine, evaluationText } from '../lib/chess/review.ts';
import { summarizeReview } from '../lib/chess/guided.ts';
const ev=(best,score=0,mate=null,depth=16,pv=[best])=>({best,score,mate,depth,pv});
const fen=new Chess().fen();
test('review loss uses the mover perspective for both colors',()=>{
  assert.equal(compareEvaluations(ev('e2e4',.3),ev('a2a3',-1.2),'w').loss,1.5);
  assert.equal(compareEvaluations(ev('e7e5',-.3),ev('f7f6',1.2),'b').loss,1.5);
});
test('retaining a forced mate is not penalized for taking longer, for either side',()=>{
  assert.deepEqual(compareEvaluations(ev('',100,2),ev('',100,8),'w'),{loss:0,mateChange:'preserved',unstable:false});
  assert.equal(compareEvaluations(ev('',-100,-2),ev('',-100,-8),'b').loss,0);
  assert.equal(compareEvaluations(ev('',-100,-2),ev('',-100,-8),'w').loss,0);
  assert.equal(compareEvaluations(ev('',0),ev('',-100,-1),'w').mateChange,'allowed');
  assert.equal(compareEvaluations(ev('',100,2),ev('',5),'w').mateChange,'missed');
  assert.match(evaluationText(ev('',-100,-2)),/Black can force mate in 2/);
  assert.equal(evaluationText(ev('',100,0)),'White checkmates');
});
test('review rejects missing and illegal engine lines; shallow and contradictory results are uncertain',()=>{
  assert.throws(()=>makeReviewRow(fen,'e4',1,ev('e2e5'),ev('e2e4')),/Invalid move/);
  assert.throws(()=>makeReviewRow(fen,'e4',1,ev('d2d4'),ev('e2e4',0,null,0)),/incomplete/);
  const shallow=makeReviewRow(fen,'e4',1,ev('d2d4',0,null,8),ev('e2e4',-3,null,8));
  assert.equal(shallow.label,'Uncertain'); assert.equal(shallow.reliable,false);
  const noisy=makeReviewRow(fen,'e4',1,ev('d2d4',0),ev('e2e4',1));
  assert.equal(noisy.label,'Uncertain');
  const good=makeReviewRow(fen,'e4',1,ev('d2d4',.3),ev('e2e4',.2));
  assert.equal(good.label,'Excellent'); assert.doesNotMatch(good.explanation,/gave away|blunder|lost/);
});
test('checkmating move is best; graph score and explanation preserve the winner',()=>{
  const g=new Chess(); g.loadPgn('1. f3 e5 2. g4');
  const r=makeReviewRow(g.fen(),'Qh4#',4,ev('d8h4',-100,-1),ev('d8h4',-100,0),true);
  assert.equal(r.loss,0); assert.equal(r.label,'Best'); assert.equal(r.played.mate,0);
  assert.match(r.explanation,/delivers checkmate/);
});
test('move labels and variations respect a Black-to-move custom FEN and actual fullmove number',()=>{
  const g=new Chess();g.move('e4'); const f=g.fen().replace(' 0 1',' 0 23');
  assert.match(numberedLine(f,['e7e5','g1f3']),/^23… e5 24\. Nf3$/);
  const r=makeReviewRow(f,'e5',1,ev('e7e5'),ev('e7e5'));
  assert.equal(r.color,'b'); assert.equal(r.moveNumber,23);
});
test('game review honors the selected budget, constrains the actual move, carries history, and verifies major losses',async()=>{
  const calls=[], results=[];
  const rows=await analyzeGame('1. e4 e5',async(f,ms,opt)=>{
    calls.push({f,ms,opt});
    return opt.searchMoves ? ev(opt.searchMoves[0],-2) : ev(opt.moves.length?'e7e5':'d2d4',0);
  },{ms:650,cancelled:()=>false,onRow:r=>results.push(r)});
  assert.equal(rows.length,2); assert.equal(rows[0].label,'Blunder');
  assert.ok(calls.some(c=>c.ms===1500 && c.opt.searchMoves?.[0]==='e2e4'));
  assert.ok(calls.some(c=>c.ms===650 && c.opt.moves.join(' ')==='e2e4'));
  assert.ok(calls.every(c=>c.opt.startFen===fen));
  assert.equal(results.length,2);
});
test('cancellation retains completed rows and never analyzes another move',async()=>{
  let stopped=false, searches=0;
  const rows=await analyzeGame('1. e4 e5 2. Nf3',async()=>{ searches++;return ev('e2e4'); },{ms:1500,cancelled:()=>stopped,onRow:()=>{stopped=true;}});
  assert.equal(rows.length,1);assert.equal(searches,1);
});
test('history-based repetition at the final move is scored as a draw',async()=>{
  const game='1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2';
  const g=new Chess();g.loadPgn(game);const h=g.history({verbose:true});
  const rows=await analyzeGame(game,async(f,ms,opt)=>{const m=h[opt.moves.length];return ev(m.from+m.to, .2);},{ms:1500,cancelled:()=>false,onRow:()=>{}});
  assert.equal(rows.length,8);assert.equal(rows.at(-1).score,0);assert.match(rows.at(-1).explanation,/draw by a board rule/);
});
test('uncertain and partial reviews cannot become complete-game statistics',()=>{
  const g=new Chess();g.move('e4');
  const r=makeReviewRow(fen,'e4',1,ev('e2e4',0,null,8),ev('e2e4',0,null,8));
  assert.equal(summarizeReview(g.pgn(),[r]),null);
  assert.equal(summarizeReview(g.pgn(),[]),null);
});
test('mate distance after a move accounts for whose mating move was just played',async()=>{
  const { afterMoveEvaluation }=await import('../lib/chess/review.ts');
  assert.equal(afterMoveEvaluation(ev('',100,3),'w').mate,2);
  assert.equal(afterMoveEvaluation(ev('',100,3),'b').mate,3);
  assert.equal(afterMoveEvaluation(ev('',-100,-3),'b').mate,-2);
  assert.equal(afterMoveEvaluation(ev('',100,0),'w').mate,0);
});
test('an incomplete engine finish retries both candidates once with an equal larger budget',async()=>{
  const {EngineResultError}=await import('../lib/chess/engine.ts');let fail=true;const calls=[];
  const rows=await analyzeGame('1. e4',async(f,ms,opt)=>{calls.push({ms,opt});if(fail){fail=false;throw new EngineResultError('incomplete');}return opt.searchMoves?ev('e2e4',.1):ev('d2d4',.2);},{ms:650,cancelled:()=>false,onRow:()=>{}});
  assert.equal(rows.length,1);assert.deepEqual(calls.map(c=>c.ms),[650,1500,1500]);
});
