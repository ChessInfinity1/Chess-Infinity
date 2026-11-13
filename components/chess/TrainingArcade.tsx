"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  Timer,
  Heart,
  Target,
  Trophy,
  Lightbulb,
  SkipForward,
  RefreshCw,
  CheckCircle2,
  Zap,
  Eye,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import Board from "./Board";
import { puzzles, type Exercise } from "../../lib/chess/content";
import {
  type ArcadeMode,
  type ArcadeResult,
  type ArcadeProgress,
  emptyArcade,
  createArcadeDeck,
  checkExerciseMove,
  nextVisionSquare,
  dailyPuzzle,
} from "../../lib/chess/arcade";
const modes = [
  {
    id: "sprint" as ArcadeMode,
    title: "Puzzle Sprint",
    tag: "3 MINUTES",
    text: "How many tactical patterns can you recognize before time runs out?",
    icon: Timer,
    color: "sprint",
  },
  {
    id: "survival" as ArcadeMode,
    title: "Survival",
    tag: "3 LIVES",
    text: "Take your time. Keep your run alive with careful, accurate moves.",
    icon: Heart,
    color: "survival",
  },
  {
    id: "vision" as ArcadeMode,
    title: "Board Vision",
    tag: "60 SECONDS",
    text: "Find the named square. Build faster, more confident board recognition.",
    icon: Eye,
    color: "vision",
  },
];
export default function TrainingArcade({
  progress = emptyArcade,
  boardTheme = "violet",
  onFinish,
  onPractice,
  initialMode,
  onReturn,
}: {
  initialMode?: ArcadeMode;
  onReturn?: () => void;
  progress?: ArcadeProgress;
  boardTheme?: string;
  onFinish: (result: ArcadeResult) => void;
  onPractice: (exercise: Exercise) => void;
}) {
  const [mode, setMode] = useState<ArcadeMode | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [fen, setFen] = useState("");
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(180);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [errors, setErrors] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ArcadeResult | null>(null);
  const [target, setTarget] = useState("e4");
  const [flash, setFlash] = useState<{
    square: string;
    correct: boolean;
  } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const bestBefore = useRef(0);
  const deck = useRef<Exercise[]>([]);
  const session = useRef({
    id: "",
    start: 0,
    end: 0,
    score: 0,
    solved: 0,
    errors: 0,
    hints: 0,
    misses: [] as Exercise[],
  });
  const done = useRef(false);
  const locked = useRef(false);
  const assisted = useRef(false);
  const fenRef = useRef("");
  const stepRef = useRef(0);
  const targetRef = useRef("e4");
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function choose() {
    if (!deck.current.length)
      deck.current = createArcadeDeck().sort(() => Math.random() - 0.5);
    const desired = 400 + session.current.score * 20;
    deck.current.sort(
      (a, b) => Math.abs(a.rating - desired) - Math.abs(b.rating - desired),
    );
    const next = deck.current.shift()!;
    setExercise(next);
    setFen(next.fen);
    fenRef.current = next.fen;
    setStep(0);
    stepRef.current = 0;
    setBusy(false);
    locked.current = false;
    assisted.current = false;
    setMessage("Look for checks, captures, and threats.");
  }
  function start(which: ArcadeMode) {
    bestBefore.current = progress?.bests?.[which] || 0;
    if (nextTimer.current) clearTimeout(nextTimer.current);
    done.current = false;
    locked.current = false;
    assisted.current = false;
    const now = Date.now();
    session.current = {
      id:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : String(now) + "-" + Math.random(),
      start: now,
      end:
        which === "survival" ? 0 : now + (which === "sprint" ? 180 : 60) * 1000,
      score: 0,
      solved: 0,
      errors: 0,
      hints: 0,
      misses: [],
    };
    setMode(which);
    setResult(null);
    setScore(0);
    setSolved(0);
    setErrors(0);
    setRemaining(which === "sprint" ? 180 : 60);
    setRevealed(false);
    setFlash(null);
    setMessage("");
    if (which === "vision") {
      const square = nextVisionSquare("");
      targetRef.current = square;
      setTarget(square);
    } else choose();
  }
  const launched = useRef(false);
  useEffect(() => {
    if (initialMode && !launched.current) {
      launched.current = true;
      start(initialMode);
    }
  }, [initialMode]);
  function finish() {
    if (done.current || !mode) return;
    done.current = true;
    locked.current = true;
    if (nextTimer.current) clearTimeout(nextTimer.current);
    const s = session.current;
    const value: ArcadeResult = {
      id: s.id,
      mode,
      score: s.score,
      solved: s.solved,
      errors: s.errors,
      hints: s.hints,
      startedAt: new Date(s.start).toISOString(),
      finishedAt: new Date().toISOString(),
      seconds: Math.round((Date.now() - s.start) / 1000),
      misses: s.misses,
    };
    setResult(value);
    setBusy(false);
    onFinish(value);
  }
  useEffect(() => {
    if (!mode || result || mode === "survival") return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((session.current.end - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) finish();
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [mode, result]);
  useEffect(
    () => () => {
      if (nextTimer.current) clearTimeout(nextTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (
      !exercise ||
      mode === "vision" ||
      result ||
      step % 2 !== 1 ||
      step >= exercise.line.length
    )
      return;
    setBusy(true);
    locked.current = true;
    const t = setTimeout(() => {
      if (done.current) return;
      const g = new Chess(fenRef.current);
      const u = exercise.line[step];
      g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      fenRef.current = g.fen();
      setFen(g.fen());
      stepRef.current = step + 1;
      setStep(step + 1);
      setBusy(false);
      locked.current = false;
      setMessage("Your turn. Finish the idea.");
    }, 350);
    return () => clearTimeout(t);
  }, [step, exercise?.id, mode, result]);
  function mistake(text: string) {
    session.current.errors++;
    setErrors(session.current.errors);
    assisted.current = true;
    if (exercise && !session.current.misses.some((e) => e.id === exercise.id))
      session.current.misses.push(exercise);
    session.current.misses = session.current.misses.slice(0, 5);
    setMessage(text);
    if (mode === "survival" && session.current.errors >= 3) finish();
  }
  function move(from: string, to: string, promotion = "q") {
    if (!exercise || locked.current || done.current) return;
    if (session.current.end && Date.now() >= session.current.end) {
      finish();
      return;
    }
    const answer = checkExerciseMove(
      exercise,
      fenRef.current,
      stepRef.current,
      from,
      to,
      promotion,
    );
    if (!answer.legal) {
      setMessage("Choose a legal move.");
      return;
    }
    if (!answer.ok) {
      mistake("Legal move, but not the solution. Take another look.");
      return;
    }
    locked.current = true;
    fenRef.current = answer.fen;
    stepRef.current = answer.step;
    setFen(answer.fen);
    setStep(answer.step);
    if (answer.done) {
      session.current.solved++;
      setSolved(session.current.solved);
      if (!assisted.current) {
        session.current.score++;
        setScore(session.current.score);
      }
      setBusy(true);
      setMessage(
        assisted.current
          ? "Pattern learned. On to the next one."
          : "Clean solve! Keep the momentum.",
      );
      nextTimer.current = setTimeout(() => {
        if (!done.current) choose();
      }, new Chess(answer.fen).isCheckmate() ? 1200 : 650);
    }
  }
  function vision(square: string) {
    if (done.current || !mode) return;
    if (Date.now() >= session.current.end) {
      finish();
      return;
    }
    const correct = square === targetRef.current;
    setFlash({ square, correct });
    if (nextTimer.current) clearTimeout(nextTimer.current);
    nextTimer.current = setTimeout(() => setFlash(null), 350);
    if (!correct) {
      session.current.errors++;
      setErrors(session.current.errors);
      assisted.current = true;
      setMessage("That is " + square + ". Find " + targetRef.current + ".");
      return;
    }
    session.current.solved++;
    setSolved(session.current.solved);
    if (!assisted.current) {
      session.current.score++;
      setScore(session.current.score);
    }
    assisted.current = false;
    const next = nextVisionSquare(targetRef.current);
    targetRef.current = next;
    setTarget(next);
    setRevealed(false);
    setMessage("Correct. Find the next square.");
  }
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [mode, !!result]);
  const bests = progress?.bests || emptyArcade.bests;
  if (result) {
    const best = bests[result.mode] || 0;
    return (
      <section className="arcade-results card">
        <span className="result-trophy">
          <Trophy size={42} />
        </span>
        <span className="eyebrow">
          {modes.find((m) => m.id === result.mode)?.title.toUpperCase()}
        </span>
        <h1>
          {result.score > bestBefore.current
            ? "A new personal best."
            : result.score > 0
              ? "Your practice, in the books."
              : "Session complete."}
        </h1>
        <p>
          Your session is complete. Take the patterns you noticed into your next
          game.
        </p>
        <div className="arcade-result-score">
          {result.score}
          <span>clean {result.mode === "vision" ? "squares" : "solves"}</span>
        </div>
        <div className="arcade-result-stats">
          <span>
            <strong>{result.solved}</strong>finished
          </span>
          <span>
            <strong>{result.errors}</strong>misses
          </span>
          <span>
            <strong>{result.hints}</strong>hints
          </span>
          <span>
            <strong>{Math.max(best, result.score)}</strong>personal best
          </span>
        </div>
        <div className="inline-actions">
          <button className="primary" onClick={() => start(result.mode)}>
            Play again <RefreshCw size={16} />
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (onReturn) return onReturn();
              setMode(null);
              setResult(null);
            }}
          >
            {onReturn ? "Back to puzzle trail" : "Back to arcade"}
          </button>
        </div>
        {result.misses.length > 0 && (
          <div className="arcade-misses">
            <h3>Turn a miss into a lesson.</h3>
            {result.misses.map((e) => (
              <button key={e.id} onClick={() => onPractice(e)}>
                <span>
                  <strong>{e.title}</strong>
                  <small>{e.theme}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        )}
        <small className="arcade-fine">
          Scores are training records, separate from Chess.com and Lichess
          ratings. Assisted solves build understanding but do not add to your
          clean score.
        </small>
      </section>
    );
  }
  if (!mode)
    return (
      <div className="arcade-hub">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              A LITTLE FOCUS. A NEW PERSONAL BEST.
            </span>
            <h1>Make practice feel like play.</h1>
            <p>
              Three ways to sharpen your chess instincts, plus one fresh daily
              challenge.
            </p>
          </div>
          <span className="pill lavender">
            <Sparkles size={13} /> Training arcade
          </span>
        </div>
        <div className="arcade-mode-grid">
          {modes.map((m) => (
            <button
              className={"arcade-mode " + m.color}
              key={m.id}
              onClick={() => start(m.id)}
            >
              <span className="arcade-mode-icon">
                <m.icon size={30} />
              </span>
              <span className="eyebrow">{m.tag}</span>
              <h2>{m.title}</h2>
              <p>{m.text}</p>
              <div>
                <span>Best: {bests[m.id] || "—"}</span>
                <strong>
                  Let’s play <ArrowUpRightIcon />
                </strong>
              </div>
            </button>
          ))}
          <button
            className="arcade-mode daily"
            onClick={() =>
              onPractice(dailyPuzzle(new Date().toLocaleDateString("en-CA")))
            }
          >
            <span className="arcade-mode-icon">
              <CalendarDays size={30} />
            </span>
            <span className="eyebrow">ONE GOOD IDEA, EVERY DAY</span>
            <h2>The daily position</h2>
            <p>
              A validated tactical challenge. Slow down and find the idea behind
              the best move.
            </p>
            <div>
              <span>Practice at your pace</span>
              <strong>
                Find the move <ArrowUpRightIcon />
              </strong>
            </div>
          </button>
        </div>
        <div className="arcade-milestones card">
          <div className="card-heading">
            <h2>Your arcade milestones</h2>
            <Trophy size={19} />
          </div>
          <div>
            {[
              {
                title: "Pattern runner",
                earned: bests.sprint >= 5,
                detail: "5 clean sprint solves",
                icon: Zap,
              },
              {
                title: "Steady under pressure",
                earned: bests.survival >= 10,
                detail: "10 clean survival solves",
                icon: Heart,
              },
              {
                title: "A sharp eye",
                earned: bests.vision >= 15,
                detail: "15 clean vision squares",
                icon: Eye,
              },
            ].map((a) => (
              <section key={a.title} className={a.earned ? "earned" : ""}>
                <span>
                  <a.icon size={21} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>{a.detail}</small>
                </div>
                {a.earned && <CheckCircle2 size={17} />}
              </section>
            ))}
          </div>
        </div>
        <p className="arcade-fine">
          Tactical rounds use {puzzles.length.toLocaleString()} validated
          puzzles, including CC0 positions from Lichess and original practice
          patterns. Positions repeat after the deck is exhausted. Scores never
          change official ratings.
        </p>
      </div>
    );
  const files = flipped ? "hgfedcba" : "abcdefgh",
    ranks = flipped ? "12345678" : "87654321";
  return (
    <div className="arcade-session">
      <div className="arcade-session-heading">
        <button className="text-btn" onClick={finish}>
          <ArrowLeft size={16} />
          End & save session
        </button>
        <span className="pill">{modes.find((m) => m.id === mode)?.title}</span>
      </div>
      <div className="arcade-live-stats">
        <div>
          <span>{mode === "vision" ? "CLEAN SQUARES" : "CLEAN SOLVES"}</span>
          <strong>{score}</strong>
        </div>
        <div>
          <span>{mode === "survival" ? "LIVES LEFT" : "TIME LEFT"}</span>
          <strong
            className={remaining <= 15 && mode !== "survival" ? "urgent" : ""}
          >
            {mode === "survival" ? (
              <span
                className="arcade-hearts"
                role="img"
                aria-label={3 - errors + " lives remaining"}
              >
                {[0, 1, 2].map((i) => (
                  <Heart
                    key={i}
                    size={24}
                    className={i < 3 - errors ? "alive" : ""}
                  />
                ))}
              </span>
            ) : (
              `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
            )}
          </strong>
        </div>
        <div>
          <span>PERSONAL BEST</span>
          <strong>{bests[mode] || 0}</strong>
        </div>
      </div>
      {mode !== "survival" && (
        <div className="arcade-time-track">
          <i
            style={{
              width: (remaining / (mode === "sprint" ? 180 : 60)) * 100 + "%",
            }}
          />
        </div>
      )}
      <div className="board-layout">
        <section>
          {mode === "vision" ? (
            <>
              <div className="vision-prompt">
                <span>Find this square</span>
                <strong>{target}</strong>
                <button
                  className="icon-btn"
                  aria-label="Flip vision board"
                  onClick={() => setFlipped(!flipped)}
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <div
                className={"vision-board " + boardTheme}
                role="group"
                aria-label={"Find square " + target}
              >
                {[...ranks].flatMap((r, ri) =>
                  [...files].map((f, fi) => {
                    const square = f + r;
                    return (
                      <button
                        key={square}
                        aria-label={"Square " + square}
                        className={
                          (square.charCodeAt(0) + +r) % 2 === 0
                            ? "dark-square"
                            : "light-square"
                        }
                        onClick={() => vision(square)}
                      >
                        {fi === 0 && <small className="rank">{r}</small>}
                        {ri === 7 && <small className="file">{f}</small>}
                        {flash?.square === square && (
                          <i
                            className={flash.correct ? "correct" : "incorrect"}
                          />
                        )}{" "}
                        {revealed && square === target && <Target size={24} />}
                      </button>
                    );
                  }),
                )}
              </div>
            </>
          ) : (
            exercise && (
              <>
                <div className="arcade-position-heading">
                  <span>{exercise.theme}</span>
                  <strong>
                    {exercise.fen.split(" ")[1] === "w" ? "White" : "Black"} to
                    play
                  </strong>
                </div>
                <Board
                  fen={fen}
                  onMove={move}
                  flipped={exercise.fen.split(" ")[1] === "b"}
                  disabled={busy}
                  theme={boardTheme}
                  showTools
                />
              </>
            )
          )}
        </section>
        <aside className="card arcade-guide">
          <span className="pill lavender">
            {mode === "vision" ? "SEE THE BOARD" : "FIND THE PATTERN"}
          </span>
          <h2>
            {mode === "vision" ? "Know every square." : "Your next good move."}
          </h2>
          <p>
            {mode === "vision"
              ? "Tap the square named above the board. The coordinates stay visible while you build confidence."
              : "Play the solution, then let the opponent reply automatically. A clean solve means no hints or missed moves."}
          </p>
          <div className="feedback" role="status">
            {message || "Ready when you are."}
          </div>
          <button
            className="secondary full"
            disabled={busy || done.current}
            onClick={() => {
              session.current.hints++;
              assisted.current = true;
              if (mode === "vision") {
                setRevealed(true);
                setMessage(
                  "The target is highlighted. This square will count as assisted.",
                );
              } else if (mode === "survival")
                mistake(
                  (exercise?.hint || "Look for forcing moves.") +
                    " A hint uses one life.",
                );
              else setMessage(exercise?.hint || "Look for forcing moves.");
            }}
          >
            <Lightbulb size={17} />
            {mode === "vision"
              ? "Reveal square"
              : mode === "survival"
                ? "Hint · costs one life"
                : "Show a hint"}
          </button>
          {mode !== "vision" && (
            <button
              className="text-btn"
              disabled={busy || done.current}
              onClick={() => {
                mistake("Position skipped.");
                if (!done.current) choose();
              }}
            >
              <SkipForward size={16} />
              Skip{mode === "survival" ? " · costs one life" : ""}
            </button>
          )}
          <div className="lesson-note">
            <strong>
              {mode === "survival"
                ? "Three lives. No clock."
                : "Keep it calm. Keep it accurate."}
            </strong>
            <p>
              {mode === "survival"
                ? "Every wrong solution move, hint, or skip costs one life. The run ends after three."
                : "The clock keeps running if you switch tabs. Takebacks and engine help stay in the regular practice board."}
            </p>
            <p>
              {solved} finished · {errors} misses
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}
