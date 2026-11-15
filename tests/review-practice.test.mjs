import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { reviewPracticeSeed, ReviewPracticeSession } from "../lib/chess/review-practice.ts";

function fixture(pgn, ply, bestUci) {
 const original = new Chess(); original.loadPgn(pgn, {strict:false});
 const move = original.history({verbose:true})[ply-1];
 const seed = reviewPracticeSeed(original.pgn(), {ply, fen:move.before, san:move.san, color:move.color, bestUci});
 return { original, seed, session:new ReviewPracticeSession(seed) };
}
test("review practice starts before the selected move for White and Black and preserves the imported game", async()=>{
 for (const [ply,from,to,reply] of [[1,"d2","d4","d7d5"],[2,"c7","c5","g1f3"]]) {
  const {original,seed,session}=fixture('[White "Learner"]\n[Black "Opponent"]\n1. e4 e5 2. Nf3 Nc6',ply);
  const saved=original.pgn();
  assert.equal(session.board().fen(),original.history({verbose:true})[ply-1].before);
  assert.equal(seed.player,ply===1?"w":"b");
  session.play(from,to);await session.reply(async()=>reply);
  assert.equal(session.board().turn(),seed.player);
  assert.equal(session.line.length,2);assert.equal(original.pgn(),saved);
  session.takeBack();assert.equal(session.board().fen(),seed.fen);assert.deepEqual(session.line,[]);
  session.takeBack();assert.equal(session.board().history().length,seed.prefixPlies);
 }
});
test("practice retains custom move numbers, castling rights, en passant, promotions and repetition history",()=>{
 const castle=fixture('[SetUp "1"]\n[FEN "r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 23"]\n23... O-O',1);
 assert.equal(castle.seed.player,"b");assert.equal(castle.seed.moveNumber,23);
 assert.equal(castle.session.play("e8","c8").san,"O-O-O");
 const ep=fixture('1. e4 a6 2. e5 d5 3. exd6',5);
 assert.equal(ep.session.play("e5","d6").captured,"p");
 const promotion=fixture('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/7K/8 w - - 0 23"]\n23. a8=Q+',1);
 assert.equal(promotion.session.play("a7","a8","n").promotion,"n");
 const repeated=fixture('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8',8);
 repeated.session.play("f6","g8");assert.equal(repeated.session.board().isThreefoldRepetition(),true);
});
test("restart, takeback and exit cancellation reject late bot replies",async()=>{
 for(const action of ["restart","takeBack","cancel"]){
  const {session}=fixture('1. e4 e5',1);session.play("d2","d4");
  let resolve;const pending=session.reply(()=>new Promise(done=>{resolve=done;}));
  session[action]();const before=session.board().fen();resolve("d7d5");
  assert.equal(await pending,false);assert.equal(session.board().fen(),before);
 }
});
test("practice rejects mismatched review rows, illegal replies, wrong-side input and moves after mate",async()=>{
 const {original,seed,session}=fixture('1. e4 e5',1);
 assert.throws(()=>reviewPracticeSeed(original.pgn(),{ply:2,fen:seed.fen,san:"e5",color:"b"}),/does not match/);
 session.play("e2","e4");assert.throws(()=>session.play("g1","f3"),/Wait for your turn/);
 await assert.rejects(session.reply(async()=>"e7e4"),/Invalid move/);
 assert.equal(session.line.length,1);
 const mate=fixture('1. f3 e5 2. g4 Qh4#',4);mate.session.play("d8","h4");
 assert.equal(mate.session.board().isCheckmate(),true);
 assert.throws(()=>mate.session.play("a7","a6"),/Wait for your turn/);
 let called=false;await mate.session.reply(async()=>{called=true;return "a2a3";});assert.equal(called,false);
});
