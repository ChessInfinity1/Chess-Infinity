import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchChessCom } from "../lib/chess/chesscom.ts";
test("Chess.com imports serially and ignores unexpected archive hosts", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let inflight = 0;
  globalThis.fetch = async (url) => {
    assert.equal(inflight++, 0);
    calls.push(url);
    await new Promise((r) => setTimeout(r, 1));
    inflight--;
    let body = url.endsWith("/stats")
      ? { chess_rapid: { last: { rating: 500 } } }
      : url.endsWith("/archives")
        ? {
            archives: [
              "https://example.test/fake",
              "https://api.chess.com/pub/player/test/games/2026/11",
            ],
          }
        : url.includes("/games/2026/11")
          ? {
              games: [
                { uuid: "a", rules: "chess", end_time: 1, pgn: "1. e4 e5" },
                { rules: "chess960", end_time: 2, pgn: "1. e4" },
                { rules: "chess", pgn: "1. d4" },
              ],
            }
          : { username: "test" };
    return Response.json(body);
  };
  try {
    const b = await fetchChessCom("test");
    assert.equal(b.profile.username, "test");
    assert.equal(b.games.length, 1);
    assert.equal(b.games[0].uuid, "a");
    assert.equal(calls.length, 4);
    assert.ok(calls.every((u) => u.startsWith("https://api.chess.com/")));
  } finally {
    globalThis.fetch = original;
  }
});
test("Chess.com rate limits and missing profiles return actionable errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 429 });
    await assert.rejects(fetchChessCom("test"), /rate limit/);
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(fetchChessCom("test"), /not found/);
  } finally {
    globalThis.fetch = original;
  }
});

test("archive pagination never drops games within the same month", async () => {
  const original = globalThis.fetch;
  const records = Array.from({ length: 65 }, (_, i) => ({
    uuid: "game-" + i,
    rules: "chess",
    end_time: 10000 - i,
    pgn: "1. e4 e5",
  }));
  globalThis.fetch = async (url) =>
    Response.json(
      url.endsWith("/stats")
        ? {}
        : url.endsWith("/archives")
          ? {
              archives: ["https://api.chess.com/pub/player/test/games/2026/11"],
            }
          : url.includes("/games/2026/11")
            ? { games: records }
            : { username: "test" },
    );
  try {
    const first = await fetchChessCom("test");
    assert.equal(first.games.length, 40);
    assert.equal(first.nextCursor, "2026/11:40");
    const second = await fetchChessCom("test", first.nextCursor);
    assert.equal(second.games.length, 25);
    assert.equal(second.nextCursor, null);
    assert.equal(
      new Set([...first.games, ...second.games].map((g) => g.uuid)).size,
      65,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("archive pagination spans months and rejects invalid cursors before fetching", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    return Response.json(
      url.endsWith("/stats")
        ? {}
        : url.endsWith("/archives")
          ? {
              archives: [
                "https://api.chess.com/pub/player/test/games/2026/10",
                "https://api.chess.com/pub/player/test/games/2026/11",
              ],
            }
          : url.includes("/games/")
            ? {
                games: Array.from({ length: 30 }, (_, i) => ({
                  uuid: url.slice(-7) + "-" + i,
                  rules: "chess",
                  end_time: 100 - i,
                  pgn: "1. d4 d5",
                })),
              }
            : { username: "test" },
    );
  };
  try {
    await assert.rejects(fetchChessCom("test", "https://evil.test"), /cursor/);
    assert.equal(calls, 0);
    const first = await fetchChessCom("test");
    assert.equal(first.games.length, 40);
    assert.equal(first.nextCursor, "2026/10:10");
    const second = await fetchChessCom("test", first.nextCursor);
    assert.equal(second.games.length, 20);
    assert.equal(second.nextCursor, null);
  } finally {
    globalThis.fetch = original;
  }
});
