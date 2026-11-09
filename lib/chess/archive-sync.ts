import { mergeImportedGames, normalizeImportedGame, type ImportedGame } from "./imported-games.ts";
import type { Progress } from "./content.ts";

export type ArchivePage = {
  profile: any;
  stats: any;
  games: ImportedGame[];
  syncedAt: string;
  nextCursor: string | null;
  archiveCount?: number;
  coverage?: string;
  rejected?: number;
};

export function parseChessComPage(raw: any): ArchivePage {
  if (!raw?.profile?.username || !Array.isArray(raw.games) ||
      (raw.nextCursor !== undefined && raw.nextCursor !== null && typeof raw.nextCursor !== "string"))
    throw new Error("Chess.com returned an unreadable archive. Please retry.");
  const games = raw.games.map((item: any) => normalizeImportedGame(item, "chesscom")).filter(Boolean) as ImportedGame[];
  return { ...raw, games, nextCursor: raw.nextCursor ?? null, rejected: raw.games.length - games.length };
}

export function chessComGames<T extends { source: string; white: string; black: string }>(games: T[], username: string): T[] {
  const name = username.toLowerCase();
  return games.filter((g) => g.source === "Chess.com" && [g.white.toLowerCase(), g.black.toLowerCase()].includes(name));
}

export function applyChessComPage(progress: Progress, page: ArchivePage, advanceHistory: boolean): Progress {
  const old = progress.accounts.chesscom;
  const same = old?.profile?.username?.toLowerCase() === page.profile.username.toLowerCase();
  const hasCursor = same && Object.prototype.hasOwnProperty.call(old, "nextCursor");
  const known = new Set(progress.games.map((game) => game.id));
  const missedRecentWindow = same && page.nextCursor !== null && page.games.length > 0 && page.games.every((game) => !known.has(game.id));
  const nextCursor = advanceHistory || !hasCursor || missedRecentWindow ? page.nextCursor : old.nextCursor;
  // A recent refresh must never throw away imported history or rewind its cursor.
  const { games, rejected, ...metadata } = page;
  return {
    ...progress,
    games: mergeImportedGames(progress.games, games),
    accounts: {
      ...progress.accounts,
      chesscom: {
        ...metadata,
        nextCursor,
        historyComplete: nextCursor === null,
      },
    },
  };
}

export type ArchiveCounts = { total: number; added: number; pages: number; rejected: number };
export async function syncChessComArchives({
  loadPage, onPage, existing, all, signal, startCursor,
}: {
  loadPage: (cursor?: string) => Promise<ArchivePage>;
  onPage: (page: ArchivePage, counts: ArchiveCounts) => void;
  existing: ImportedGame[];
  all: boolean;
  signal: AbortSignal;
  startCursor?: string;
}): Promise<ArchiveCounts> {
  let cursor = startCursor;
  let collection = existing;
  const initial = new Set(existing.map((g) => g.id));
  const seen = new Set<string>();
  const counts: ArchiveCounts = { total: existing.length, added: 0, pages: 0, rejected: 0 };
  do {
    signal.throwIfAborted();
    const key = cursor || "latest";
    if (seen.has(key)) throw new Error("The archive stopped advancing. Your imported games are saved; retry the sync.");
    seen.add(key);
    const page = await loadPage(cursor);
    signal.throwIfAborted();
    collection = mergeImportedGames(collection, page.games);
    counts.total = chessComGames(collection, page.profile.username).length;
    counts.added = collection.filter((g) => !initial.has(g.id)).length;
    counts.pages++;
    counts.rejected += page.rejected || 0;
    onPage(page, { ...counts });
    cursor = page.nextCursor || undefined;
  } while (all && cursor);
  return counts;
}
