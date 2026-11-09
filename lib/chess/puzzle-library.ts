import data from "./puzzle-data.json" with { type: "json" };
import type { Exercise } from "./content.ts";
export const themeNames: Record<string, string> = {
  mateIn1: "Mate in 1",
  mateIn2: "Mate in 2",
  mateIn3: "Mate in 3",
  mateIn4: "Mate in 4",
  mateIn5: "Mate in 5+",
  fork: "Forks",
  pin: "Pins",
  skewer: "Skewers",
  discoveredAttack: "Discovered attacks",
  doubleCheck: "Double checks",
  deflection: "Deflection",
  attraction: "Decoys",
  interference: "Interference",
  clearance: "Clearance",
  backRankMate: "Back-rank mates",
  smotheredMate: "Smothered mates",
  hangingPiece: "Hanging pieces",
  trappedPiece: "Trapped pieces",
  sacrifice: "Sacrifices",
  promotion: "Promotion",
  underPromotion: "Underpromotion",
  zugzwang: "Zugzwang",
  quietMove: "Quiet moves",
  defensiveMove: "Defense",
  endgame: "Endgames",
  rookEndgame: "Rook endgames",
  pawnEndgame: "Pawn endgames",
  advancedPawn: "Passed pawns",
  exposedKing: "King attacks",
  crushing: "Winning advantage",
  advantage: "Win material",
  equality: "Save the position",
  attackingF2F7: "Attack f2 / f7",
  xRayAttack: "X-ray attacks",
  capturingDefender: "Remove the defender",
  zwischenzug: "Zwischenzug",
};
const priorities = [
  "mateIn1",
  "mateIn2",
  "mateIn3",
  "mateIn4",
  "mateIn5",
  "smotheredMate",
  "backRankMate",
  "fork",
  "pin",
  "skewer",
  "discoveredAttack",
  "doubleCheck",
  "deflection",
  "attraction",
  "interference",
  "clearance",
  "underPromotion",
  "promotion",
  "zugzwang",
  "defensiveMove",
  "trappedPiece",
  "hangingPiece",
  "capturingDefender",
  "xRayAttack",
  "sacrifice",
  "quietMove",
  "rookEndgame",
  "pawnEndgame",
  "endgame",
  "advancedPawn",
  "exposedKing",
  "equality",
  "advantage",
  "crushing",
];
const advice: Record<string, string> = {
  Forks: "Look for one move that attacks two valuable targets.",
  Pins: "Find a piece that cannot move without exposing something more valuable.",
  Skewers:
    "Use a forcing attack to uncover a second target along the same line.",
  Defense: "Find a resource that neutralizes the most urgent threat.",
  Promotion: "Calculate the pawn race and the promotion square.",
  Underpromotion:
    "Consider promoting to a knight, rook, or bishop if a queen does not solve the position.",
  Decoys: "Can a forcing move draw an enemy piece onto a vulnerable square?",
  Deflection:
    "Look for a defender that can be distracted from an essential duty.",
  Clearance: "Can moving a piece free a square, file, or diagonal?",
  Endgames: "Compare king activity, pawn races, and forcing exchanges.",
};
export const libraryPuzzles: Exercise[] = data.map((p) => {
  const theme =
    themeNames[priorities.find((t) => p.themes.includes(t)) || ""] ||
    "Calculation";
  const hint = theme.startsWith("Mate")
    ? "Calculate checks and every legal king escape before choosing your move."
    : advice[theme] ||
      "Compare checks, captures, and threats. Calculate the opponent’s strongest reply.";
  return {
    ...p,
    title: theme.startsWith("Mate")
      ? "Find the mating net"
      : theme === "Defense"
        ? "Hold the position"
        : `Find the idea · ${theme}`,
    theme,
    hint,
    explanation:
      "You completed the published tactical solution. Replay the sequence to see how the forcing moves fit together. Puzzle difficulty is its source rating, separate from your account ratings.",
    source: {
      name: "Lichess open puzzle database",
      license: "CC0-1.0",
      url: "https://lichess.org/training/" + p.sourceId,
      gameUrl: p.url,
    },
  };
});
export function puzzleTags(p: Exercise) {
  return [
    ...new Set([
      p.theme,
      ...(p.themes || []).map((t) => themeNames[t]).filter(Boolean),
    ]),
  ];
}
export function filterPuzzles(
  all: Exercise[],
  query: string,
  theme: string,
  range: string,
) {
  return all.filter(
    (p) =>
      (theme === "All patterns" || puzzleTags(p).includes(theme)) &&
      (p.title + " " + puzzleTags(p).join(" ") + " " + p.id)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (range === "all" ||
        (range === "beginner" && p.rating < 1000) ||
        (range === "improving" && p.rating >= 1000 && p.rating < 1400) ||
        (range === "club" && p.rating >= 1400 && p.rating < 1800) ||
        (range === "advanced" && p.rating >= 1800)),
  );
}
