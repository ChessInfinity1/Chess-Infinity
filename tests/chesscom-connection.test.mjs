import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeChessComUsername } from "../lib/chess/chesscom-input.ts";
import { GET } from "../app/api/chesscom/route.ts";

test("Chess.com usernames, handles, and member URLs normalize safely", () => {
  for (const input of [
    " EliamGM ",
    "@EliamGM",
    "https://www.chess.com/member/EliamGM",
    "https://chess.com/member/EliamGM/?ref=profile",
    "www.chess.com/member/EliamGM",
  ])
    assert.equal(normalizeChessComUsername(input), "eliamgm");
  for (const input of [
    "",
    "person@example.com",
    "my password",
    "https://example.test/member/name",
    "https://chess.com.evil.test/member/name",
    "https://www.chess.com/member/name/extra",
    "https://www.chess.com/member/%2Ffoo",
  ])
    assert.equal(normalizeChessComUsername(input), null);
});
test("public Chess.com import works without an academy identity", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return Response.json(
      url.endsWith("/stats")
        ? { chess_rapid: { last: { rating: 500 } } }
        : url.endsWith("/archives")
          ? { archives: [] }
          : { username: "EliamGM" },
    );
  };
  try {
    const r = await GET(
      new Request(
        "https://academy.test/api/chesscom?username=" +
          encodeURIComponent("https://www.chess.com/member/EliamGM"),
      ),
    );
    assert.equal(r.status, 200);
    const b = await r.json();
    assert.equal(b.profile.username, "EliamGM");
    assert.equal(b.stats.chess_rapid.last.rating, 500);
    assert.deepEqual(b.games, []);
    assert.equal(calls.length, 3);
    assert.equal(calls[0], "https://api.chess.com/pub/player/eliamgm");
  } finally {
    globalThis.fetch = original;
  }
});
test("invalid input stops before any provider request and provider errors do not link a profile", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(null, { status: 429 });
  };
  try {
    const invalid = await GET(
      new Request(
        "https://academy.test/api/chesscom?username=person%40example.com",
      ),
    );
    assert.equal(invalid.status, 400);
    assert.equal(calls, 0);
    const limited = await GET(
      new Request("https://academy.test/api/chesscom?username=eliamgm"),
    );
    assert.equal(limited.status, 502);
    const b = await limited.json();
    assert.match(b.error, /rate limit/);
    assert.equal(b.profile, undefined);
  } finally {
    globalThis.fetch = original;
  }
});
