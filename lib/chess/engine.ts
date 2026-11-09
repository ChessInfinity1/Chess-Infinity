import { Chess } from "chess.js";
export type EngineLine = { score: number; mate: number | null; depth: number; pv: string[] };
export type Evaluation = {
  best: string;
  score: number;
  mate: number | null;
  depth: number;
  pv: string[];
  lines?: EngineLine[];
};
export class EngineResultError extends Error {}
export type SearchOptions = {
  startFen?: string;
  moves?: string[];
  searchMoves?: string[];
};
export function terminalEvaluation(fen: string): Evaluation | null {
  const position = new Chess(fen);
  if (position.isCheckmate())
    return {
      best: "",
      score: position.turn() === "w" ? -100 : 100,
      mate: 0,
      depth: 0,
      pv: [],
    };
  if (position.isDraw())
    return { best: "", score: 0, mate: null, depth: 0, pv: [] };
  return null;
}
export class Engine {
  worker: Worker;
  ready: Promise<void>;
  queue = Promise.resolve();
  dead = false;
  cancelActive: (() => void) | null = null;
  cancelReady: (() => void) | null = null;
  constructor() {
    this.worker = new Worker("/engine/stockfish-19-lite-single.js");
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => (
          (this.dead = true),
          this.worker.terminate(),
          reject(
            new Error(
              "Stockfish could not start. Reload or try a WebAssembly-compatible browser.",
            ),
          )
        ),
        20000,
      );
      this.cancelReady = () => {
        clearTimeout(timer);
        reject(new Error("Analysis cancelled."));
      };
      this.worker.onerror = () => {
        this.dead = true;
        this.cancelActive?.();
        this.worker.terminate();
        clearTimeout(timer);
        reject(new Error("Stockfish failed to load."));
      };
      const on = (e: MessageEvent) => {
        if (String(e.data).includes("uciok")) {
          clearTimeout(timer);
          this.cancelReady = null;
          this.worker.removeEventListener("message", on);
          this.worker.postMessage("setoption name Hash value 16");
          resolve();
        }
      };
      this.worker.addEventListener("message", on);
      this.worker.postMessage("uci");
    });
  }
  async analyze(fen: string, ms = 550, skill = 20, multiPV = 1, options: SearchOptions = {}): Promise<Evaluation> {
    // Replay the history so Stockfish can see repetitions, rather than only a FEN.
    const position = new Chess(options.startFen || fen);
    for (const u of options.moves || []) position.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    if (position.fen() !== fen) throw new Error("Engine history does not match the position.");
    for (const u of options.searchMoves || []) {
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) throw new Error("Invalid engine candidate move.");
      new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    }
    const terminal = terminalEvaluation(fen);
    if (terminal) return terminal;
    let done!: () => void;
    const previous = this.queue;
    this.queue = new Promise((r) => (done = r));
    await previous;
    try {
      await this.ready;
      if (this.dead) throw new Error("Analysis cancelled.");
      return await new Promise((resolve, reject) => {
        let result: Evaluation = {
          best: "",
          score: 0,
          mate: null,
          depth: 0,
          pv: [],
        };
        const lines = new Map<number, EngineLine>();
        const cleanup = () => {
          this.cancelActive = null;
          clearTimeout(timer);
          this.worker.removeEventListener("message", on);
        };
        const on = (e: MessageEvent) => {
          const line = String(e.data);
          if (line.startsWith("info ") && line.includes(" pv ")) {
            const depth = +(line.match(/depth (\d+)/)?.[1] || 0);
            const cp = line.match(/score cp (-?\d+)/);
            const mate = line.match(/score mate (-?\d+)/);
            const sign = fen.split(" ")[1] === "w" ? 1 : -1;
            const rank = +(line.match(/multipv (\d+)/)?.[1] || 1);
            if (/\b(lowerbound|upperbound)\b/.test(line)) return;
            const candidate: EngineLine = {
              score: cp ? (+cp[1] * sign) / 100 : mate ? (+mate[1] > 0 ? 100 : -100) * sign : 0,
              mate: mate ? +mate[1] * sign : null,
              depth,
              pv: line.split(" pv ")[1].trim().split(" "),
            };
            if (cp || mate) {
              if (depth >= (lines.get(rank)?.depth || 0)) lines.set(rank, candidate);
              if (rank === 1) result = { ...result, ...candidate };
            }
          }
          if (line.startsWith("bestmove ")) {
            cleanup();
            const best = line.split(" ")[1];
            try {
              const board = new Chess(fen);
              board.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
              if (!result.depth || !result.pv.length || !Number.isFinite(result.score))
                throw new Error("Missing evaluation");
              if (options.searchMoves?.length && !options.searchMoves.includes(best))
                throw new Error("Unexpected candidate");
              if (skill === 20 && result.pv[0] !== best)
                throw new Error("Inconsistent engine line");
              resolve({ ...result, best, lines: [...lines.values()] });
            } catch {
              reject(new EngineResultError("Stockfish did not return a usable evaluation. Retry with more thinking time."));
            }
          }
        };
        const timer = setTimeout(
          () => {
            cleanup();
            this.dead = true;
            this.worker.terminate();
            reject(new Error("Engine timed out. Try again."));
          },
          Math.max(10000, ms + 6000),
        );
        this.cancelActive = () => {
          cleanup();
          reject(new Error("Analysis cancelled."));
        };
        this.worker.addEventListener("message", on);
        this.worker.postMessage("setoption name MultiPV value " + Math.max(1, Math.min(4, Math.floor(multiPV))));
        this.worker.postMessage("setoption name UCI_LimitStrength value false");
        this.worker.postMessage("setoption name Skill Level value " + skill);
        this.worker.postMessage("position fen " + (options.startFen || fen) + ((options.moves?.length) ? " moves " + options.moves.join(" ") : ""));
        this.worker.postMessage("go movetime " + ms + (options.searchMoves?.length ? " searchmoves " + options.searchMoves.join(" ") : ""));
      });
    } finally {
      done();
    }
  }
  destroy() {
    this.dead = true;
    this.cancelReady?.();
    this.cancelReady = null;
    this.cancelActive?.();
    this.worker.terminate();
  }
}
export function classification(loss: number, best: boolean) {
  return best
    ? "Best"
    : loss < 0.15
      ? "Excellent"
      : loss < 0.5
        ? "Good"
        : loss < 1
          ? "Inaccuracy"
          : loss < 2
            ? "Mistake"
            : "Blunder";
}
export function accuracy(losses: number[]) {
  return losses.length
    ? Math.round(
        losses.reduce((s, x) => s + 100 * Math.exp(-Math.max(0, x) / 3), 0) /
          losses.length,
      )
    : 0;
}
