import { lessons, type Lesson } from "./content.ts";
const firstTrack = [
  "l17",
  "l2",
  "l3",
  "l18",
  "l19",
  "l20",
  "l21",
  "l28",
  "l29",
  "l30",
  "l31",
  "l22",
  "l23",
  "l32",
  "l4",
  "l33",
  "l34",
  "growth-block-a-file",
  "growth-step-out",
  "growth-diagonal-capture",
  "growth-rook-line-capture",
  "l1",
];
const secondTrack = [
  "l35",
  "l36",
  "l37",
  "l38",
  "l39",
  "l40",
  "l6",
  "l5",
  "l7",
  "l8",
  "l24",
  "l45",
];
const unitNames = [
  [
    "Meet the board",
    "Make your pieces work",
    "Moves with purpose",
    "Keep your king safe",
    "Own the opening",
  ],
  ["A confident start", "See the opportunity", "Turn an idea into a result"],
  [
    "Spot forcing moves",
    "Find tactical targets",
    "Calculate the reply",
    "Connect the ideas",
    "Build tactical memory",
  ],
  [
    "Give your pieces a purpose",
    "Shape the position",
    "Think a move ahead",
    "Create a plan",
    "Convert your chances",
    "Keep the initiative",
  ],
  ["Make precise decisions", "Find the resources"],
  ["Calculate with discipline"],
];
export function trailLessons(level: number): Lesson[] {
  const all = lessons.filter((l) => l.level === level);
  const order = level === 1 ? firstTrack : level === 2 ? secondTrack : [];
  return [...all].sort((a, b) => {
    const ai = order.indexOf(a.id),
      bi = order.indexOf(b.id);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}
export function trailUnits(level: number) {
  const all = trailLessons(level);
  return Array.from({ length: Math.ceil(all.length / 4) }, (_, i) => ({
    id: `track-${level}-unit-${i + 1}`,
    number: i + 1,
    title: unitNames[level - 1]?.[i] || `Put ideas into practice ${i + 1}`,
    lessons: all.slice(i * 4, i * 4 + 4),
  }));
}
export function trailPoint(index: number) {
  const offsets = [0, 65, 90, 65, 0, -65, -90, -65];
  return { x: 240 + offsets[index % offsets.length], y: 58 + index * 176 };
}
export function trailCurve(count: number) {
  if (!count) return "";
  const points = Array.from({ length: count }, (_, i) => trailPoint(i));
  return points
    .map((p, i) =>
      i === 0
        ? `M ${p.x} ${p.y}`
        : `C ${points[i - 1].x} ${points[i - 1].y + 88}, ${p.x} ${p.y - 88}, ${p.x} ${p.y}`,
    )
    .join(" ");
}
