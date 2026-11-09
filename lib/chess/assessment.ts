import { Chess } from "chess.js";
export type AssessmentAnswer = {
  taskId: string;
  uci: string | null;
  correct: boolean;
  at: string;
};
export type AssessmentDraft = {
  id: string;
  startedAt: string;
  answers: AssessmentAnswer[];
};
export type AssessmentResult = AssessmentDraft & {
  completedAt: string;
  version: 1;
};
export const assessmentTasks = [
  {
    id: "knight",
    skill: "Fundamentals",
    title: "Develop with purpose",
    prompt: "Develop the kingside knight toward the center.",
    fen: new Chess().fen(),
    answers: ["g1f3"],
    explanation:
      "Nf3 develops the kingside knight and influences central squares. Nh3 develops to the edge instead.",
    lesson: "l3",
  },
  {
    id: "pawn",
    skill: "Fundamentals",
    title: "A pawn’s capture",
    prompt: "Capture Black’s pawn with your pawn.",
    fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1",
    answers: ["e4d5"],
    explanation:
      "Pawns capture one square diagonally: exd5. Their forward move is not a capture.",
    lesson: "l21",
  },
  {
    id: "castle",
    skill: "King safety",
    title: "Two pieces, one move",
    prompt:
      "Castle on the kingside. Move the king to its castling destination.",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    answers: ["e1g1"],
    explanation:
      "O-O moves the king to g1 and the rook to f1. The king cannot start in check or cross an attacked square.",
    lesson: "l4",
  },
  {
    id: "block",
    skill: "King safety",
    title: "Answer the check",
    prompt: "Block the rook’s check with your bishop.",
    fen: "4r1k1/8/8/8/8/8/3B4/4K3 w - - 0 1",
    answers: ["d2e3"],
    explanation:
      "Be3 places the bishop between the e8 rook and e1 king. A check must be answered immediately.",
    lesson: "l32",
  },
  {
    id: "capture",
    skill: "Tactical vision",
    title: "Spot the opportunity",
    prompt: "Win the undefended queen with your rook.",
    fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1",
    answers: ["d1d5"],
    explanation:
      "Rxd5 wins the queen. Scan for loose pieces before choosing a quiet move.",
    lesson: "l6",
  },
  {
    id: "fork",
    skill: "Tactical vision",
    title: "Two targets",
    prompt: "Give a knight check that also attacks the rook.",
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    answers: ["b5c7"],
    explanation:
      "Nc7+ forks the king on e8 and rook on a8. The check gives time to capture the rook next.",
    lesson: "applied-fork",
  },
  {
    id: "promotion",
    skill: "Endgame basics",
    title: "A new piece",
    prompt:
      "Promote your pawn to a queen. Choose the queen in the promotion picker.",
    fen: "7k/P7/6K1/8/8/8/8/8 w - - 0 1",
    answers: ["a7a8q"],
    explanation:
      "a8=Q promotes the pawn. Promotion is part of the move; occasionally a rook, bishop or knight is preferable.",
    lesson: "l7",
  },
  {
    id: "king",
    skill: "Endgame basics",
    title: "Support from the side",
    prompt:
      "Keep your king on the sixth rank and move it beside the e-file to support your pawn’s advance.",
    fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1",
    answers: ["e6d6", "e6f6"],
    explanation:
      "Kd6 or Kf6 supports the pawn from the side. An active king is important in pawn endings; this challenge does not claim a forced win.",
    lesson: "l54",
  },
];
export function answerAssessment(
  taskId: string,
  uci: string | null,
  at = new Date().toISOString(),
): AssessmentAnswer {
  const task = assessmentTasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Unknown assessment position.");
  if (!Number.isFinite(Date.parse(at)))
    throw new Error("Invalid attempt time.");
  if (uci !== null)
    new Chess(task.fen).move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
  return {
    taskId,
    uci,
    correct: uci !== null && task.answers.includes(uci),
    at,
  };
}
export function assessmentSummary(result: Pick<AssessmentDraft, "answers">) {
  const answers = new Map(result.answers.map((a) => [a.taskId, a]));
  const skills = [...new Set(assessmentTasks.map((t) => t.skill))].map(
    (skill) => {
      const tasks = assessmentTasks.filter((t) => t.skill === skill);
      const clean = tasks.filter((t) => {
        const a = answers.get(t.id);
        return a && answerAssessment(t.id, a.uci, a.at).correct;
      }).length;
      return {
        skill,
        clean,
        total: tasks.length,
        lessons: tasks
          .filter((t) => !answers.get(t.id)?.correct)
          .map((t) => t.lesson),
      };
    },
  );
  const focus = [...skills].sort((a, b) => a.clean - b.clean);
  const score = skills.reduce((s, x) => s + x.clean, 0);
  return {
    skills,
    score,
    total: assessmentTasks.length,
    focus: score === 8 ? "Applying the fundamentals" : focus[0].skill,
    lessons:
      score === 8
        ? ["l36", "applied-fork", "l54"]
        : [...new Set(focus.flatMap((s) => s.lessons))].slice(0, 4),
  };
}
