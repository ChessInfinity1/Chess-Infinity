import { Chess, type Color } from "chess.js";
import { gameHash, type ImportedGame } from "./imported-games.ts";
import type { Evaluation } from "./engine.ts";
export type RevengePosition = {
  id: string;
  gameId: string;
  pgnHash: string;
  white: string;
  black: string;
  source: string;
  ply: number;
  color: Color;
  fen: string;
  played: string;
  playedUci: string;
  bestUci: string;
  line: string[];
  loss: number;
  label: string;
  theme: string;
  explanation: string;
  depth: number;
  createdAt: string;
};
export type RevengeRecord = {
  attempts: number;
  solves: number;
  cleanDays: string[];
  dueAt: string;
  lastAttemptAt: string;
  xpDay: string;
};
export type RevengeProgress = {
  positions: RevengePosition[];
  records: Record<string, RevengeRecord>;
};
export const emptyRevenge: RevengeProgress = { positions: [], records: {} };
export function gameSide(
  game: Pick<ImportedGame, "white" | "black">,
  accounts: Record<string, any>,
): Color | null {
  const names = Object.values(accounts)
    .map((a) => String(a?.profile?.username || "").toLowerCase())
    .filter(Boolean);
  const white = names.includes(game.white.toLowerCase()),
    black = names.includes(game.black.toLowerCase());
  return white === black ? null : white ? "w" : "b";
}
export function replayCompletedGame(
  game: Pick<ImportedGame, "pgn" | "result">,
) {
  if (!["1-0", "0-1", "1/2-1/2"].includes(game.result))
    throw new Error(
      "Choose a completed game. Revenge training never analyzes a live game.",
    );
  const g = new Chess();
  g.loadPgn(game.pgn, { strict: false });
  const h = g.getHeaders();
  if (h.Result && h.Result !== "*" && h.Result !== game.result)
    throw new Error("The game result does not match its PGN.");
  const moves = g.history({ verbose: true });
  if (!moves.length) throw new Error("This game has no moves to review.");
  return moves;
}
export function legalVariation(fen: string, pv: string[]) {
  const g = new Chess(fen);
  const line: string[] = [];
  for (const u of pv.slice(0, 7)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) break;
    try {
      g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      line.push(u);
    } catch {
      break;
    }
  }
  return line;
}
export function moveName(fen: string, uci: string) {
  const g = new Chess(fen);
  return g.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  }).san;
}
export function evaluationLoss(
  before: Evaluation,
  after: Evaluation,
  color: Color,
) {
  const sign = color === "w" ? 1 : -1;
  return Math.max(
    0,
    (Math.max(-10, Math.min(10, before.score)) -
      Math.max(-10, Math.min(10, after.score))) *
      sign,
  );
}
export function positionFromRow(
  game: ImportedGame,
  row: any,
  color: Color,
  at = new Date().toISOString(),
): RevengePosition | null {
  try {
    if (
      row.reliable === false ||
      !Number.isInteger(row.ply) ||
      row.ply < 1 ||
      !Number.isFinite(row.loss) ||
      (row.loss < 1 && row.label !== "Missed mate")
    )
      return null;
    const history = replayCompletedGame(game);
    const played = history[row.ply - 1];
    if (
      !played ||
      played.color !== color ||
      played.before !== row.fen ||
      played.san !== row.san
    )
      return null;
    const playedUci = played.from + played.to + (played.promotion || "");
    const best = String(row.bestUci || "");
    if (best === playedUci) return null;
    const line = legalVariation(
      row.fen,
      Array.isArray(row.pv) && row.pv[0] === best ? row.pv : [best],
    );
    if (!line.length) return null;
    return {
      id: "revenge-" + gameHash(game.pgn) + "-" + row.ply,
      gameId: game.id,
      pgnHash: gameHash(game.pgn),
      white: game.white,
      black: game.black,
      source: game.source,
      ply: row.ply,
      color,
      fen: row.fen,
      played: played.san,
      playedUci,
      bestUci: best,
      line,
      loss: Math.min(20, row.loss),
      label:
        row.label === "Missed mate"
          ? "Missed mate"
          : row.loss >= 2
            ? "Blunder"
            : "Mistake",
      theme: String(row.theme || "Calculation").slice(0, 80),
      explanation: String(
        row.explanation ||
          "Compare your move with the engine continuation. Look for the first threat your move overlooked.",
      ).slice(0, 600),
      depth: Number.isInteger(row.depth) ? Math.max(0, row.depth) : 0,
      createdAt: at,
    };
  } catch {
    return null;
  }
}
export function positionsFromReport(
  game: ImportedGame,
  report: any,
  color: Color,
) {
  if (!report || !Array.isArray(report.rows)) return [];
  try {
    const pgn = new Chess();
    pgn.loadPgn(report.pgn);
    const actual = new Chess();
    actual.loadPgn(game.pgn);
    if (
      pgn.history().join(" ") !== actual.history().join(" ") ||
      pgn.history({ verbose: true })[0]?.before !==
        actual.history({ verbose: true })[0]?.before
    )
      return [];
  } catch {
    return [];
  }
  return report.rows
    .map((r: any) =>
      positionFromRow(game, r, color, report.date || new Date().toISOString()),
    )
    .filter((p: RevengePosition | null): p is RevengePosition => !!p)
    .slice(0, 40);
}
export function mergeRevenge(
  previous: RevengeProgress | undefined,
  incoming: RevengePosition[],
): RevengeProgress {
  const p = previous || emptyRevenge;
  const positions = [
    ...new Map([...p.positions, ...incoming].map((x) => [x.id, x])).values(),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 120);
  const ids = new Set(positions.map((x) => x.id));
  return {
    positions,
    records: Object.fromEntries(
      Object.entries(p.records).filter(([id]) => ids.has(id)),
    ),
  };
}
export function recordRevenge(
  previous: RevengeProgress | undefined,
  id: string,
  clean: boolean,
  now = new Date(),
) {
  const p = previous || emptyRevenge;
  if (!p.positions.some((x) => x.id === id)) return { progress: p, xp: 0 };
  const old = p.records[id];
  const day = now.toLocaleDateString("en-CA");
  const cleanDays = clean
    ? [...new Set([...(old?.cleanDays || []), day])].slice(-5)
    : [];
  const interval = clean
    ? [1, 3, 7, 14, 30][Math.min(4, cleanDays.length - 1)]
    : 0;
  const xp = clean && old?.xpDay !== day ? 15 : 0;
  return {
    progress: {
      ...p,
      records: {
        ...p.records,
        [id]: {
          attempts: (old?.attempts || 0) + 1,
          solves: (old?.solves || 0) + 1,
          cleanDays,
          dueAt: new Date(now.getTime() + interval * 86400000).toISOString(),
          lastAttemptAt: now.toISOString(),
          xpDay: xp ? day : old?.xpDay || "",
        },
      },
    },
    xp,
  };
}
export async function reviewGameForRevenge(
  game: ImportedGame,
  color: Color,
  analyze: (fen: string, ms: number) => Promise<Evaluation>,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
) {
  const history = replayCompletedGame(game);
  const own = history
    .slice(0, 300)
    .map((m, i) => ({ m, ply: i + 1 }))
    .filter((x) => x.m.color === color);
  const found: RevengePosition[] = [];
  let done = 0;
  for (const { m, ply } of own) {
    if (isCancelled()) break;
    const before = await analyze(m.before, 450);
    if (isCancelled()) break;
    const actual = m.from + m.to + (m.promotion || "");
    if (actual !== before.best) {
      const after = await analyze(m.after, 450);
      if (isCancelled()) break;
      const loss = evaluationLoss(before, after, color);
      const sign = color === "w" ? 1 : -1;
      const missed =
        before.mate !== null &&
        before.mate * sign > 0 &&
        (after.mate === null || after.mate * sign <= 0);
      const label = missed ? "Missed mate" : loss >= 2 ? "Blunder" : "Mistake";
      const g = new Chess(m.before);
      const bestMove = legalVariation(m.before, [before.best])[0];
      if (bestMove) {
        const target = g.move({
          from: bestMove.slice(0, 2),
          to: bestMove.slice(2, 4),
          promotion: bestMove[4],
        });
        const theme = missed
          ? "Missed checkmates"
          : target.captured
            ? "Piece safety"
            : new Chess(m.before).board().flat().filter(Boolean).length <= 10
              ? "Endgame decisions"
              : ply <= 20
                ? "Opening decisions"
                : "Calculation";
        const p = positionFromRow(
          game,
          {
            ply,
            san: m.san,
            fen: m.before,
            bestUci: before.best,
            pv: before.pv,
            loss,
            label,
            theme,
            depth: Math.min(before.depth, after.depth),
            explanation: missed
              ? "A forced mate was available before your move. Compare forcing checks and the opponent’s strongest defenses."
              : `The saved search preferred ${target.san}. Replay its verified continuation, then compare the checks, captures, and threats after your original move.`,
          },
          color,
        );
        if (p) found.push(p);
      }
    }
    onProgress(++done, own.length);
  }
  return {
    positions: found.sort((a, b) => b.loss - a.loss).slice(0, 40),
    reviewed: done,
    total: own.length,
    limited: history.length > 300,
    cancelled: isCancelled(),
  };
}
