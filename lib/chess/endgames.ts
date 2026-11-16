import type { Exercise } from "./content.ts";

const seeds = [
  { id: "queen-net", title: "Close the queen's net", theme: "Queen mates", fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1", line: ["g6g7"], hint: "Place the queen beside the king, protected by your own king.", explanation: "Qg7 is checkmate. The white king protects the queen and the queen covers every escape square.", rating: 450 },
  { id: "rook-net", title: "Seal the last rank", theme: "Rook mates", fen: "7k/8/6K1/8/8/8/8/R7 w - - 0 1", line: ["a1a8"], hint: "Your king covers the seventh rank. Give a rook check on the eighth.", explanation: "Ra8 is checkmate. The rook seals the last rank and the king takes away the escape squares.", rating: 500 },
  { id: "promotion", title: "Turn a pawn into a queen", theme: "Promotion", fen: "8/6P1/8/8/k7/8/8/4K3 w - - 0 1", line: ["g7g8q"], hint: "Advance the pawn to the last rank and choose a queen.", explanation: "Promote to a queen. This drill ends at promotion; in a real game, keep checking for stalemate as you convert the advantage.", rating: 300 },
  { id: "knight-fork", title: "A knight from nowhere", theme: "Knight promotion", fen: "8/1P1k4/2r5/8/8/8/8/4K3 w - - 0 1", line: ["b7b8n", "d7e6", "b8c6"], hint: "Promote to a knight with check, then capture the rook after the sample reply.", explanation: "A knight promotion forks king and rook. After the sample king reply, the knight captures the rook. This drill practices underpromotion; it does not claim other promotions lose.", rating: 850 },
];
function transform(seed: typeof seeds[number], mirror: boolean, black: boolean): Exercise {
  const square = (file: number, rank: number) => { if (mirror) file = 7 - file; if (black) { file = 7 - file; rank = 7 - rank; } return [file, rank]; };
  const board = Array.from({ length: 8 }, () => Array<string>(8).fill(""));
  seed.fen.split(" ")[0].split("/").forEach((row, rank) => { let file = 0; for (const piece of row) { if (/\d/.test(piece)) file += +piece; else { const [x,y] = square(file++, rank); board[y][x] = black ? piece === piece.toUpperCase() ? piece.toLowerCase() : piece.toUpperCase() : piece; } } });
  const fen = board.map(row => { let value = "", empty = 0; for (const piece of row) { if (!piece) empty++; else { if (empty) value += empty; empty = 0; value += piece; } } return value + (empty || ""); }).join("/") + ` ${black ? "b" : "w"} - - 0 1`;
  const convert = (value: string) => { const [x,y] = square(value.charCodeAt(0) - 97, 8 - +value[1]); return String.fromCharCode(97 + x) + (8 - y); };
  return { ...seed, id: `endgame-${seed.id}-${black ? "black" : "white"}-${mirror ? "right" : "left"}`, title: seed.title, fen, line: seed.line.map(move => convert(move.slice(0,2)) + convert(move.slice(2,4)) + move.slice(4)), hint: mirror || black ? seed.hint.replace("seventh rank", black ? "second rank" : "seventh rank").replace("eighth", black ? "first" : "eighth") : seed.hint, explanation: mirror || black ? seed.theme.includes("mates") ? "Checkmate. Your heavy piece gives check while your king closes the escape squares." : seed.explanation : seed.explanation };
}
export const endgameDrills: Exercise[] = seeds.flatMap(seed => [false, true].flatMap(black => [false, true].map(mirror => transform(seed, mirror, black))));
export const endgameThemes = seeds.map(seed => seed.theme);
