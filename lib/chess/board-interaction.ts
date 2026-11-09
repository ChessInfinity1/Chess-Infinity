import { Chess } from "chess.js";
export function squareAtPoint(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  flipped = false,
): string | null {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    x < rect.left ||
    y < rect.top ||
    x >= rect.left + rect.width ||
    y >= rect.top + rect.height
  )
    return null;
  const file = Math.floor(((x - rect.left) / rect.width) * 8);
  const row = Math.floor(((y - rect.top) / rect.height) * 8);
  return (
    (flipped ? "hgfedcba" : "abcdefgh")[file] +
    (flipped ? "12345678" : "87654321")[row]
  );
}
export function legalBoardMove(
  fen: string,
  from: string,
  to: string,
  movableColor?: "w" | "b",
) {
  try {
    const g = new Chess(fen);
    if (movableColor && g.turn() !== movableColor) return null;
    return (
      g.moves({ verbose: true }).find((m) => m.from === from && m.to === to) ||
      null
    );
  } catch {
    return null;
  }
}
export function adjacentSquare(index: number, key: string) {
  if (key === "ArrowLeft") return index % 8 === 0 ? null : index - 1;
  if (key === "ArrowRight") return index % 8 === 7 ? null : index + 1;
  if (key === "ArrowUp") return index < 8 ? null : index - 8;
  if (key === "ArrowDown") return index >= 56 ? null : index + 8;
  return null;
}
