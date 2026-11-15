import { Chess, type Color } from "chess.js";
import { replayPosition } from "./game-state.ts";

export type ReviewPracticeSeed = {
  pgn: string; fen: string; prefixPlies: number; player: Color;
  moveNumber: number; originalSan: string; originalUci: string;
  bestSan: string; bestUci: string;
};

export function reviewPracticeSeed(pgn: string, row: { ply: number; fen: string; san: string; color: Color; bestUci?: string }): ReviewPracticeSeed {
  const original = new Chess(); original.loadPgn(pgn, { strict: false });
  const history = original.history({ verbose: true });
  const move = history[row.ply - 1];
  if (!Number.isInteger(row.ply) || !move || move.before !== row.fen || move.san !== row.san || move.color !== row.color)
    throw new Error("This review position does not match the loaded game. Review the game again.");
  const prefix = replayPosition(history[0].before, history.map(item => item.san), row.ply - 1, original.getHeaders());
  if (prefix.isGameOver()) throw new Error("This position has already ended. Choose an earlier move.");
  let bestSan = "", bestUci = "";
  if (row.bestUci) {
    try { bestSan = new Chess(prefix.fen()).move({ from: row.bestUci.slice(0, 2), to: row.bestUci.slice(2, 4), promotion: row.bestUci[4] }).san; bestUci = row.bestUci; }
    catch { /* Practice remains available without a verified hint. */ }
  }
  return { pgn: prefix.pgn(), fen: prefix.fen(), prefixPlies: row.ply - 1, player: move.color, moveNumber: +move.before.split(" ")[5], originalSan: move.san, originalUci: move.from + move.to + (move.promotion || ""), bestSan, bestUci };
}

// This branch owns its own history. No method can edit the imported game or
// take back a move before the selected position. Tokens reject stale bot replies.
export class ReviewPracticeSession {
  readonly seed: ReviewPracticeSeed;
  private branch: string[] = [];
  private request = 0;
  constructor(seed: ReviewPracticeSeed) { this.seed = seed; }
  get line() { return [...this.branch]; }
  board() {
    const board = new Chess(); board.loadPgn(this.seed.pgn, { strict: false });
    for (const uci of this.branch) board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return board;
  }
  cancel() { this.request++; }
  restart() { this.cancel(); this.branch = []; }
  takeBack() {
    this.cancel();
    this.branch = this.branch.slice(0, Math.max(0, this.branch.length - (this.branch.length % 2 ? 1 : 2)));
  }
  play(from: string, to: string, promotion?: string) {
    const board = this.board();
    if (board.isGameOver() || board.turn() !== this.seed.player) throw new Error("Wait for your turn before playing.");
    const move = board.move({ from, to, promotion });
    this.cancel(); this.branch.push(move.from + move.to + (move.promotion || ""));
    return move;
  }
  async reply(choose: (board: Chess) => Promise<string | null>) {
    const board = this.board();
    if (board.isGameOver() || board.turn() === this.seed.player) return false;
    const token = ++this.request;
    const uci = await choose(board);
    if (token !== this.request) return false;
    if (!uci || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error("The bot could not finish its reply. Try again.");
    const move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    this.branch.push(move.from + move.to + (move.promotion || "")); this.cancel();
    return true;
  }
}
