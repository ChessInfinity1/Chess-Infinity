import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeImportedGame,
  playerResult,
  publicUrl,
  chessComUrl,
  profileCountry,
} from "../lib/chess/imported-games.ts";
test("profile games retain legal PGNs, ratings, clocks, and actual player results", () => {
  const item = {
    uuid: "mate",
    rules: "chess",
    end_time: 1794059762,
    time_class: "rapid",
    time_control: "600",
    rated: true,
    pgn: '[White "EliamGM"]\n[Black "Opponent"]\n[WhiteElo "500"]\n[BlackElo "490"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1',
  };
  const g = normalizeImportedGame(item, "chesscom");
  assert.ok(g);
  assert.equal(g.whiteRating, 500);
  assert.equal(g.timeClass, "rapid");
  assert.equal(g.timeControl, "600");
  assert.equal(playerResult(g, "eliamgm"), "loss");
  assert.equal(playerResult(g, "opponent"), "win");
  assert.equal(playerResult(g, "SomeoneElse"), "unknown");
  assert.equal(
    normalizeImportedGame({ ...item, pgn: "1. Qh9" }, "chesscom"),
    null,
  );
  assert.equal(
    normalizeImportedGame(
      { ...item, pgn: '[Result "*"]\n\n1. e4 *' },
      "chesscom",
    ),
    null,
  );
});
test("public profile links and images reject scripts, credentials, and false Chess.com hosts", () => {
  assert.equal(publicUrl("javascript:alert(1)"), undefined);
  assert.equal(publicUrl("https://name:secret@example.test"), undefined);
  assert.equal(chessComUrl("https://chess.com.evil.test/game"), undefined);
  assert.equal(
    chessComUrl("https://www.chess.com/game/live/123"),
    "https://www.chess.com/game/live/123",
  );
  assert.equal(
    profileCountry("https://api.chess.com/pub/country/US"),
    "United States",
  );
});
const { mergeImportedGames } = await import("../lib/chess/imported-games.ts");
test("re-syncing upgrades old game metadata without duplicates or losing saved games", () => {
  const old = { id: "old-game", date: "2026-11-01", pgn: "saved" };
  const legacy = { id: "same-game", date: "2026-11-02", pgn: "game" };
  const fresh = { ...legacy, timeClass: "rapid", whiteRating: 241 };
  const result = mergeImportedGames([old, legacy], [fresh]);
  assert.equal(result.length, 2);
  assert.equal(result[0].timeClass, "rapid");
  assert.equal(result[0].whiteRating, 241);
  assert.equal(result[1].pgn, "saved");
  assert.equal(mergeImportedGames([old, legacy], [fresh], 1).length, 1);
});
