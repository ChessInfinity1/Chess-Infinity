import drills from "./original-drills.json" with { type: "json" };
import { buildGrowthLessons } from "./growth-lessons.ts";
import type { PracticeReminder } from "./reminders.ts";
import { expandedLessons } from "./expanded-lessons.ts";
import { libraryPuzzles } from "./puzzle-library.ts";
import type { RevengeProgress } from "./revenge.ts";
import type { AssessmentDraft, AssessmentResult } from "./assessment.ts";
import type { GuidedSession } from "./guided.ts";
import type { ArcadeProgress } from "./arcade";
import type { FocusSession } from "./focus.ts";
export type Exercise = {
  id: string;
  title: string;
  theme: string;
  fen: string;
  line: string[];
  explanation: string;
  hint: string;
  rating: number;
  themes?: string[];
  source?: { name: string; license: string; url: string; gameUrl: string };
};
export type Lesson = Exercise & {
  level: number;
  minutes: number;
  intro: string;
  question: string;
  choices: string[];
  answer: number;
  feedback: string;
};
export type Opening = {
  id: string;
  name: string;
  eco: string;
  side: string;
  line: string;
  idea: string;
  mistake: string;
};
export type Progress = {
  focusSessions?: FocusSession[];
  practiceReminder?: PracticeReminder;
  explainMoves?: boolean;
  savedExercises?: string[];
  explanations?: { id: string; correctFirstTry: boolean; at: string }[];
  assessmentDraft: AssessmentDraft | null;
  assessments: AssessmentResult[];
  guidedSessions: GuidedSession[];
  arcade: ArcadeProgress;
  revenge: RevengeProgress;
  onboarding: {
    version: 1;
    completed: boolean;
    experience: string;
    finishedAt: string;
    skipped?: boolean;
  } | null;
  offlineImports: string[];
  completed: string[];
  puzzles: { id: string; correct: boolean; at: string }[];
  xp: number;
  days: string[];
  lessonDates: Record<string, string>;
  analyses: any[];
  puzzleRating: number;
  goal: string;
  minutes: number;
  repertoire: string[];
  reviews: Record<string, { due: string; interval: number }>;
  games: any[];
  accounts: Record<string, any>;
  theme: string;
  boardTheme: string;
  dockStyle: "glass" | "solid";
};

export const levels = [
  "First moves",
  "Build your foundation",
  "Think tactically",
  "Play with a plan",
  "Master your decisions",
  "The deeper game",
];

export const originalPuzzles: Exercise[] = [
  {
    id: "p1",
    title: "The final square",
    theme: "Mate in 1",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    line: ["e1e8"],
    explanation:
      "The rook seals the eighth rank. Black’s own pawns block the king’s escape.",
    hint: "Look for a rook check on the back rank.",
    rating: 400,
  },
  {
    id: "p2",
    title: "A royal fork",
    theme: "Forks",
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    line: ["b5c7", "e8d7", "c7a8"],
    explanation:
      "Nc7+ attacks the king and rook. After the king moves, Nxa8 wins the rook.",
    hint: "Give check and attack a second piece.",
    rating: 600,
  },
  {
    id: "p3",
    title: "Queen and king",
    theme: "Mate in 1",
    fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    line: ["g6g7"],
    explanation:
      "The queen checks along the seventh rank and is protected by her king. Every flight square is covered.",
    hint: "Bring the queen directly beside the enemy king, protected by your king.",
    rating: 450,
  },
  {
    id: "p4",
    title: "Remove the guard",
    theme: "Hanging pieces",
    fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1",
    line: ["d1d5"],
    explanation:
      "Before searching for combinations, inspect captures. The undefended queen can simply be taken.",
    hint: "Which valuable piece has no defender?",
    rating: 250,
  },
  {
    id: "p5",
    title: "Fork on the eighth rank",
    theme: "Forks",
    fen: "2r1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    line: ["f5d6", "e8d7", "d6c8"],
    explanation:
      "Nd6+ attacks the king on e8 and the rook on c8. After the king moves, capture the rook.",
    hint: "Knights attack in an L shape.",
    rating: 650,
  },
  {
    id: "p6",
    title: "Promotion with tempo",
    theme: "Promotion",
    fen: "7k/1P6/6K1/8/8/8/8/8 w - - 0 1",
    line: ["b7b8q"],
    explanation:
      "Promoting to a queen gives check along the eighth rank. Promotion can change the position instantly.",
    hint: "Push your pawn to the last rank and choose a queen.",
    rating: 300,
  },
  {
    id: "p7",
    title: "Take en passant",
    theme: "Special moves",
    fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2",
    line: ["e5d6"],
    explanation:
      "The pawn just advanced two squares. Capture it as though it advanced one. This right expires after one move.",
    hint: "The capture lands on an empty square.",
    rating: 500,
  },
  {
    id: "p8",
    title: "Rook on the loose",
    theme: "Exchanges",
    fen: "4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1",
    line: ["e2e7"],
    explanation:
      "The rook on e7 is undefended by another piece, but the king can recapture. Always consider your opponent’s reply: this is an exchange, not a free rook.",
    hint: "Trade rooks along the open file.",
    rating: 400,
  },
  {
    id: "p9",
    title: "The protected finish",
    theme: "Mate in 1",
    fen: "k7/8/1QK5/8/8/8/8/8 w - - 0 1",
    line: ["b6b7"],
    explanation:
      "The queen is protected by the king on c6. Black cannot capture her or escape the check.",
    hint: "Place the queen on b7.",
    rating: 400,
  },
  {
    id: "p10",
    title: "A quiet escape",
    theme: "Defense",
    fen: "4k3/8/8/8/8/8/4r3/4K3 w - - 0 1",
    line: ["e1e2"],
    explanation:
      "A checking piece may be captured when its square is safe. Count the attackers before fleeing.",
    hint: "Can your king safely capture the checking rook?",
    rating: 350,
  },
];

export const puzzles: Exercise[] = [...originalPuzzles, ...drills, ...libraryPuzzles];

const foundationLessons: Lesson[] = [
  {
    id: "l1",
    title: "Own the center",
    theme: "Opening principles",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    line: ["e2e4", "e7e5", "g1f3"],
    explanation:
      "e4 claims central space. Nf3 develops a piece and attacks e5. Each move helps the next one.",
    hint: "Start by moving the e-pawn two squares.",
    rating: 200,
    level: 1,
    minutes: 5,
    intro:
      "The four central squares—e4, d4, e5, and d5—are the crossroads of the board. Start with 1.e4, then develop your king’s knight after Black replies.",
    question: "Why is Nf3 useful here?",
    choices: [
      "It develops a piece and attacks e5",
      "It wins the queen immediately",
      "It gives check",
    ],
    answer: 0,
    feedback:
      "Development with a purpose makes your opening moves work together.",
  },
  {
    id: "l17",
    title: "Find your bearings",
    theme: "Board coordinates",
    fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
    line: ["e1d2"],
    explanation:
      "Files use letters a–h. Ranks use numbers 1–8. The square d2 is one file left and one rank forward from e1 for White.",
    hint: "Choose the king, then the square d2.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "Every square has an address. Find your king on e1 and move it diagonally to d2. Read the coordinates along the board’s edges.",
    question: "What is the letter in d2 called?",
    choices: ["A file", "A rank"],
    answer: 0,
    feedback:
      "Files are vertical columns labeled a through h. Ranks are horizontal rows labeled 1 through 8.",
  },
  {
    id: "l18",
    title: "A bishop’s diagonal",
    theme: "Piece movement",
    fen: "4k3/8/8/8/8/8/8/2B1K3 w - - 0 1",
    line: ["c1f4"],
    explanation:
      "The bishop follows a diagonal and stays on the same color square for its entire life.",
    hint: "Move the bishop three diagonal squares to f4.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "A bishop moves diagonally any distance when its path is clear. Move the bishop from c1 to f4.",
    question: "Can a bishop change its square color?",
    choices: ["Yes, when it captures", "No"],
    answer: 1,
    feedback:
      "A bishop always stays on its original color. A pair of bishops covers both colors.",
  },
  {
    id: "l19",
    title: "The queen’s long reach",
    theme: "Piece movement",
    fen: "7k/8/8/8/8/8/8/3QK3 w - - 0 1",
    line: ["d1d6"],
    explanation:
      "The queen combines the rook’s straight lines with the bishop’s diagonals. She cannot jump over pieces.",
    hint: "Travel straight up the d-file to d6.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "The queen can travel along ranks, files, or diagonals. Move her from d1 to d6 along the open file.",
    question: "Which move shape can a queen NOT use?",
    choices: ["A straight line", "A diagonal", "A knight’s L-shaped jump"],
    answer: 2,
    feedback: "The queen is powerful but cannot jump or move like a knight.",
  },
  {
    id: "l20",
    title: "One careful king step",
    theme: "King safety",
    fen: "7k/8/8/8/8/8/8/4K3 w - - 0 1",
    line: ["e1e2"],
    explanation:
      "The king moves one square in any direction, but can never move into check. Kings may not stand on adjacent squares.",
    hint: "Move the king one square to e2.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "Your king must stay safe. It moves one square at a time. Move from e1 to e2 and notice how this differs from a queen.",
    question: "Can a king move onto an attacked square?",
    choices: ["Yes, if it captures", "No"],
    answer: 1,
    feedback: "A king must never end a move in check, even when capturing.",
  },
  {
    id: "l21",
    title: "Pawns move and capture differently",
    theme: "Pawn movement",
    fen: "7k/8/8/3p4/4P3/8/8/K7 w - - 0 1",
    line: ["e4d5"],
    explanation:
      "A pawn advances straight forward but captures one square diagonally forward. It cannot move backward.",
    hint: "Capture from e4 to d5.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "Your e4 pawn can capture Black’s pawn on d5. A pawn’s capturing direction differs from its normal advance. Try exd5.",
    question: "Can a pawn capture straight ahead?",
    choices: ["Yes", "No"],
    answer: 1,
    feedback:
      "Pawns capture diagonally. A piece directly ahead blocks a pawn’s advance.",
  },
  {
    id: "l22",
    title: "Read a move",
    theme: "Notation",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    line: ["g1f3"],
    explanation:
      "N means knight. Nf3 means a knight moves to f3. Pawns have no letter; captures use x; check uses + and checkmate #.",
    hint: "Nf3 uses the knight on g1.",
    rating: 200,
    level: 1,
    minutes: 4,
    intro:
      "Algebraic notation describes a move in a few characters. Play Nf3: N is the knight, and f3 is the destination.",
    question: "What does the + symbol mean after a move?",
    choices: ["Check", "Checkmate", "An extra pawn"],
    answer: 0,
    feedback:
      "A plus indicates check; a # indicates checkmate. The king must answer a check.",
  },
  {
    id: "l23",
    title: "Get out of check",
    theme: "Check",
    fen: "4k3/8/8/8/8/8/4r3/4K3 w - - 0 1",
    line: ["e1e2"],
    explanation:
      "You can answer a check by capturing the attacker, blocking the attack, or moving the king. Here the rook can safely be captured.",
    hint: "Capture the checking rook with your king.",
    rating: 200,
    level: 1,
    minutes: 4,
    intro:
      "Your king is attacked by the rook on e2. You must answer this check. Capture the rook if its square is safe.",
    question: "Can you ignore a check to attack the enemy queen?",
    choices: ["Yes, if it wins material", "No, your king must be made safe"],
    answer: 1,
    feedback: "Every legal move must leave your king safe.",
  },
  {
    id: "l2",
    title: "The rook’s straight lines",
    theme: "Piece movement",
    fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
    line: ["a1a7"],
    explanation:
      "Rooks travel any distance along a rank or file when the path is clear.",
    hint: "Move the rook straight up to a7.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "A rook moves horizontally or vertically. It cannot jump over pieces. Move your rook from a1 to a7.",
    question: "Can a rook jump over a pawn?",
    choices: ["Yes", "No"],
    answer: 1,
    feedback: "Only the knight can jump over intervening pieces.",
  },
  {
    id: "l3",
    title: "A knight’s first leap",
    theme: "Piece movement",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    line: ["g1f3"],
    explanation:
      "The knight moves two squares in one direction and one square at a right angle. It can jump.",
    hint: "Move the g1 knight to f3.",
    rating: 100,
    level: 1,
    minutes: 3,
    intro:
      "Knights hop in an L shape and always land on the opposite square color. Develop your knight from g1 to f3.",
    question: "Which piece can jump over other pieces?",
    choices: ["Bishop", "Knight", "Queen"],
    answer: 1,
    feedback: "The knight can leap even when all nearby squares are occupied.",
  },
  {
    id: "l4",
    title: "Safe behind your pawns",
    theme: "Castling",
    fen: "r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1",
    line: ["e1g1"],
    explanation:
      "Castling moves the king two squares and brings the rook beside it. You cannot castle out of, through, or into check.",
    hint: "Move your king from e1 to g1.",
    rating: 300,
    level: 1,
    minutes: 5,
    intro:
      "Castling helps secure your king and activates a rook. Neither piece may have moved; the path must be clear and safe. Castle kingside.",
    question: "Can you castle while in check?",
    choices: ["Yes, if the rook is safe", "No"],
    answer: 1,
    feedback: "You must first answer the check with another legal move.",
  },
  {
    id: "l5",
    title: "The final square",
    theme: "Mate in 1",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    line: ["e1e8"],
    explanation:
      "The rook seals the eighth rank. Black’s own pawns block the king’s escape.",
    hint: "Look for a rook check on the back rank.",
    rating: 400,
    level: 2,
    minutes: 4,
    intro:
      "When a king is boxed in by its own pawns, a rook can deliver checkmate along the back rank. Find White’s finishing move.",
    question: "Why can Black not play Kh7?",
    choices: [
      "The h7 square is occupied by its own pawn",
      "Kings cannot move diagonally",
    ],
    answer: 0,
    feedback: "Friendly pieces can trap their own king.",
  },
  {
    id: "l6",
    title: "Remove the guard",
    theme: "Hanging pieces",
    fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1",
    line: ["d1d5"],
    explanation:
      "Before searching for combinations, inspect captures. The undefended queen can simply be taken.",
    hint: "Which valuable piece has no defender?",
    rating: 250,
    level: 2,
    minutes: 4,
    intro:
      "Use a simple scan each turn: checks, captures, threats. An undefended queen is waiting on the d-file. Take it.",
    question: "Before capturing, what should you check?",
    choices: [
      "Only the piece value",
      "Whether your opponent can recapture or mate you",
    ],
    answer: 1,
    feedback: "A good capture is judged by the position after the reply.",
  },
  {
    id: "l7",
    title: "Promotion with tempo",
    theme: "Promotion",
    fen: "7k/1P6/6K1/8/8/8/8/8 w - - 0 1",
    line: ["b7b8q"],
    explanation:
      "Promoting to a queen gives check along the eighth rank. Promotion can change the position instantly.",
    hint: "Push your pawn to the last rank and choose a queen.",
    rating: 300,
    level: 2,
    minutes: 3,
    intro:
      "A pawn reaching the last rank becomes a queen, rook, bishop, or knight. Promote on b8 and choose a queen.",
    question: "Must you promote to a queen?",
    choices: ["Yes", "No, four piece types are allowed"],
    answer: 1,
    feedback:
      "Underpromotion can be necessary to avoid stalemate or deliver a knight fork.",
  },
  {
    id: "l8",
    title: "Take en passant",
    theme: "Special moves",
    fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2",
    line: ["e5d6"],
    explanation:
      "The pawn just advanced two squares. Capture it as though it advanced one. This right expires after one move.",
    hint: "The capture lands on an empty square.",
    rating: 500,
    level: 2,
    minutes: 5,
    intro:
      "Black just played d7–d5. Your e5 pawn may capture on d6 immediately. Try this special pawn capture.",
    question: "How long does en passant remain available?",
    choices: [
      "Until that pawn moves again",
      "Only on the immediately following move",
    ],
    answer: 1,
    feedback: "The opportunity disappears if you choose a different move.",
  },
  {
    id: "l9",
    title: "A royal fork",
    theme: "Forks",
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    line: ["b5c7", "e8d7", "c7a8"],
    explanation:
      "Nc7+ attacks the king and rook. After the king moves, Nxa8 wins the rook.",
    hint: "Give check and attack a second piece.",
    rating: 600,
    level: 3,
    minutes: 6,
    intro:
      "A forcing check makes a fork powerful. Find the knight check that also attacks Black’s rook, then capture the rook after the reply.",
    question: "Why is the check useful?",
    choices: [
      "Black must answer it before saving the rook",
      "Knights always win rooks",
    ],
    answer: 0,
    feedback: "Forcing moves limit the opponent’s choices.",
  },
  {
    id: "l10",
    title: "The absolute pin",
    theme: "Pins",
    fen: "4k3/4n3/8/8/8/8/8/K3R3 w - - 0 1",
    line: ["e1e7"],
    explanation:
      "The e7 knight was pinned to its king. A pinned piece cannot legally expose its king to attack.",
    hint: "Capture the pinned knight on e7.",
    rating: 700,
    level: 3,
    minutes: 5,
    intro:
      "A piece between an enemy line piece and its own king is absolutely pinned. The knight on e7 cannot move off the e-file. Capture it.",
    question: "Can the pinned knight jump to f5?",
    choices: ["Yes", "No, it would expose the king"],
    answer: 1,
    feedback: "Move legality depends on king safety, even for a knight.",
  },
  {
    id: "l11",
    title: "Create a passed pawn",
    theme: "Pawn structures",
    fen: "7k/8/8/3p4/4P3/8/8/K7 w - - 0 1",
    line: ["e4d5"],
    explanation:
      "A passed pawn has no opposing pawn ahead of it on the same or neighboring files.",
    hint: "Capture Black’s pawn on d5.",
    rating: 700,
    level: 3,
    minutes: 4,
    intro:
      "Passed pawns create long-term threats. Capture the d5 pawn and identify why your remaining pawn is passed.",
    question: "What makes this pawn passed?",
    choices: ["It is on a dark square", "No enemy pawn can stop it from ahead"],
    answer: 1,
    feedback: "Passed pawns often tie the enemy king or pieces to defense.",
  },
  {
    id: "l12",
    title: "Active rooks",
    theme: "Open files",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    line: ["a1a7"],
    explanation:
      "A rook on the seventh rank attacks pawns from the side and limits the enemy king.",
    hint: "Use the open a-file to reach a7.",
    rating: 900,
    level: 4,
    minutes: 5,
    intro:
      "Rooks need activity. An open file is a highway; the seventh rank is often the destination. Play Ra7.",
    question: "Why can a rook on the seventh rank be strong?",
    choices: [
      "It attacks pawn bases and restricts the king",
      "It can jump over pawns",
    ],
    answer: 0,
    feedback: "Activity often matters more than defending a passive pawn.",
  },
  {
    id: "l13",
    title: "King activity in the ending",
    theme: "Endgame planning",
    fen: "8/4k3/8/4P3/4K3/8/8/8 w - - 0 1",
    line: ["e4d5"],
    explanation:
      "With queens off the board, bring the king toward the center and support your pawn. Avoid stepping next to the enemy king.",
    hint: "Centralize your king to d5.",
    rating: 1000,
    level: 4,
    minutes: 5,
    intro:
      "In an ending, the king becomes a fighting piece. Move Kd5 to support the advanced pawn and gain space.",
    question: "Why can kings be active in endgames?",
    choices: [
      "They are allowed to move into check",
      "There are fewer mating threats",
    ],
    answer: 1,
    feedback:
      "The king still obeys all check rules; fewer pieces make activity safer.",
  },
  {
    id: "l14",
    title: "The square of the pawn",
    theme: "Pawn endings",
    fen: "8/7k/8/P7/8/8/8/K7 w - - 0 1",
    line: ["a5a6"],
    explanation:
      "Imagine a square from the pawn to its promotion rank. If the enemy king cannot enter it in time, the pawn can outrun the king.",
    hint: "Advance the a-pawn.",
    rating: 1200,
    level: 5,
    minutes: 6,
    intro:
      "Calculate a pawn race without moving the king. Push a6 and compare the remaining pawn moves with the king’s travel distance.",
    question: "How many more pawn moves after a6 reach promotion?",
    choices: ["Two", "Three", "Four"],
    answer: 0,
    feedback:
      "a7 and a8 are two moves. Remember whose turn it is in every race.",
  },
  {
    id: "l15",
    title: "Queen and king",
    theme: "Mate in 1",
    fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    line: ["g6g7"],
    explanation:
      "The queen checks along the seventh rank and is protected by her king. Every flight square is covered.",
    hint: "Bring the queen directly beside the enemy king, protected by your king.",
    rating: 450,
    level: 5,
    minutes: 5,
    intro:
      "A large material advantage still needs accurate conversion. Coordinate king and queen to deliver mate without stalemate.",
    question: "Why is Qg7 safe?",
    choices: [
      "The king on f6 protects g7",
      "The queen cannot be captured by a king",
    ],
    answer: 0,
    feedback:
      "Even the queen needs protection when she approaches the enemy king.",
  },
  {
    id: "l16",
    title: "A royal fork",
    theme: "Forks",
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    line: ["b5c7", "e8d7", "c7a8"],
    explanation:
      "Nc7+ attacks the king and rook. After the king moves, Nxa8 wins the rook.",
    hint: "Give check and attack a second piece.",
    rating: 600,
    level: 6,
    minutes: 8,
    intro:
      "Expert calculation starts with accurate fundamentals. Before touching a piece, visualize Nc7+, the king reply, and Nxa8. Then execute the sequence.",
    question: "Which response should you calculate first?",
    choices: [
      "Your opponent’s strongest legal defense",
      "The reply you hope they play",
    ],
    answer: 0,
    feedback:
      "This is a foundational calculation drill within the advanced track; it is not a claim of grandmaster difficulty.",
  },
  {
    id: "l24",
    title: "Avoid the stalemate",
    theme: "Stalemate",
    fen: "7k/8/5K2/6Q1/8/8/8/8 w - - 0 1",
    line: ["g5g7"],
    explanation:
      "Qg7 is checkmate: the queen checks and is defended by the king. A position with no legal moves and no check would instead be a draw.",
    hint: "Give check with Qg7, protected by the king.",
    rating: 400,
    level: 2,
    minutes: 5,
    intro:
      "When the enemy king has no legal moves, check makes all the difference. Find a checkmate rather than a stalemate: Qg7.",
    question: "No legal moves, but not in check: what is the result?",
    choices: ["Checkmate", "Draw by stalemate"],
    answer: 1,
    feedback: "Stalemate is a draw, even if one side has far more material.",
  },
  {
    id: "l25",
    title: "Discover an attack",
    theme: "Discovered attacks",
    fen: "4k3/8/8/8/8/4B3/8/K3R3 w - - 0 1",
    line: ["e3d4"],
    explanation:
      "Moving the bishop uncovers the rook’s line to the king. Always check what a piece was blocking before you move it.",
    hint: "Move the bishop off the e-file to d4.",
    rating: 700,
    level: 3,
    minutes: 5,
    intro:
      "A piece can hide an attack from another piece. Move Bd4 to reveal your rook’s check along the e-file.",
    question: "Which piece gives check after Bd4?",
    choices: ["The bishop on d4", "The rook on e1"],
    answer: 1,
    feedback:
      "The rook was already aimed at the king; moving the bishop uncovered its line.",
  },
  {
    id: "l26",
    title: "Take the opposition",
    theme: "King and pawn endings",
    fen: "8/4k3/8/8/4K3/4P3/8/8 b - - 0 1",
    line: ["e7e6"],
    explanation:
      "With the kings two squares apart on a file and White to move, Black holds direct opposition. White cannot step forward toward Black’s king.",
    hint: "Bring your king to e6, leaving one square between the kings.",
    rating: 1100,
    level: 4,
    minutes: 6,
    intro:
      "Opposition means using your king to deny the opposing king entry. Black to move: play Ke6 and leave White with the next decision.",
    question: "Who has the direct opposition after ...Ke6?",
    choices: [
      "Black, because White must move",
      "White, because White has a pawn",
    ],
    answer: 0,
    feedback:
      "With a single square between the kings, the player who does not have to move holds direct opposition.",
  },
  {
    id: "l27",
    title: "A checking skewer",
    theme: "Skewers",
    fen: "q7/k7/8/8/8/8/7K/1R6 w - - 0 1",
    line: ["b1a1", "a7b7", "a1a8"],
    explanation:
      "Ra1+ attacks the king in front of the queen. When the king moves off the a-file, the queen is exposed. Rxa8 wins it.",
    hint: "Move the rook to a1 with check, then capture the queen after the king moves.",
    rating: 800,
    level: 3,
    minutes: 5,
    intro:
      "A skewer attacks a valuable front piece and exposes a target behind it. Find Ra1+, then capture the queen after Black’s king moves.",
    question: "What makes this a skewer?",
    choices: [
      "The checking rook drives the king away from the queen",
      "The knight attacks two pieces",
    ],
    answer: 0,
    feedback: "The front piece must move, exposing the target behind it.",
  },
];

export const lessons: Lesson[] = [
  ...foundationLessons,
  ...expandedLessons,
  ...buildGrowthLessons([...foundationLessons, ...expandedLessons]),
].sort((a, b) => a.level - b.level);

export const openings: Opening[] = [
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    side: "White",
    line: "e4 e5 Nf3 Nc6 Bc4",
    idea: "Develop quickly, target f7, and prepare d4 with c3.",
    mistake: "Attacking f7 too early before completing development.",
  },
  {
    id: "ruy",
    name: "Ruy Lopez",
    eco: "C60",
    side: "White",
    line: "e4 e5 Nf3 Nc6 Bb5",
    idea: "Pressure the knight defending e5, castle, and prepare a central expansion.",
    mistake: "Assuming Bxc6 always wins the e5 pawn.",
  },
  {
    id: "scotch",
    name: "Scotch Game",
    eco: "C45",
    side: "White",
    line: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4",
    idea: "Open the center and use active pieces.",
    mistake: "Moving the queen early and losing development tempi.",
  },
  {
    id: "vienna",
    name: "Vienna Game",
    eco: "C25",
    side: "White",
    line: "e4 e5 Nc3 Nf6",
    idea: "Develop the queen’s knight and consider a timely f4.",
    mistake: "Playing f4 without checking the central counterstrike d5.",
  },
  {
    id: "kg",
    name: "King’s Gambit",
    eco: "C30",
    side: "White",
    line: "e4 e5 f4 exf4 Nf3",
    idea: "Trade a pawn for central control and rapid development.",
    mistake: "Ignoring king safety after weakening the f-file.",
  },
  {
    id: "qg",
    name: "Queen’s Gambit",
    eco: "D06",
    side: "White",
    line: "d4 d5 c4 e6 Nc3 Nf6",
    idea: "Pressure d5 and build central space.",
    mistake: "Trying to win the c4 pawn back at any cost.",
  },
  {
    id: "london",
    name: "London System",
    eco: "D02",
    side: "White",
    line: "d4 d5 Nf3 Nf6 Bf4",
    idea: "Develop the light bishop outside the e3 pawn chain.",
    mistake: "Playing the same setup without responding to threats.",
  },
  {
    id: "catalan",
    name: "Catalan Opening",
    eco: "E00",
    side: "White",
    line: "d4 Nf6 c4 e6 g3 d5 Bg2",
    idea: "Use the long diagonal to pressure the queenside.",
    mistake: "Forgetting that the c4 pawn may need protection.",
  },
  {
    id: "english",
    name: "English Opening",
    eco: "A10",
    side: "White",
    line: "c4 e5 Nc3 Nf6 g3",
    idea: "Control d5 and develop flexibly.",
    mistake: "Delaying central play while the opponent takes space.",
  },
  {
    id: "reti",
    name: "Réti Opening",
    eco: "A04",
    side: "White",
    line: "Nf3 d5 c4",
    idea: "Challenge the center from the flanks.",
    mistake: "Letting the opponent build a center without any pressure.",
  },
  {
    id: "sicilian",
    name: "Sicilian Defense",
    eco: "B20",
    side: "Black",
    line: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3",
    idea: "Trade a flank pawn for a central pawn and seek counterplay.",
    mistake: "Falling behind in development while collecting pawns.",
  },
  {
    id: "najdorf",
    name: "Sicilian: Najdorf",
    eco: "B90",
    side: "Black",
    line: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
    idea: "Prevent Nb5 and prepare flexible queenside expansion.",
    mistake: "Pushing too many pawns before securing the king.",
  },
  {
    id: "dragon",
    name: "Sicilian: Dragon",
    eco: "B70",
    side: "Black",
    line: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6",
    idea: "Activate the bishop on g7 and counterattack down the c-file.",
    mistake: "Ignoring the speed of a kingside pawn storm.",
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C00",
    side: "Black",
    line: "e4 e6 d4 d5 Nc3 Nf6",
    idea: "Attack the central pawn chain with c5 and sometimes f6.",
    mistake: "Leaving the light-squared bishop permanently passive.",
  },
  {
    id: "caro",
    name: "Caro-Kann Defense",
    eco: "B10",
    side: "Black",
    line: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5",
    idea: "Build a sound structure and develop the bishop before e6.",
    mistake: "Losing tempi by exposing the bishop to attacks.",
  },
  {
    id: "scandi",
    name: "Scandinavian Defense",
    eco: "B01",
    side: "Black",
    line: "e4 d5 exd5 Qxd5 Nc3 Qa5",
    idea: "Challenge e4 immediately and develop safely after the queen retreats.",
    mistake: "Moving the queen repeatedly while pieces remain at home.",
  },
  {
    id: "pirc",
    name: "Pirc Defense",
    eco: "B07",
    side: "Black",
    line: "e4 d6 d4 Nf6 Nc3 g6",
    idea: "Allow a broad center, then challenge it with e5 or c5.",
    mistake: "Remaining passive while White gains space for free.",
  },
  {
    id: "kid",
    name: "King’s Indian Defense",
    eco: "E60",
    side: "Black",
    line: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6",
    idea: "Strike the center with e5 or c5 and play dynamically.",
    mistake: "Launching a flank attack before stabilizing the center.",
  },
  {
    id: "qid",
    name: "Queen’s Indian Defense",
    eco: "E12",
    side: "Black",
    line: "d4 Nf6 c4 e6 Nf3 b6",
    idea: "Control central light squares with Bb7.",
    mistake: "Letting White establish e4 without a response.",
  },
  {
    id: "nimzo",
    name: "Nimzo-Indian Defense",
    eco: "E20",
    side: "Black",
    line: "d4 Nf6 c4 e6 Nc3 Bb4",
    idea: "Pin the knight and influence e4; choose structure deliberately.",
    mistake: "Giving up the bishop pair without gaining anything.",
  },
  {
    id: "grunfeld",
    name: "Grünfeld Defense",
    eco: "D80",
    side: "Black",
    line: "d4 Nf6 c4 g6 Nc3 d5",
    idea: "Invite a large center and attack it with pieces and pawn breaks.",
    mistake: "Underestimating White’s central space.",
  },
  {
    id: "dutch",
    name: "Dutch Defense",
    eco: "A80",
    side: "Black",
    line: "d4 f5 g3 Nf6 Bg2",
    idea: "Control e4 and create kingside possibilities.",
    mistake: "Neglecting the weakened diagonal toward the king.",
  },
  {
    id: "modern",
    name: "Modern Defense",
    eco: "B06",
    side: "Black",
    line: "e4 g6 d4 Bg7 Nc3 d6",
    idea: "Pressure the center from a distance while retaining flexibility.",
    mistake: "Allowing a huge center without planning a pawn break.",
  },
  {
    id: "alekhine",
    name: "Alekhine Defense",
    eco: "B02",
    side: "Black",
    line: "e4 Nf6 e5 Nd5 d4 d6",
    idea: "Invite pawns forward, then undermine them.",
    mistake: "Letting the knight get trapped by advancing pawns.",
  },
];

export const initialProgress: Progress = {
  focusSessions: [],
  practiceReminder: { enabled: false, time: "18:00", days: [1,2,3,4,5] },
  explainMoves: true,
  savedExercises: [],
  explanations: [],
  assessmentDraft: null,
  assessments: [],
  guidedSessions: [],
  onboarding: null,
  revenge: { positions: [], records: {} },
  arcade: { bests: { sprint: 0, survival: 0, vision: 0 }, history: [] },
  offlineImports: [],
  completed: [],
  puzzles: [],
  xp: 0,
  days: [],
  lessonDates: {},
  analyses: [],
  puzzleRating: 600,
  goal: "Reach 1200 Elo",
  minutes: 30,
  repertoire: [],
  reviews: {},
  games: [],
  accounts: {},
  theme: "light",
  boardTheme: "violet",
  dockStyle: "glass",
};
