"use client";
import { useEffect, useRef, useState } from "react";
import { Chess, type Color } from "chess.js";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  RotateCcw,
  Download,
} from "lucide-react";
import Board from "./Board";
import { Engine, type Evaluation } from "../../lib/chess/engine";
import {
  guidedFeedback,
  type GuidedMove,
  type GuidedSession,
} from "../../lib/chess/guided";
export default function GuidedPractice({
  boardTheme,
  onSave,
  onReports,
  resume,
}: {
  boardTheme: string;
  resume?: GuidedSession;
  onSave: (session: GuidedSession) => void;
  onReports: () => void;
}) {
  const [game, setGame] = useState(() => new Chess());
  const [player, setPlayer] = useState<Color>("w");
  const [skill, setSkill] = useState(3);
  const [phase, setPhase] = useState<
    | "setup"
    | "reflect"
    | "ready"
    | "thinking"
    | "feedback"
    | "reply"
    | "complete"
  >("setup");
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [feedback, setFeedback] = useState<GuidedMove | null>(null);
  const [error, setError] = useState("");
  const [session, setSession] = useState<GuidedSession | null>(null);
  const boardAnchor = useRef<HTMLElement>(null);
  const coachAnchor = useRef<HTMLElement>(null);
  const engine = useRef<Engine | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const pending = useRef<{ before: Chess; after: Chess; uci: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      generation.current++;
      engine.current?.destroy();
    },
    [],
  );
  useEffect(() => {
    if (!window.matchMedia("(max-width:760px)").matches || phase === "setup")
      return;
    const target =
      phase === "ready"
        ? boardAnchor.current
        : ["reflect", "feedback", "complete"].includes(phase)
          ? coachAnchor.current
          : null;
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [phase]);
  function getEngine() {
    if (!engine.current || engine.current.dead) engine.current = new Engine();
    return engine.current;
  }
  function store(g: Chess, s: GuidedSession) {
    const completed = g.isGameOver();
    const result = completed
      ? g.isCheckmate()
        ? g.turn() === "w"
          ? "0-1"
          : "1-0"
        : "1/2-1/2"
      : "*";
    g.setHeader("Result", result);
    const n = {
      ...s,
      pgn: g.pgn(),
      completed,
      result,
      updatedAt: new Date().toISOString(),
    };
    setSession(n);
    onSave(n);
    return n;
  }
  function reflect(g: Chess) {
    setChecks([false, false, false]);
    setFeedback(null);
    setPhase(g.isGameOver() ? "complete" : "reflect");
  }
  async function reply(g: Chess, s: GuidedSession, opponentSkill = skill) {
    if (busy.current) return;
    busy.current = true;
    setPhase("reply");
    setError("");
    const gen = generation.current;
    try {
      const r = await getEngine().analyze(g.fen(), 450, opponentSkill);
      if (gen !== generation.current) return;
      const next = new Chess();
      next.loadPgn(g.pgn());
      next.move({
        from: r.best.slice(0, 2),
        to: r.best.slice(2, 4),
        promotion: r.best[4],
      });
      setGame(next);
      store(next, s);
      reflect(next);
    } catch (e) {
      if (gen === generation.current) {
        setError((e as Error).message);
        setPhase("reply");
      }
    } finally {
      if (gen === generation.current) busy.current = false;
    }
  }
  function start() {
    const g = new Chess();
    for (const [key, value] of Object.entries({
      Event: "Chess Infinity guided training",
      White: player === "w" ? "Learner" : "Stockfish",
      Black: player === "b" ? "Learner" : "Stockfish",
      Result: "*",
    }))
      g.setHeader(key, value);
    const s = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      player,
      opponentSkill: skill,
      pgn: g.pgn(),
      result: "*",
      completed: false,
      moves: [],
    };
    setGame(g);
    setSession(s);
    onSave(s);
    if (player === "b") void reply(g, s);
    else reflect(g);
  }
  async function explain(item: { before: Chess; after: Chess; uci: string }) {
    if (!session || busy.current) return;
    busy.current = true;
    setPhase("thinking");
    setError("");
    const gen = generation.current;
    try {
      const before = await getEngine().analyze(item.before.fen(), 550, 20);
      const after: Evaluation = item.after.isDraw()
        ? { best: "", score: 0, mate: null, depth: 0, pv: [] }
        : await getEngine().analyze(item.after.fen(), 550, 20);
      if (gen !== generation.current) return;
      const entry = {
        ...guidedFeedback(
          item.before.fen(),
          item.uci,
          before,
          after,
          item.after.isDraw(),
        ),
        at: new Date().toISOString(),
        ply: item.after.history().length,
      };
      setFeedback(entry);
      store(item.after, {
        ...session,
        moves: [...session.moves.filter((m) => m.ply !== entry.ply), entry],
      });
      pending.current = null;
      setPhase("feedback");
    } catch (e) {
      if (gen === generation.current) {
        setError((e as Error).message);
        setPhase("thinking");
      }
    } finally {
      if (gen === generation.current) busy.current = false;
    }
  }
  function move(from: string, to: string, promotion?: string) {
    if (
      phase !== "ready" ||
      busy.current ||
      game.turn() !== player ||
      game.isGameOver()
    )
      return;
    try {
      const before = new Chess();
      before.loadPgn(game.pgn());
      const after = new Chess();
      after.loadPgn(game.pgn());
      after.move({ from, to, promotion });
      const item = { before, after, uci: from + to + (promotion || "") };
      pending.current = item;
      setGame(after);
      void explain(item);
    } catch {
      setError("Choose a legal move.");
    }
  }
  function resumeGame() {
    if (!resume) return;
    try {
      const g = new Chess();
      g.loadPgn(resume.pgn);
      if (g.isGameOver()) throw new Error("This game has already finished.");
      setPlayer(resume.player);
      setSkill(resume.opponentSkill ?? 3);
      setGame(g);
      setSession(resume);
      setError("");
      if (g.turn() === resume.player) reflect(g);
      else void reply(g, resume, resume.opponentSkill ?? 3);
    } catch {
      setError(
        "This saved game could not be resumed. Start a new guided game.",
      );
    }
  }
  function reset() {
    generation.current++;
    engine.current?.destroy();
    engine.current = null;
    busy.current = false;
    pending.current = null;
    setGame(new Chess());
    setSession(null);
    setPhase("setup");
    setFeedback(null);
    setError("");
  }
  function exportPgn() {
    const u = URL.createObjectURL(
      new Blob([game.pgn()], { type: "application/x-chess-pgn" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = "guided-training.pgn";
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">LOCAL TRAINING · NO CLOCK PRESSURE</span>
          <h1>Think first. Play with a plan.</h1>
          <p>
            A guided game against Stockfish, with a pause to understand every
            decision.
          </p>
        </div>
        <span className="pill lavender">Guided practice</span>
      </div>
      <div className="board-layout guided-layout">
        <section ref={boardAnchor} className="guided-board-anchor">
          <div className="guided-board-heading">
            <strong>
              {phase === "setup"
                ? "Your practice board"
                : game.isGameOver()
                  ? game.isCheckmate()
                    ? "Checkmate"
                    : "Draw"
                  : game.turn() === player
                    ? "Your turn"
                    : "Stockfish’s turn"}
            </strong>
            <span>{player === "w" ? "You play White" : "You play Black"}</span>
          </div>
          <Board
            fen={game.fen()}
            onMove={move}
            flipped={player === "b"}
            disabled={phase !== "ready"}
            theme={boardTheme}
          />
          <div className="guided-move-list" aria-label="Guided game moves">
            {game.history().map((m, i) => (
              <span key={i}>
                {i % 2 === 0 ? `${i / 2 + 1}. ` : ""}
                {m}
              </span>
            ))}
          </div>
        </section>
        <section ref={coachAnchor} className="card guided-coach">
          <span className="feature-symbol">
            <BrainCircuit size={26} />
          </span>
          {phase === "setup" ? (
            <>
              <h2>A coach beside your board.</h2>
              <p>
                Before each turn, scan for threats. After your move, compare it
                with a real engine search before the opponent replies.
              </p>
              {resume && (
                <button className="secondary" onClick={resumeGame}>
                  Resume last guided game <ArrowRight size={16} />
                </button>
              )}
              <label>
                Your side
                <select
                  aria-label="Your side"
                  value={player}
                  onChange={(e) => setPlayer(e.target.value as Color)}
                >
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </label>
              <label>
                Opponent skill
                <select
                  aria-label="Guided opponent skill"
                  value={skill}
                  onChange={(e) => setSkill(+e.target.value)}
                >
                  {[0, 3, 7, 12, 20].map((s) => (
                    <option key={s} value={s}>
                      {s} / 20
                      {s === 0 ? " · gentlest" : s === 20 ? " · strongest" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" onClick={start}>
                Start guided game <ArrowRight size={16} />
              </button>
              <p className="fine">
                Skill settings are training difficulty, not guaranteed Elo
                ratings. Starting a new game does not erase recorded practice.
              </p>
            </>
          ) : phase === "reflect" || phase === "ready" ? (
            <>
              <span className="eyebrow">PAUSE · SCAN · CHOOSE</span>
              <h2>
                {game.inCheck()
                  ? "Your king is in check."
                  : "What is your opponent threatening?"}
              </h2>
              <p>
                {game.inCheck()
                  ? "Answer the check: can you capture the checker, block the attack, or move the king?"
                  : "Notice what changed after the opponent’s move, then compare your candidate moves."}
              </p>
              <div className="guided-checklist">
                {[
                  "I checked threats to my king and pieces.",
                  "I looked at checks, captures, and threats.",
                  "I checked the reply to my candidate move.",
                ].map((text, i) => (
                  <label key={text}>
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      disabled={phase === "ready"}
                      onChange={(e) =>
                        setChecks((c) =>
                          c.map((v, n) => (n === i ? e.target.checked : v)),
                        )
                      }
                    />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              {phase === "reflect" ? (
                <button
                  className="primary"
                  disabled={!checks.every(Boolean)}
                  onClick={() => setPhase("ready")}
                >
                  Ready to choose a move <Check size={16} />
                </button>
              ) : (
                <div className="feedback success" role="status">
                  Your move. Tap or drag a piece on the board.
                </div>
              )}
              <small>These are reflection prompts, not a scored quiz.</small>
            </>
          ) : phase === "feedback" && feedback ? (
            <>
              <span className="pill lavender">
                {feedback.label} · depth {feedback.depth}
              </span>
              <h2>What changed after {feedback.san}?</h2>
              <p>{feedback.explanation}</p>
              <div className="guided-engine-line">
                <strong>Engine’s preferred line</strong>
                <p className="mono">{feedback.line || feedback.best}</p>
                <small>
                  Legal continuation · approximate short-search evaluation
                </small>
              </div>
              <button
                className="primary"
                onClick={() => {
                  if (game.isGameOver()) setPhase("complete");
                  else if (session) void reply(game, session);
                }}
              >
                {" "}
                {game.isGameOver()
                  ? "See game summary"
                  : "Let Stockfish reply"}{" "}
                <ArrowRight size={16} />
              </button>
            </>
          ) : phase === "complete" ? (
            <>
              <span className="eyebrow">PRACTICE COMPLETE</span>
              <h2>
                {game.isCheckmate()
                  ? game.turn() === player
                    ? "A loss to learn from."
                    : "You found the finish."
                  : "A drawn game. More ideas learned."}
              </h2>
              <p>
                {session?.moves.length || 0} of your moves received engine
                feedback. Find this practice in your weekly report; it never
                changes an external rating.
              </p>
              <button className="primary" onClick={onReports}>
                See weekly progress <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <h2>
                {phase === "reply"
                  ? "Stockfish is thinking…"
                  : "Checking your decision…"}
              </h2>
              <p>
                The engine runs in a background worker. Your board remains
                visible while the search finishes.
              </p>
            </>
          )}
          {error && (
            <div className="feedback error" role="alert">
              {error}
              <button
                className="secondary"
                onClick={() => {
                  if (pending.current) void explain(pending.current);
                  else if (session) void reply(game, session);
                }}
              >
                Retry engine
              </button>
            </div>
          )}
          {phase !== "setup" && (
            <div className="inline-actions">
              <button className="secondary" onClick={reset}>
                <RotateCcw size={15} />
                New guided game
              </button>
              <button className="text-btn" onClick={exportPgn}>
                <Download size={15} />
                Export PGN
              </button>
            </div>
          )}
          <p className="fine">
            Only this local training game is analyzed. Engine guidance is
            approximate; it does not prove a long-term plan or assess a live
            external game.
          </p>
        </section>
      </div>
    </>
  );
}
