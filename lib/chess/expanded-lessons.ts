import { Chess } from "chess.js";
import { libraryPuzzles } from "./puzzle-library.ts";
import type { Lesson } from "./content.ts";
type Spec = {
  id: string;
  title: string;
  theme: string;
  level: number;
  rating: number;
  fen?: string;
  prefix?: string[];
  moves: string[];
  intro: string;
  explanation: string;
  hint: string;
  question: string;
  choices: string[];
  feedback: string;
  minutes?: number;
};
const specs: Spec[] = [
  {
    id: "l28",
    title: "The pawn’s two-square start",
    theme: "Pawn movement",
    level: 1,
    rating: 100,
    moves: ["e4"],
    intro:
      "A pawn may advance two squares from its starting rank if both squares are empty. Move the e2 pawn to e4 to claim central space.",
    explanation:
      "The pawn advances from e2 to e4. On later turns it can advance only one square at a time, and captures still move diagonally.",
    hint: "Select e2, then e4.",
    question: "When may a pawn advance two squares?",
    choices: [
      "On its first move, when both squares are clear",
      "Whenever its path is clear",
      "Only after a capture",
    ],
    feedback:
      "The two-square option belongs to a pawn that has not yet moved, on its starting rank.",
  },
  {
    id: "l29",
    title: "Jump over the traffic",
    theme: "Piece movement",
    level: 1,
    rating: 150,
    moves: ["Nc3"],
    intro:
      "The starting pieces look crowded, but knights can jump. Develop the b1 knight to c3 without moving any pawn first.",
    explanation:
      "Nc3 jumps over the surrounding pieces. A knight only needs an available destination; intervening pieces do not block its L-shaped move.",
    hint: "The knight on b1 can land on c3.",
    question: "Which piece can jump over other pieces?",
    choices: ["The knight", "The bishop", "The rook"],
    feedback: "A knight jumps. Sliding pieces need a clear path.",
  },
  {
    id: "l30",
    title: "A rook needs a clear road",
    theme: "Piece movement",
    level: 1,
    rating: 150,
    fen: "4k3/8/8/8/8/8/P7/R3K3 w - - 0 1",
    moves: ["Rd1"],
    intro:
      "The a2 pawn blocks your rook’s route up the a-file. Find a clear horizontal route instead: move Ra1 to d1.",
    explanation:
      "Rd1 follows the clear first rank. The rook could not jump over its own a2 pawn to travel up the file.",
    hint: "Move the a1 rook to d1.",
    question: "Why is Ra4 impossible here?",
    choices: [
      "Your own pawn blocks the a-file",
      "Rooks can move only one square",
      "Rooks move diagonally",
    ],
    feedback: "A rook cannot pass through any occupied square.",
  },
  {
    id: "l31",
    title: "A small pawn, a valuable capture",
    theme: "Piece values",
    level: 1,
    rating: 250,
    fen: "7k/8/8/4q3/3P4/8/8/K7 w - - 0 1",
    moves: ["dxe5"],
    intro:
      "Piece values help compare exchanges. Your pawn can capture an undefended queen on e5. Play dxe5.",
    explanation:
      "A pawn, usually valued at one point, captures a queen, usually valued at nine. Values are guidelines; checkmate and concrete tactics take priority.",
    hint: "Your d4 pawn captures diagonally to e5.",
    question: "Which piece usually has the highest material value?",
    choices: ["The queen", "A rook", "A bishop"],
    feedback:
      "A queen is usually valued at nine points. The king has no trade value because it cannot be captured.",
  },
  {
    id: "l32",
    title: "Put something between the check",
    theme: "Check defense",
    level: 1,
    rating: 250,
    fen: "4r2k/8/8/8/8/8/R7/4K3 w - - 0 1",
    moves: ["Re2"],
    intro:
      "The e8 rook checks your king down the e-file. Move your a2 rook to e2 to block that line.",
    explanation:
      "Re2 places a piece between the attacking rook and the king. A line check can sometimes be blocked; a knight check cannot.",
    hint: "Use the second rank to block on e2.",
    question: "Which action can answer a rook’s line check?",
    choices: [
      "Interpose a piece on the checking line",
      "Ignore it and attack the queen",
      "Move any pawn",
    ],
    feedback:
      "A legal response must end the check: move the king, capture the attacker, or block its line when possible.",
  },
  {
    id: "l33",
    title: "Castle on the queenside",
    theme: "Castling",
    level: 1,
    rating: 300,
    fen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1",
    moves: ["O-O-O"],
    intro:
      "Castling can also move the king toward the a-file rook. Move the king from e1 to c1 and watch the rook land on d1.",
    explanation:
      "Queenside castling moves the king two squares, to c1, and the rook to d1. Both pieces must retain castling rights, with a clear and safe king route.",
    hint: "Move the king, not the rook: e1 to c1.",
    question: "Where does White’s king land after queenside castling?",
    choices: ["c1", "b1", "d1"],
    feedback: "The king lands on c1 and the rook lands on d1.",
  },
  {
    id: "l34",
    title: "Never castle through an attack",
    theme: "Castling safety",
    level: 1,
    rating: 350,
    fen: "4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1",
    moves: ["O-O-O"],
    intro:
      "The black f8 rook attacks f1. Kingside castling would cross that attacked square. Castle queenside, along the safe route.",
    explanation:
      "Even an empty route is not enough: your king may not castle while checked, through check, or into check. The f-file attack prevents O-O in this position.",
    hint: "Choose the c1 destination for your king.",
    question: "Can a king castle through an attacked square?",
    choices: [
      "No",
      "Yes, if the destination is safe",
      "Yes, if the rook is safe",
    ],
    feedback:
      "The king’s starting, crossing, and destination squares must all be safe.",
  },
  {
    id: "l35",
    title: "Give your king an escape square",
    theme: "King safety",
    level: 2,
    rating: 450,
    fen: "5rk1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    moves: ["h3"],
    intro:
      "A king behind unmoved pawns can run out of escape squares on the back rank. Play h3 to make h2 available for a future escape.",
    explanation:
      "The h-pawn move creates luft: an escape square on h2. Such pawn moves still need a tactical safety check; they are not automatic in every position.",
    hint: "Move the h2 pawn one square.",
    question: "What is the main idea of h3 here?",
    choices: [
      "Create a possible king escape on h2",
      "Win a rook immediately",
      "Allow castling again",
    ],
    feedback:
      "A small pawn move can prevent back-rank trouble by making an escape square.",
  },
  {
    id: "l36",
    title: "Develop while creating pressure",
    theme: "Opening principles",
    level: 2,
    rating: 500,
    prefix: ["e4", "e5", "Nf3", "Nc6"],
    moves: ["Bb5"],
    intro:
      "Develop a bishop with a useful target. Play Bb5, putting pressure on the knight that helps defend e5.",
    explanation:
      "Bb5 develops a piece and attacks c6. The d7 pawn still lies between c6 and the king, so this is not yet an absolute pin.",
    hint: "The f1 bishop has a clear diagonal to b5.",
    question: "What does Bb5 accomplish immediately?",
    choices: [
      "Develops a bishop and pressures the c6 knight",
      "Checkmates the king",
      "Creates an absolute pin through the d7 pawn",
    ],
    feedback:
      "Development with pressure is useful. Check the entire line before calling an attack a pin.",
  },
  {
    id: "l37",
    title: "Open the center with a plan",
    theme: "Central breaks",
    level: 2,
    rating: 550,
    prefix: ["e4", "e5", "Nf3", "Nc6"],
    moves: ["d4", "exd4", "Nxd4"],
    intro:
      "Challenge the e5 pawn with d4. After Black captures, recapture with your developed knight to occupy the center.",
    explanation:
      "The Scotch-style d4 break opens central lines. Nxd4 restores material and places an active piece in the center.",
    hint: "First d2–d4, then recapture the d4 pawn with Nf3.",
    question: "Why is Nxd4 useful after the exchange?",
    choices: [
      "It restores material and centralizes a developed piece",
      "It forces mate immediately",
      "It lets a pawn move backward",
    ],
    feedback:
      "A central break needs a follow-up. Here the knight recapture keeps development active.",
  },
  {
    id: "l38",
    title: "Develop the bishop before closing it in",
    theme: "Opening planning",
    level: 2,
    rating: 550,
    prefix: ["d4", "d5"],
    moves: ["Bf4", "Nf6", "e3"],
    intro:
      "A London-style setup develops the c1 bishop before playing e3. Play Bf4, then support the center with e3 after Black develops.",
    explanation:
      "Moving the bishop first avoids shutting it behind the e3 pawn. The setup is flexible; still react to the opponent’s threats.",
    hint: "Develop Bc1–f4 before e2–e3.",
    question: "Why develop the c1 bishop before e3?",
    choices: [
      "To avoid blocking its useful diagonal",
      "Because bishops may jump over pawns",
      "Because e3 would be illegal",
    ],
    feedback:
      "Move order can help pieces reach active squares before a pawn blocks their path.",
  },
  {
    id: "l39",
    title: "Answer a flank move with central play",
    theme: "Opening principles",
    level: 2,
    rating: 500,
    prefix: ["a3"],
    moves: ["e5", "Nf3", "Nc6"],
    intro:
      "White has spent a move on the flank. As Black, claim central space with e5, then develop the b8 knight after Nf3.",
    explanation:
      "Central influence and development remain valuable against unusual opening moves. There is no need to invent an immediate punishment for every harmless flank move.",
    hint: "First e7–e5, then Nb8–c6.",
    question: "What is a reliable response to a harmless flank move?",
    choices: [
      "Improve the center and development",
      "Move the queen repeatedly",
      "Ignore all future threats",
    ],
    feedback:
      "Sound development is often more useful than trying to force a premature attack.",
  },
  {
    id: "l40",
    title: "Recapture toward the center",
    theme: "Pawn structure",
    level: 2,
    rating: 600,
    fen: "4k3/8/8/8/8/2n5/1P6/4K3 w - - 0 1",
    moves: ["bxc3"],
    intro:
      "Your b-pawn can capture the knight on c3. Make the capture and notice how the pawn moves toward the central files.",
    explanation:
      "bxc3 wins the knight and brings a pawn inward. Recapturing toward the center is a useful guideline, though concrete tactics always come first.",
    hint: "The b2 pawn captures on c3.",
    question: "Which file does the b-pawn reach?",
    choices: ["The c-file", "The a-file", "The b-file"],
    feedback: "The b-pawn moves diagonally to c3, closer to the center.",
  },
  {
    id: "l41",
    title: "Build a connected pawn front",
    theme: "Pawn structure",
    level: 3,
    rating: 700,
    fen: "7k/8/8/8/3P4/2P5/8/4K3 w - - 0 1",
    moves: ["c4"],
    intro:
      "Connected pawns can support one another as they advance. Move c3–c4 to create a side-by-side pawn front with d4.",
    explanation:
      "The c4 and d4 pawns remain connected. If one advances a square, the other can support it diagonally. Always check what squares a pawn move weakens.",
    hint: "Advance the c-pawn one square.",
    question: "What is an advantage of connected pawns?",
    choices: [
      "They can support each other as they advance",
      "They can move backward",
      "They cannot be captured",
    ],
    feedback:
      "Neighboring pawns can coordinate their advances and support one another.",
  },
  {
    id: "l42",
    title: "Repair doubled pawns with a capture",
    theme: "Pawn structure",
    level: 3,
    rating: 700,
    fen: "4k3/8/8/8/3p4/2P5/2P5/4K3 w - - 0 1",
    moves: ["cxd4"],
    intro:
      "Your c-pawns are doubled. Capture the black pawn on d4 with the front pawn, moving it onto a neighboring file.",
    explanation:
      "cxd4 leaves pawns on c2 and d4 instead of two c-pawns. This improves their flexibility while winning the pawn.",
    hint: "The c3 pawn captures diagonally onto d4.",
    question: "Are the white pawns still doubled after cxd4?",
    choices: [
      "No, they occupy different files",
      "Yes, both are on the c-file",
      "Pawns never become doubled",
    ],
    feedback:
      "Doubled pawns share a file. The capture moves the front pawn onto the d-file.",
  },
  {
    id: "l43",
    title: "Make an outside passer count",
    theme: "Passed pawns",
    level: 3,
    rating: 750,
    fen: "4k3/8/2p5/P7/3P4/8/8/4K3 w - - 0 1",
    moves: ["a6"],
    intro:
      "The a-pawn has no opposing pawn in its path or neighboring file. Push it to a6 and see how far it is from the central pawn struggle.",
    explanation:
      "An outside passed pawn can distract the defending king from another part of the board. Whether it wins depends on the full position and timing.",
    hint: "Advance the outside a-pawn.",
    question: "Why can an outside passed pawn be useful?",
    choices: [
      "It can draw the enemy king away from other targets",
      "It can move two squares on every turn",
      "It is automatically a queen",
    ],
    feedback:
      "Its distance from the main action can force a difficult defensive choice.",
  },
  {
    id: "l44",
    title: "Protect the advanced passer",
    theme: "Passed pawns",
    level: 3,
    rating: 800,
    fen: "7k/8/4P3/8/3P4/8/8/4K3 w - - 0 1",
    moves: ["d5"],
    intro:
      "Your e6 pawn is advanced but not protected by the d4 pawn. Move d4–d5 so the d-pawn supports e6 diagonally.",
    explanation:
      "After d5, the e6 pawn is a protected passed pawn. The supporting pawn makes it harder for a king to capture the advanced pawn.",
    hint: "Push d4 to d5 to attack e6 with your pawn.",
    question: "Which square does a white pawn on d5 protect?",
    choices: ["e6", "e4", "d6"],
    feedback: "White pawns attack diagonally forward: c6 and e6 from d5.",
  },
  {
    id: "l45",
    title: "Capture with a forcing check",
    theme: "Forcing moves",
    level: 2,
    rating: 650,
    fen: "4k3/8/8/4q3/8/8/8/4R1K1 w - - 0 1",
    moves: ["Rxe5+"],
    intro:
      "Checks deserve an early look because they restrict replies. Capture the queen on e5 with your rook, giving check along the e-file.",
    explanation:
      "Rxe5+ wins the queen and checks the king. The opponent must answer the check before pursuing another plan.",
    hint: "The e1 rook can capture up its open file.",
    question: "Why is a checking capture forcing?",
    choices: [
      "The opponent must answer the check",
      "It lets your opponent ignore the king",
      "Every checking capture is checkmate",
    ],
    feedback:
      "A check forces a legal response to the threat against the king. It is not automatically mate.",
  },
  {
    id: "l46",
    title: "Invade the seventh rank",
    theme: "Rook activity",
    level: 3,
    rating: 850,
    fen: "6k1/pp3ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    moves: ["Rd7"],
    intro:
      "A rook on the seventh rank can attack pawns from the side. Bring your rook from d1 to d7.",
    explanation:
      "Rd7 creates lateral pressure against the pawns on the seventh rank and can restrict the opposing king. Rook activity often matters as much as a small material count.",
    hint: "Use the open d-file to reach d7.",
    question: "What does a rook on the seventh often attack?",
    choices: [
      "Unmoved enemy pawns from the side",
      "Only its own king",
      "Only diagonally placed pieces",
    ],
    feedback:
      "Pawns on the seventh rank become lateral targets for an invading rook.",
  },
  {
    id: "l47",
    title: "Double rooks on an open file",
    theme: "Open files",
    level: 3,
    rating: 850,
    fen: "6k1/8/8/8/8/8/R7/4R1K1 w - - 0 1",
    moves: ["Rae2"],
    intro:
      "Your e1 rook already occupies the open e-file. Move the a2 rook to e2 to double your rooks on that file.",
    explanation:
      "The rear rook supports the front rook along the file. Doubling can prepare an invasion, but check that the front rook has useful entry squares.",
    hint: "Move Ra2 to e2.",
    question: "What is the purpose of doubling rooks?",
    choices: [
      "Coordinate pressure and support an invasion",
      "Make rooks move diagonally",
      "Restore castling rights",
    ],
    feedback: "Two rooks on one open file can reinforce each other’s activity.",
  },
  {
    id: "l48",
    title: "Centralize a queen in the ending",
    theme: "Piece activity",
    level: 3,
    rating: 900,
    fen: "6k1/2ppp3/8/8/8/8/8/3Q2K1 w - - 0 1",
    moves: ["Qd4"],
    intro:
      "This reduced-material position gives the queen room to work. Place her on d4, influencing lines in several directions.",
    explanation:
      "A centralized queen can reach both wings quickly. This endgame idea does not mean that early queen moves are always wise in the opening.",
    hint: "Move the queen straight up the d-file to d4.",
    question: "When is queen centralization useful?",
    choices: [
      "When the square is safe and supports useful targets",
      "Only on the first move",
      "Even if it loses the queen",
    ],
    feedback:
      "Activity needs safety. Evaluate threats before placing a valuable piece centrally.",
  },
  {
    id: "l49",
    title: "Remove the forking knight",
    theme: "Defensive tactics",
    level: 3,
    rating: 950,
    fen: "4k3/8/8/4n3/8/3Q1KB1/8/8 w - - 0 1",
    moves: ["Bxe5"],
    intro:
      "The e5 knight checks your king and attacks your queen on d3. Capture that knight with the g3 bishop to answer both threats.",
    explanation:
      "Bxe5 removes the checking piece and saves the queen from the fork. A knight check cannot be blocked by interposing another piece.",
    hint: "The g3 bishop has a diagonal to e5.",
    question: "Can a knight check be blocked by interposition?",
    choices: [
      "No; move the king or capture the checking piece",
      "Yes, on the square between the knight and king",
      "Only by a rook",
    ],
    feedback: "A knight jumps, so there is no checking line to block.",
  },
  {
    id: "l50",
    title: "Simplify with a plan",
    theme: "Exchanges",
    level: 3,
    rating: 950,
    fen: "8/p7/4k3/3q4/PP5P/3Q4/4K3/8 w - - 0 1",
    moves: ["Qxd5+", "Kxd5", "Kd3"],
    intro:
      "You have extra pawns. Exchange queens on d5, then bring your king into the resulting pawn ending.",
    explanation:
      "Queen exchanges can reduce the opponent’s attacking chances when you are ahead. Always assess the resulting king-and-pawn position before trading.",
    hint: "Exchange on d5, then centralize your king to d3.",
    question: "What should you examine before a queen exchange?",
    choices: [
      "The position that remains after the exchange",
      "Only the number of checks available now",
      "Whether your queen has moved before",
    ],
    feedback:
      "An exchange changes the type of position. Evaluate the resulting ending, not just the trade itself.",
  },
  {
    id: "l51",
    title: "Underpromote with check",
    theme: "Underpromotion",
    level: 3,
    rating: 1000,
    fen: "8/2P1k3/8/8/8/8/8/K7 w - - 0 1",
    moves: ["c8=N+"],
    intro:
      "Promotion offers four piece choices. In this movement example, promote c7–c8 to a knight and give check to the king on e7.",
    explanation:
      "A knight on c8 attacks e7. Underpromotion should serve a concrete purpose; a queen is usually strongest, so do not underpromote automatically.",
    hint: "Choose the knight from the promotion picker.",
    question: "Which newly promoted piece gives this L-shaped check?",
    choices: ["A knight", "A bishop", "A rook"],
    feedback: "The checking pattern comes from the knight’s L-shaped attack.",
  },
  {
    id: "l52",
    title: "Keep a reserve pawn tempo",
    theme: "Opposition and tempo",
    level: 4,
    rating: 1100,
    fen: "8/8/4k3/8/4K3/8/P7/8 w - - 0 1",
    moves: ["a3"],
    intro:
      "The kings face each other with one square between them. Use the a-pawn’s spare move to make Black move without shifting your king.",
    explanation:
      "A reserve pawn move can change whose turn it is in a king opposition position. Whether that wins or draws depends on the rest of the ending.",
    hint: "Use a2–a3 as a waiting move.",
    question: "What changes after the waiting move a3?",
    choices: [
      "Black must move while White keeps the king in place",
      "White gets a second consecutive turn",
      "The kings may become adjacent",
    ],
    feedback:
      "A useful spare tempo can transfer the obligation to move to the opponent.",
  },
  {
    id: "l53",
    title: "Catch the pawn from inside its square",
    theme: "Pawn endings",
    level: 4,
    rating: 1100,
    fen: "8/7k/8/4P3/8/8/8/K7 b - - 0 1",
    moves: ["Kg6", "e6", "Kf6", "e7", "Kxe7"],
    intro:
      "As Black, take the direct route toward the pawn’s promotion path. Start with Kg6, then follow the pawn and capture it before promotion.",
    explanation:
      "The king reaches the pawn in time because it enters the pawn’s square. The final capture leaves only kings, which is a draw by insufficient material.",
    hint: "Kg6, then Kf6, then capture on e7.",
    question: "What is the result after the final pawn is captured?",
    choices: [
      "A draw: only the two kings remain",
      "Checkmate for Black",
      "Automatic promotion for White",
    ],
    feedback:
      "Two bare kings cannot checkmate each other. The position is drawn.",
  },
  {
    id: "l54",
    title: "Bring the king into the ending",
    theme: "King activity",
    level: 3,
    rating: 900,
    fen: "8/5k2/2pp4/8/2PP4/8/5K2/8 w - - 0 1",
    moves: ["Ke3"],
    intro:
      "With queens and rooks gone, the king can help in the center. Move Kf2–e3 to support your pawns and approach the action.",
    explanation:
      "An active king can defend pawns and attack weaknesses. It still must avoid attacked squares, especially those controlled by enemy pawns.",
    hint: "Centralize the king one diagonal step to e3.",
    question: "Why is king activity more important in many endings?",
    choices: [
      "Fewer major-piece attacks let the king assist pawns",
      "Kings may ignore check",
      "Kings can move twice",
    ],
    feedback:
      "Reduced material often makes central king activity both safer and more useful.",
  },
  {
    id: "l55",
    title: "Place the rook behind your passer",
    theme: "Rook endings",
    level: 4,
    rating: 1200,
    fen: "5rk1/8/8/P7/8/8/8/1R4K1 w - - 0 1",
    moves: ["Ra1"],
    intro:
      "A rook can support a passed pawn from behind. Move Rb1–a1 to line up with your a5 pawn.",
    explanation:
      "From behind, the rook can keep supporting a passed pawn as it advances. This is a guideline; tactical threats and king safety still take priority.",
    hint: "Shift the rook one file left, onto a1.",
    question: "Why is a rook often useful behind its own passed pawn?",
    choices: [
      "It can continue supporting the pawn as it advances",
      "It makes the pawn immune to capture",
      "It changes the pawn’s promotion rank",
    ],
    feedback:
      "The rook’s long-range support remains useful as the pawn moves forward.",
  },
  {
    id: "l56",
    title: "Cut the defending king off",
    theme: "Rook endings",
    level: 4,
    rating: 1250,
    fen: "8/2k5/8/7P/8/8/7R/6K1 w - - 0 1",
    moves: ["Re2"],
    intro:
      "Your h-pawn is far from the black king. Move Rh2–e2 to create a rook barrier on the e-file.",
    explanation:
      "The e-file barrier makes it harder for the king on c7 to approach the h-pawn. Rooks can restrict kings as well as attack pawns.",
    hint: "Use the second rank to reach e2.",
    question: "How does a rook cut a king off?",
    choices: [
      "By controlling a line the king cannot cross safely",
      "By occupying every square at once",
      "By preventing all pawn moves",
    ],
    feedback:
      "A king may not cross an attacked file or rank without first neutralizing the rook’s control.",
  },
  {
    id: "l57",
    title: "A bishop reaches the other wing",
    theme: "Bishop endings",
    level: 3,
    rating: 1000,
    fen: "7k/1p6/8/P7/8/8/6B1/6K1 w - - 0 1",
    moves: ["Bxb7"],
    intro:
      "An open diagonal lets a bishop act across the board. Capture the b7 pawn from g2, helping your distant a-pawn.",
    explanation:
      "Bxb7 crosses the whole board along one clear diagonal. Bishops can be effective when play occurs on both wings and the lines are open.",
    hint: "Follow g2–f3–e4–d5–c6–b7.",
    question: "What helps a bishop work across both wings?",
    choices: [
      "Open diagonals",
      "A blocked diagonal",
      "The ability to change square color",
    ],
    feedback:
      "A bishop’s speed comes from long, clear diagonals; it always stays on one color.",
  },
  {
    id: "l58",
    title: "Give an idle knight a route",
    theme: "Knight planning",
    level: 3,
    rating: 1000,
    fen: "6k1/ppp5/8/8/8/8/PPP5/1N4K1 w - - 0 1",
    moves: ["Nd2", "Kf7", "Nc4"],
    intro:
      "The b1 knight needs a route toward active squares. Play Nd2 and, after Black’s king move, continue Nc4.",
    explanation:
      "Knights improve through a sequence of useful squares. Planning a route is often more important than making an isolated one-move threat.",
    hint: "Nb1–d2–c4 is the route.",
    question: "Why plan a knight route?",
    choices: [
      "A knight may need several moves to reach a useful square",
      "A knight can move only once per game",
      "Knights can slide along a diagonal",
    ],
    feedback:
      "Knights travel in jumps, so finding a route helps coordinate them with the rest of the position.",
  },
  {
    id: "l59",
    title: "Force a back-rank block",
    theme: "Mate in 2",
    level: 3,
    rating: 1150,
    fen: "6k1/3q1ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
    moves: ["Rb8+", "Qd8", "Rxd8#"],
    intro:
      "Black’s king has no flight square. Invade with Rb8+, then capture the queen when it blocks on d8.",
    explanation:
      "The rook’s check forces a response on the back rank. After the illustrated Qd8 block, Rxd8 is mate. A block on e8 can be answered by Rxe8# as well.",
    hint: "Check from b8, then remove the blocking queen.",
    question: "Why can Black’s king not escape to the seventh rank?",
    choices: [
      "Its own pawns occupy those escape squares",
      "Kings cannot move to rank seven",
      "The queen blocks the entire seventh rank",
    ],
    feedback:
      "The f7, g7, and h7 pawns restrict their own king’s flight squares.",
  },
];
function authored(spec: Spec, index: number): Lesson {
  const game = new Chess();
  if (spec.fen) game.load(spec.fen);
  else for (const san of spec.prefix || []) game.move(san);
  const fen = game.fen();
  const line = spec.moves.map((san) => {
    const m = (() => {
      try {
        return game.move(san);
      } catch (e) {
        throw new Error(spec.id + ": " + (e as Error).message);
      }
    })();
    return m.from + m.to + (m.promotion || "");
  });
  const shift = index % spec.choices.length;
  const choices = [
    ...spec.choices.slice(shift),
    ...spec.choices.slice(0, shift),
  ];
  return {
    ...spec,
    fen,
    line,
    minutes: spec.minutes || 4,
    answer: (spec.choices.length - shift) % spec.choices.length,
    choices,
  };
}
const applied = [
  [
    "fork",
    "A double attack under pressure",
    "A fork attacks two targets at once. Checks are especially useful because the king must respond before the other target can be saved.",
    "What makes a checking fork especially forcing?",
    "The opponent must answer the king’s check",
    "The knight becomes impossible to capture",
    "Both players move at once",
  ],
  [
    "pin",
    "Put the pin to work",
    "A pinned piece may be unable to move safely or may be unable to move legally if it exposes the king. Look for ways to exploit its limited freedom.",
    "What is an absolute pin?",
    "Moving the pinned piece would expose its own king",
    "A piece has no legal captures",
    "Any attack against a queen",
  ],
  [
    "skewer",
    "Attack the front target first",
    "A skewer attacks a valuable front piece to expose something behind it. Calculate the forced reply and the second capture.",
    "What distinguishes a skewer?",
    "The front piece moves away and exposes another target",
    "A knight jumps over a pawn",
    "A pawn reaches the last rank",
  ],
  [
    "discoveredAttack",
    "Uncover a second threat",
    "Moving one piece can open an attack by another. Check both threats after the move, not just the destination of the moving piece.",
    "What creates a discovered attack?",
    "A moving piece uncovers the line of a second piece",
    "A rook moves backward",
    "A king castles",
  ],
  [
    "deflection",
    "Distract an essential defender",
    "A defender may be doing an important job. Calculate forcing moves that pull it away, then exploit the square or piece it had protected.",
    "What is the goal of deflection?",
    "Draw a defender away from its duty",
    "Move every pawn forward",
    "Force an exchange in every position",
  ],
  [
    "attraction",
    "Invite the king onto the wrong square",
    "A decoy draws a piece onto a specific vulnerable square. Look at the forcing move and the follow-up together before deciding whether a sacrifice is sound.",
    "How does a decoy work?",
    "It draws a target onto a tactically vulnerable square",
    "It makes every sacrifice correct",
    "It lets a king move into check",
  ],
  [
    "interference",
    "Break the line of communication",
    "An interference move blocks a useful line between enemy pieces. Identify the line, then calculate whether cutting it creates a concrete threat.",
    "What does interference disrupt?",
    "A line of coordination between enemy pieces",
    "The turn order",
    "The move counter only",
  ],
  [
    "clearance",
    "Make room for the decisive piece",
    "A piece can be obstructing a square or line needed by another. A forcing clearance move makes that resource available with tempo.",
    "What does a clearance move make available?",
    "A square or line for another useful move",
    "An extra turn without a reply",
    "Automatic castling rights",
  ],
  [
    "capturingDefender",
    "Remove the defender before the target",
    "Before taking an important target, check what protects it. A forcing capture of the defender can make the second threat work.",
    "Why remove a defender first?",
    "To weaken the protection of another target",
    "To make the king capturable",
    "To make all exchanges equal",
  ],
  [
    "defensiveMove",
    "Find a resource before resigning",
    "Defense begins with the opponent’s concrete threat. Look for checks, trades, blocks, or counterattacks that neutralize it.",
    "What should a defensive move address first?",
    "The opponent’s most urgent concrete threat",
    "Only a distant opening plan",
    "Any harmless pawn move",
  ],
  [
    "quietMove",
    "A threat without a check",
    "Not every combination starts with a capture or check. A quiet move can create a threat that the opponent cannot adequately meet.",
    "Can a quiet move be a tactical move?",
    "Yes, if it creates a concrete forcing threat",
    "No, tactics always begin with check",
    "Only if it moves a pawn",
  ],
  [
    "underPromotion",
    "Choose the promotion that solves it",
    "Queen promotion is normally strongest, but a specific knight, rook, or bishop may avoid a draw or create the required tactic. Calculate the exact purpose.",
    "When is underpromotion justified?",
    "When the chosen piece solves a concrete tactical problem",
    "Whenever you want a lower material value",
    "Because queens cannot give check",
  ],
  [
    "smotheredMate",
    "Close the king’s last exits",
    "A smothered mate uses a knight against a king boxed in by its own pieces. Trace the knight’s attacks and the king’s occupied escape squares.",
    "What usually boxes the king in during a smothered mate?",
    "Its own pieces",
    "Only an empty board",
    "A pawn’s backward move",
  ],
  [
    "advancedPawn",
    "Calculate the pawn race completely",
    "A dangerous advanced pawn can create forcing threats. Count promotion moves, check captures on the route, and consider checks that gain time.",
    "What should you calculate in a pawn race?",
    "Promotion timing and forcing replies for both sides",
    "Only your own next pawn move",
    "Only the material count at the start",
  ],
  [
    "sacrifice",
    "Calculate compensation before sacrificing",
    "Giving up material needs a concrete justification: a forced mate, material recovery, or durable compensation. Work through the verified continuation rather than relying on appearance.",
    "What makes a sacrifice worth considering?",
    "A calculated benefit or sufficient compensation",
    "The fact that a piece is offered",
    "A dramatic-looking move alone",
  ],
  [
    "backRankMate",
    "Build a back-rank combination",
    "A trapped king makes the back rank tactically sensitive. Check entry squares, blockers, and possible interpositions before choosing your forcing sequence.",
    "What should you check before a back-rank combination?",
    "The king’s escapes and all possible blocks",
    "Only the rook’s material value",
    "Whether the move looks impressive",
  ],
] as const;
const used = new Set<string>();
const tactical: Lesson[] = [];
for (const [tag, title, intro, question, correct, wrong1, wrong2] of applied) {
  const p = libraryPuzzles
    .filter((p) => p.themes?.includes(tag) && !used.has(p.id))
    .sort((a, b) => Math.abs(a.rating - 1500) - Math.abs(b.rating - 1500))[0];
  if (!p) continue;
  used.add(p.id);
  const index = tactical.length;
  const choices = [correct, wrong1, wrong2];
  const shift = index % 3;
  tactical.push({
    ...p,
    id: "applied-" + tag,
    title,
    level: p.rating < 1300 ? 3 : p.rating < 1700 ? 4 : p.rating < 2000 ? 5 : 6,
    minutes: 6,
    intro:
      intro +
      " Play the published solution on the board, accounting for each reply.",
    hint: p.hint,
    explanation:
      intro +
      " The sequence you just played is the published, legally validated solution for this position.",
    question,
    choices: [...choices.slice(shift), ...choices.slice(0, shift)],
    answer: (3 - shift) % 3,
    feedback:
      correct +
      ". Use the concrete board position to explain why the idea works.",
  });
}
export const expandedLessons: Lesson[] = [...specs.map(authored), ...tactical];
const deeper = [
  {
    id: "deep-best-reply",
    title: "Calculate the opponent’s best reply",
    intro:
      "A combination must survive the opponent’s strongest defense, not just the reply you hope to see. In this harder position, compare forcing moves and track what changes after every response.",
    question: "Which reply should you test when checking a combination?",
    correct: "The opponent’s strongest legal defense",
    wrong: ["Only the reply that helps your idea", "Only a random king move"],
    level: 5,
    test: (p: Lesson) => p.rating >= 1800 && p.line.length >= 5,
  },
  {
    id: "deep-candidates",
    title: "Choose candidates before calculating",
    intro:
      "Begin with a short list of plausible candidate moves. Check forcing moves, but keep a quiet move if it creates a stronger threat. Calculate the published line before committing to the first move.",
    question: "Why make a candidate-move list?",
    correct: "To compare a few plausible choices before committing",
    wrong: [
      "To avoid considering threats",
      "To guarantee the first move is correct",
    ],
    level: 5,
    test: (p: Lesson) => p.rating >= 1850 && p.line.length >= 3,
  },
  {
    id: "deep-visualization",
    title: "Keep the changing board in your head",
    intro:
      "Longer calculations demand a precise picture of each resulting position. After every capture, remove the captured piece from your mental board and update open lines before continuing.",
    question: "What should you update after a capture during calculation?",
    correct: "The removed piece, changed attackers, and newly open lines",
    wrong: ["Only the move number", "Only the location of your king"],
    level: 5,
    test: (p: Lesson) => p.rating >= 1800 && p.line.length >= 7,
  },
  {
    id: "deep-reassess",
    title: "Reassess after a forcing exchange",
    intro:
      "An exchange can change which pieces defend a target and which lines are open. Calculate through the recapture, then evaluate the resulting position rather than stopping at the first apparent gain.",
    question: "When should you evaluate the result of a forcing exchange?",
    correct: "After the important recaptures and forcing replies",
    wrong: [
      "Before the opponent can recapture",
      "Only from the appearance of the sacrifice",
    ],
    level: 5,
    test: (p: Lesson) => p.rating >= 1800 && p.line.length >= 5,
  },
  {
    id: "deep-defense",
    title: "Find an active defensive resource",
    intro:
      "In a difficult position, a forcing check or counterattack can be a defensive resource. Identify the immediate threat, then calculate the strongest active way to meet it. This is practical defensive calculation, not a promise that every difficult position is drawable.",
    question: "What makes an active defensive move useful?",
    correct:
      "It meets the threat while creating a concrete problem for the opponent",
    wrong: [
      "It ignores an immediate mate",
      "It guarantees a draw in every position",
    ],
    level: 6,
    test: (p: Lesson) =>
      p.rating >= 1900 &&
      (p.themes?.includes("defensiveMove") || p.themes?.includes("equality")),
  },
  {
    id: "deep-finish",
    title: "Finish the line before judging it",
    intro:
      "Do not judge a combination from its first dramatic move. Continue through the forcing replies until you can assess material, king safety, and the next threat with reasonable confidence.",
    question: "Why calculate beyond the first sacrifice?",
    correct: "To see whether the resulting position actually justifies it",
    wrong: [
      "Because every sacrifice is brilliant",
      "To avoid considering the opponent’s reply",
    ],
    level: 6,
    test: (p: Lesson) => p.rating >= 1950 && p.line.length >= 5,
  },
];
for (const [index, spec] of deeper.entries()) {
  const p = libraryPuzzles
    .filter((p) => !used.has(p.id) && spec.test(p as Lesson))
    .sort((a, b) => Math.abs(a.rating - 2050) - Math.abs(b.rating - 2050))[0];
  if (!p) continue;
  used.add(p.id);
  const options = [spec.correct, ...spec.wrong];
  const shift = index % 3;
  expandedLessons.push({
    ...p,
    id: spec.id,
    title: spec.title,
    level: spec.level,
    minutes: 8,
    intro: spec.intro,
    hint: "Start with checks, captures, and threats. Calculate the strongest reply before playing.",
    explanation:
      spec.intro +
      " Replay the verified source line to reinforce the calculation.",
    question: spec.question,
    choices: [...options.slice(shift), ...options.slice(0, shift)],
    answer: (3 - shift) % 3,
    feedback:
      spec.correct +
      ". Use this principle to explain the line you just played.",
  });
}
