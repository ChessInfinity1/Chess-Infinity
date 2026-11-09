import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Chess } from "chess.js";
const input = await readFile("data/lichess-subset-raw.json", "utf8");
const rows = JSON.parse(input);
const result = [];
const positions = new Set();
for (const row of rows) {
  try {
    const game = new Chess(row.FEN);
    const moves = row.Moves.split(" ");
    const setup = moves.shift();
    game.move({
      from: setup.slice(0, 2),
      to: setup.slice(2, 4),
      promotion: setup[4],
    });
    const fen = game.fen();
    if (positions.has(fen)) continue;
    if (!moves.length || moves.length % 2 !== 1) continue;
    for (const u of moves)
      game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    const themes = row.Themes.split(" ");
    if (themes.includes("mate") && !game.isCheckmate()) continue;
    if (
      !/^https:\/\/lichess\.org\/(?:game\/)?[a-zA-Z0-9]+(?:\/black)?(?:#\d+)?$/.test(
        row.GameUrl,
      )
    )
      continue;
    positions.add(fen);
    result.push({
      id: "lichess-" + row.PuzzleId,
      fen,
      line: moves,
      rating: +row.Rating,
      themes,
      sourceId: row.PuzzleId,
      url: row.GameUrl,
    });
  } catch (e) {
    console.error("Skipped invalid puzzle", row.PuzzleId, e.message);
  }
}
await writeFile("lib/chess/puzzle-data.json", JSON.stringify(result));
await writeFile(
  "data/puzzle-provenance.json",
  JSON.stringify(
    {
      provider: "Lichess open database",
      license: "CC0-1.0",
      source: "https://database.lichess.org/lichess_db_puzzle.csv.zst",
      retrieved: "2026-11-07",
      rawSha256: createHash("sha256").update(input).digest("hex"),
      count: result.length,
      selection:
        "First matching rows, stratified by source rating: under 1000, 1000–1399, 1400–1799, 1800–2300. Popularity >=80, plays >=300, rating deviation <=100. Starting position advances the first opponent move; all remaining solution plies validated using chess.js. Duplicate FENs removed.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Prepared",
  result.length,
  "unique legally validated Lichess puzzles.",
);
