import assert from "node:assert/strict";
import { test } from "node:test";
import { Chess } from "chess.js";
import { lessons, puzzles, openings } from "../lib/chess/content.ts";
test("every published exercise has a valid FEN and a legal solution", () => {
  for (const e of [...lessons, ...puzzles]) {
    const g = new Chess(e.fen);
    for (const u of e.line)
      assert.ok(
        g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }),
        e.id,
      );
    if (e.theme === "Mate in 1") assert.equal(g.isCheckmate(), true, e.id);
  }
});
test("every opening line is legal and PGN replays exactly", () => {
  for (const o of openings) {
    const g = new Chess();
    for (const s of o.line.split(" ")) g.move(s);
    const replay = new Chess();
    replay.loadPgn(g.pgn());
    assert.equal(g.fen(), replay.fen(), o.id);
  }
});
test("move generation matches standard depth-three perft", () => {
  const g = new Chess();
  function perft(d) {
    if (!d) return 1;
    let n = 0;
    for (const m of g.moves()) {
      g.move(m);
      n += perft(d - 1);
      g.undo();
    }
    return n;
  }
  assert.equal(perft(3), 8902);
});
test("castling, en passant, promotion, pins and draws obey rules", () => {
  let g = new Chess("r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1");
  g.move("O-O");
  assert.equal(g.get("f1").type, "r");
  assert.equal(g.get("g1").type, "k");
  g = new Chess("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
  g.move("exd6");
  assert.equal(g.get("d5"), undefined);
  g = new Chess("7k/1P6/6K1/8/8/8/8/8 w - - 0 1");
  g.move({ from: "b7", to: "b8", promotion: "n" });
  assert.equal(g.get("b8").type, "n");
  g = new Chess("4k3/4n3/8/8/8/8/8/K3R3 b - - 0 1");
  assert.throws(() => g.move("Nf5"));
  g = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.ok(g.isStalemate());
  g = new Chess("7k/8/6K1/8/8/8/8/8 w - - 0 1");
  assert.ok(g.isInsufficientMaterial());
  g = new Chess();
  assert.throws(() => g.move("e5"));
});
test("invalid PGN is rejected rather than silently imported", () =>
  assert.throws(() => new Chess().loadPgn("1. e4 e5 2. Qh9")));
const { terminalEvaluation, classification, accuracy } =
  await import("../lib/chess/engine.ts");
test("terminal engine evaluation preserves the winner and never penalizes a mating move", () => {
  assert.equal(
    terminalEvaluation(
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    ).score,
    -100,
  );
  assert.equal(terminalEvaluation("7k/6Q1/5K2/8/8/8/8/8 b - - 1 1").score, 100);
  assert.equal(terminalEvaluation("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").score, 0);
  assert.equal(terminalEvaluation(new Chess().fen()), null);
  assert.equal(classification(0, true), "Best");
  assert.equal(classification(2, false), "Blunder");
  assert.equal(accuracy([0, 0, 0]), 100);
});
