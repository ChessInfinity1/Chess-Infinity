import { Chess } from "chess.js";
export type ImportedGame = {
  id: string;
  pgn: string;
  white: string;
  black: string;
  result: string;
  source: string;
  date: string;
  whiteRating: number | null;
  blackRating: number | null;
  timeClass?: string;
  timeControl?: string;
  rated?: boolean;
  url?: string | null;
};
export function gameHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
export function normalizeImportedGame(
  item: any,
  platform: "chesscom" | "lichess",
): ImportedGame | null {
  if (
    !item.pgn ||
    (platform === "lichess" &&
      (["started", "created"].includes(item.status) ||
        item.variant !== "standard"))
  )
    return null;
  try {
    const g = new Chess();
    g.loadPgn(item.pgn, { strict: false });
    const h = g.getHeaders();
    if (!["1-0", "0-1", "1/2-1/2"].includes(h.Result)) return null;
    return {
      id: platform + "-" + (item.uuid || item.id || gameHash(item.pgn)),
      pgn: item.pgn,
      white: h.White || item.white?.username || "White",
      black: h.Black || item.black?.username || "Black",
      result: h.Result,
      source: platform === "chesscom" ? "Chess.com" : "Lichess",
      whiteRating: +h.WhiteElo || item.white?.rating || null,
      blackRating: +h.BlackElo || item.black?.rating || null,
      date: item.end_time
        ? new Date(item.end_time * 1000).toISOString()
        : item.createdAt
          ? new Date(item.createdAt).toISOString()
          : new Date().toISOString(),
      timeClass: item.time_class || item.speed || "unknown",
      timeControl: item.time_control || h.TimeControl || "",
      rated: item.rated,
      url: item.url || null,
    };
  } catch {
    return null;
  }
}
export function playerResult(
  game: ImportedGame,
  username: string,
): "win" | "loss" | "draw" | "unknown" {
  const name = username.toLowerCase();
  if (![game.white.toLowerCase(), game.black.toLowerCase()].includes(name))
    return "unknown";
  if (game.result === "1/2-1/2") return "draw";
  if (!["1-0", "0-1"].includes(game.result)) return "unknown";
  return game.result === (game.white.toLowerCase() === name ? "1-0" : "0-1")
    ? "win"
    : "loss";
}
export function publicUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const u = new URL(value);
    if (u.protocol === "https:" && !u.username && !u.password) return u.href;
  } catch {}
  return;
}
export function chessComUrl(value: unknown): string | undefined {
  const v = publicUrl(value);
  if (v && ["www.chess.com", "chess.com"].includes(new URL(v).hostname))
    return v;
}
export function profileCountry(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const code = value.split("/").pop()?.toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  } catch {
    return code;
  }
}

export function mergeImportedGames<T extends { id: string; date: string }>(
  existing: T[],
  incoming: T[],
  limit = Number.POSITIVE_INFINITY,
): T[] {
  return [...new Map([...existing, ...incoming].map((g) => [g.id, g])).values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
