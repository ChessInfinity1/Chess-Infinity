import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createClock, runClock, advanceClock, pauseClock, formatClock } from '../lib/chess/clock.ts';
import { squareAtPoint, legalBoardMove, adjacentSquare } from '../lib/chess/board-interaction.ts';
import { replayPosition } from '../lib/chess/game-state.ts';
test('subsecond bot replies and quick human moves both cost elapsed time', () => {
  let clock = runClock(createClock(60, 1000), 'w', 1000);
  clock = runClock(clock, 'b', 1250);
  clock = runClock(clock, 'w', 1680);
  clock = runClock(clock, 'b', 1780);
  clock = runClock(clock, 'w', 2000);
  assert.deepEqual(clock.remaining, [59650, 59350]);
  assert.equal(formatClock(clock.remaining[1]), '0:59.4');
});
test('background delay, pause, and flag use elapsed time, never interval count', () => {
  let clock = runClock(createClock(60, 0), 'b', 0);
  clock = advanceClock(clock, 32000);
  assert.deepEqual(clock.remaining, [60000, 28000]);
  clock = pauseClock(clock, 33000);
  clock = advanceClock(clock, 100000);
  assert.equal(clock.remaining[1], 27000);
  clock = runClock(clock, 'b', 100000);
  clock = runClock(clock, 'w', 130000);
  assert.equal(clock.flagged, 'b');
  assert.equal(clock.active, null);
  assert.equal(clock.remaining[1], 0);
});
test('clock never adds time when a timestamp moves backwards', () => {
  let clock = runClock(createClock(60, 1000), 'w', 1000);
  clock = advanceClock(clock, 1300);
  clock = advanceClock(clock, 1200);
  clock = advanceClock(clock, 1400);
  assert.equal(clock.remaining[0], 59600);
});
test('drag squares map correctly in both orientations, outside drops are rejected', () => {
  const r = { left: 40, top: 80, width: 320, height: 320 };
  assert.equal(squareAtPoint(60, 100, r), 'a8');
  assert.equal(squareAtPoint(60, 100, r, true), 'h1');
  assert.equal(squareAtPoint(220, 340, r), 'e2');
  assert.equal(squareAtPoint(220, 260, r), 'e4');
  for (const [x,y] of [[39,100],[360,100],[60,79],[60,400]]) assert.equal(squareAtPoint(x,y,r), null);
});
test('actual legal move validation rejects illegal and wrong-color drag destinations', () => {
  const fen = new Chess().fen();
  assert.equal(legalBoardMove(fen,'e2','e4','w')?.san, 'e4');
  assert.equal(legalBoardMove(fen,'e2','e5','w'), null);
  assert.equal(legalBoardMove(fen,'e7','e5','w'), null);
  assert.equal(legalBoardMove(fen,'e2','e4','b'), null);
  const promotion = '7k/P7/8/8/8/8/8/7K w - - 0 1';
  assert.ok(legalBoardMove(promotion,'a7','a8')?.promotion);
  const pinned = '4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1';
  assert.equal(legalBoardMove(pinned,'e2','f2'), null);
});
test('keyboard board navigation stops at each edge', () => {
  assert.equal(adjacentSquare(0,'ArrowLeft'),null);
  assert.equal(adjacentSquare(7,'ArrowRight'),null);
  assert.equal(adjacentSquare(0,'ArrowUp'),null);
  assert.equal(adjacentSquare(63,'ArrowDown'),null);
  assert.equal(adjacentSquare(56,'ArrowUp'),48);
});
test('analysis branches preserve the original PGN prefix and headers', () => {
  const g = new Chess();
  ['e4','e5','Nf3','Nc6'].forEach(m=>g.move(m));
  const branch = replayPosition(new Chess().fen(),g.history(),3,{ White:'Learner',Black:'Stockfish' });
  branch.move('d6');
  assert.deepEqual(branch.history(),['e4','e5','Nf3','d6']);
  const imported = new Chess(); imported.loadPgn(branch.pgn());
  assert.equal(imported.fen(),branch.fen());
  assert.equal(imported.getHeaders().White,'Learner');
});
test('replayed history retains threefold repetition and Black-to-move FEN', () => {
  const moves = ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'];
  assert.equal(replayPosition(new Chess().fen(),moves,moves.length).isThreefoldRepetition(),true);
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const g = replayPosition(fen,['e5','Nf3'],1); g.move('Nc3');
  assert.deepEqual(g.history(),['e5','Nc3']);
  assert.match(g.pgn(),/SetUp "1"/);
});
