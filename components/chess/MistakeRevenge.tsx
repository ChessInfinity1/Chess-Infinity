"use client";
import { useEffect, useRef, useState } from "react";
import { Chess, type Color } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Target,
  BrainCircuit,
  CheckCircle2,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Link2,
  Upload,
  Clock3,
  Trophy,
} from "lucide-react";
import Board from "./Board";
import { Engine } from "../../lib/chess/engine";
import { type Progress } from "../../lib/chess/content";
import { type ImportedGame } from "../../lib/chess/imported-games";
import {
  emptyRevenge,
  gameSide,
  replayCompletedGame,
  positionsFromReport,
  reviewGameForRevenge,
  moveName,
  legalVariation,
  type RevengePosition,
} from "../../lib/chess/revenge";
export default function MistakeRevenge({
  progress,
  onAdd,
  onResult,
  onConnect,
  onImport,
  onReview,
}: {
  progress: Progress;
  onAdd: (positions: RevengePosition[]) => void;
  onResult: (id: string, clean: boolean) => void;
  onConnect: () => void;
  onImport: () => void;
  onReview: (pgn: string) => void;
}) {
  const saved = progress.revenge || emptyRevenge;
  const games: ImportedGame[] = progress.games.filter((g) =>
    ["1-0", "0-1", "1/2-1/2"].includes(g.result),
  );
  const [gameId, setGameId] = useState(games[0]?.id || "");
  const [color, setColor] = useState<Color>(() =>
    games[0] ? gameSide(games[0], progress.accounts) || "w" : "w",
  );
  const game = games.find((g) => g.id === gameId);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState({ done: 0, total: 0 });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState<RevengePosition | null>(null);
  const [filter, setFilter] = useState("due");
  const [limit, setLimit] = useState(12);
  const engine = useRef<Engine | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      engine.current?.destroy();
    },
    [],
  );
  function getEngine() {
    if (!engine.current || engine.current.dead) engine.current = new Engine();
    return engine.current;
  }
  function chooseGame(id: string) {
    setGameId(id);
    const g = games.find((x) => x.id === id);
    if (g) setColor(gameSide(g, progress.accounts) || "w");
    setNotice("");
    setError("");
  }
  async function findMistakes() {
    if (!game || scanning) return;
    setScanning(true);
    setError("");
    setNotice("");
    setScan({ done: 0, total: 0 });
    const gen = ++generation.current;
    try {
      const result = await reviewGameForRevenge(
        game,
        color,
        (fen, ms) => getEngine().analyze(fen, ms),
        (done, total) => {
          if (gen === generation.current) setScan({ done, total });
        },
        () => gen !== generation.current,
      );
      if (gen !== generation.current) return;
      onAdd(result.positions);
      setNotice(
        result.positions.length
          ? `${result.positions.length} engine-supported ${result.positions.length === 1 ? "mistake" : "mistakes"} saved for ${color === "w" ? game.white : game.black}. ${result.limited ? "Review covers the first 300 plies." : ""}`
          : "This search found no mistakes above the training threshold for the chosen side. You can review another game or try a deeper full game review.",
      );
    } catch (e) {
      if (gen === generation.current) setError((e as Error).message);
    } finally {
      if (gen === generation.current) setScanning(false);
    }
  }
  function cancel() {
    generation.current++;
    engine.current?.destroy();
    engine.current = null;
    setScanning(false);
    setNotice(
      "Analysis cancelled. Previously saved practice positions are kept.",
    );
  }
  function useSaved() {
    if (!game) return;
    setError("");
    const positions = progress.analyses.flatMap((r) =>
      positionsFromReport(game, r, color),
    );
    if (positions.length) {
      onAdd(positions);
      setNotice(
        `Added ${new Set(positions.map((p) => p.id)).size} verified positions from your saved review. Only the selected side’s mistakes are included.`,
      );
    } else
      setNotice(
        "No matching saved mistakes for this game and side. Use Find my mistakes to run a new engine search.",
      );
  }
  const mastered = saved.positions.filter(
    (p) => (saved.records[p.id]?.cleanDays.length || 0) >= 2,
  );
  const due = saved.positions.filter(
    (p) =>
      !saved.records[p.id] ||
      Date.parse(saved.records[p.id].dueAt) <= Date.now(),
  );
  const visible = (
    filter === "due" ? due : filter === "mastered" ? mastered : saved.positions
  )
    .slice()
    .sort((a, b) => b.loss - a.loss);
  const play = (p: RevengePosition) => {
    setActive(p);
    window.scrollTo({ top: 0 });
  };
  if (active)
    return (
      <RevengePractice
        key={active.id}
        position={active}
        boardTheme={progress.boardTheme}
        engine={getEngine}
        onResult={onResult}
        onClose={() => setActive(null)}
        onNext={() => {
          const next = (due.length ? due : saved.positions).find(
            (p) => p.id !== active.id,
          );
          if (next) play(next);
          else setActive(null);
        }}
      />
    );
  return (
    <div className="mistake-revenge">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR GAMES. YOUR NEXT BREAKTHROUGH.</span>
          <h1>Make your last mistake your next strength.</h1>
          <p>
            Replay real turning points from completed games. Find the stronger
            move, then recall it again on another practice day.
          </p>
        </div>
        <span className="pill lavender">
          <RotateCcw size={14} /> Mistake Revenge
        </span>
      </div>
      <div className="revenge-summary">
        <section>
          <Target size={23} />
          <div>
            <strong>{due.length}</strong>
            <span>ready to practice</span>
          </div>
        </section>
        <section>
          <BrainCircuit size={23} />
          <div>
            <strong>{saved.positions.length}</strong>
            <span>verified positions</span>
          </div>
        </section>
        <section>
          <Trophy size={23} />
          <div>
            <strong>{mastered.length}</strong>
            <span>recalled on two days</span>
          </div>
        </section>
      </div>
      <section className="card revenge-intake">
        <div>
          <span className="pill lavender">FROM YOUR OWN GAMES</span>
          <h2>Find the moments worth revisiting.</h2>
          <p>
            Choose a completed game and the side you played. Stockfish runs in a
            background worker; only that side’s mistakes become practice.
          </p>
        </div>
        {games.length ? (
          <div className="revenge-import-controls">
            <label>
              Completed game
              <select
                aria-label="Completed game for revenge"
                disabled={scanning}
                value={gameId}
                onChange={(e) => chooseGame(e.target.value)}
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.white} vs {g.black} · {g.result} · {g.source}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your side
              <select
                aria-label="Your side for revenge"
                disabled={scanning}
                value={color}
                onChange={(e) => setColor(e.target.value as Color)}
              >
                <option value="w">White · {game?.white}</option>
                <option value="b">Black · {game?.black}</option>
              </select>
            </label>
            <div className="inline-actions">
              <button
                className="primary"
                disabled={scanning || !game}
                onClick={() => void findMistakes()}
              >
                <BrainCircuit size={17} />
                {scanning ? "Finding your turning points…" : "Find my mistakes"}
              </button>
              {scanning ? (
                <button className="secondary" onClick={cancel}>
                  Cancel analysis
                </button>
              ) : (
                <button
                  className="secondary"
                  disabled={!progress.analyses.length}
                  onClick={useSaved}
                >
                  Use saved review
                </button>
              )}
            </div>
            {scanning && (
              <div className="revenge-scan" role="status">
                <div>
                  <i
                    style={{
                      width:
                        (scan.total ? (scan.done / scan.total) * 100 : 0) + "%",
                    }}
                  />
                </div>
                <span>
                  {scan.total
                    ? `${scan.done} of ${scan.total} of your moves reviewed`
                    : "Starting Stockfish…"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="revenge-empty-import">
            <p>
              Connect a public chess profile or import a completed PGN to build
              your own practice collection.
            </p>
            <div className="inline-actions">
              <button className="primary" onClick={onConnect}>
                <Link2 size={16} />
                Connect a profile
              </button>
              <button className="secondary" onClick={onImport}>
                <Upload size={16} />
                Import a PGN
              </button>
            </div>
          </div>
        )}
      </section>
      {notice && (
        <div className="feedback success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      <div className="revenge-collection-heading">
        <div>
          <span className="eyebrow">ONE POSITION. A BETTER HABIT.</span>
          <h2>Your comeback collection</h2>
        </div>
        <div
          className="revenge-filters"
          role="group"
          aria-label="Revenge position filter"
        >
          {[
            ["due", "Ready now"],
            ["all", "All positions"],
            ["mastered", "Recalled"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              className={filter === id ? "active" : ""}
              onClick={() => {
                setFilter(id);
                setLimit(12);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visible.length ? (
        <>
          <div className="revenge-position-grid">
            {visible.slice(0, limit).map((p) => (
              <button
                className="card revenge-position"
                key={p.id}
                onClick={() => play(p)}
              >
                <span className="revenge-position-icon">
                  <RotateCcw size={24} />
                </span>
                <span className="pill">{p.theme}</span>
                <h3>
                  Move {Math.ceil(p.ply / 2)}
                  {p.color === "b" ? "…" : "."} A second chance.
                </h3>
                <p>
                  You played <strong>{p.played}</strong> · {p.label}
                  <br />
                  {p.white} vs {p.black}
                </p>
                <div>
                  <span>
                    {p.depth ? `Depth ${p.depth} · ` : ""}
                    {p.loss.toFixed(1)} pawn loss estimate
                  </span>
                  <ArrowRight size={18} />
                </div>
              </button>
            ))}
          </div>
          {visible.length > limit && (
            <button
              className="secondary load-history"
              onClick={() => setLimit((x) => x + 12)}
            >
              Show more positions
            </button>
          )}
        </>
      ) : (
        <div className="card revenge-empty">
          <span>
            <Target size={34} />
          </span>
          <h3>
            {filter === "due" && saved.positions.length
              ? "You’re caught up."
              : "Your next lesson is hiding in your last game."}
          </h3>
          <p>
            {filter === "due" && saved.positions.length
              ? "Newly recalled positions return on their scheduled practice day. Choose All positions to practice again now."
              : filter === "mastered"
                ? "Recall a position cleanly on two different practice days to see it here."
                : "Choose a game above to start. Positions appear only after a real engine review."}
          </p>
          {filter === "due" && saved.positions.length > 0 && (
            <button className="secondary" onClick={() => setFilter("all")}>
              Practice any saved position
            </button>
          )}
        </div>
      )}
      <div className="info-banner">
        <ShieldCheck size={22} />
        <p>
          <strong>Training and post-game analysis only.</strong> Search results
          are engine-supported estimates, not guaranteed perfect evaluations.
          Mistakes use ≥1 pawn loss, blunders ≥2; lost forced mates are
          included. Two clean practice days reinforce a position. XP never
          changes external ratings.
        </p>
      </div>
    </div>
  );
}
function RevengePractice({
  position: p,
  boardTheme,
  engine,
  onResult,
  onClose,
  onNext,
}: {
  position: RevengePosition;
  boardTheme: string;
  engine: () => Engine;
  onResult: (id: string, clean: boolean) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const [fen, setFen] = useState(p.fen);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(
    "Find the stronger move. Your original move is shown for context.",
  );
  const [assisted, setAssisted] = useState(false);
  const [hint, setHint] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [alternative, setAlternative] = useState(false);
  const locked = useRef(false);
  const alive = useRef(true);
  const completed = useRef(false);
  const assistedRef = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const line = legalVariation(p.fen, p.line);
  const positions = [p.fen];
  const labels: string[] = [];
  const g = new Chess(p.fen);
  for (const u of line) {
    labels.push(
      g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san,
    );
    positions.push(g.fen());
  }
  function complete(next: string, alt = false) {
    if (!alive.current) return;
    locked.current = true;
    completed.current = true;
    setFen(next);
    setDone(true);
    setBusy(false);
    setAlternative(alt);
    setLineIndex(alt ? 0 : 1);
    setFeedback(
      assistedRef.current
        ? "The idea is yours now. Come back for a clean recall."
        : alt
          ? "A sound alternative. The new engine search supports your move."
          : "That’s the stronger move. Bring this habit into your next game.",
    );
    onResult(p.id, !assistedRef.current);
  }
  async function move(from: string, to: string, promotion = "q") {
    if (locked.current || completed.current) return;
    const next = new Chess(p.fen);
    let u = "";
    try {
      const m = next.move({ from, to, promotion });
      u = m.from + m.to + (m.promotion || "");
    } catch {
      setFeedback("Choose a legal move in this position.");
      return;
    }
    if (u === p.bestUci || next.isCheckmate()) {
      complete(next.fen(), u !== p.bestUci);
      return;
    }
    locked.current = true;
    setBusy(true);
    setFeedback("Checking your alternative with Stockfish…");
    try {
      const ref = await engine().analyze(p.fen, 650);
      const candidate = await engine().analyze(next.fen(), 650);
      if (!alive.current) return;
      const sign = p.color === "w" ? 1 : -1;
      const supported =
        ref.best === u ||
        (Math.min(ref.depth, candidate.depth) >= 8 &&
          (ref.mate !== null && ref.mate * sign > 0
            ? candidate.mate !== null && candidate.mate * sign > 0
            : (ref.score - candidate.score) * sign <= 0.25));
      if (supported) {
        complete(next.fen(), true);
        return;
      }
      assistedRef.current = true;
      setAssisted(true);
      setFeedback(
        "A legal move, but the engine finds a stronger continuation. Look for the threat your original move overlooked.",
      );
    } catch {
      if (alive.current)
        setFeedback(
          "The engine could not verify this alternative. Reconnect and retry, or use the saved engine move.",
        );
    } finally {
      if (alive.current && !completed.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  function restart() {
    locked.current = false;
    completed.current = false;
    assistedRef.current = false;
    setAssisted(false);
    setHint(false);
    setDone(false);
    setFen(p.fen);
    setLineIndex(0);
    setAlternative(false);
    setFeedback("A fresh attempt. Find the stronger move.");
  }
  return (
    <div className="revenge-practice">
      <button className="text-btn back" onClick={onClose}>
        <ArrowLeft size={16} />
        Back to Mistake Revenge
      </button>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            YOUR REAL GAME · MOVE {Math.ceil(p.ply / 2)}
          </span>
          <h1>
            {done
              ? "A better move. A stronger habit."
              : "Same position. New perspective."}
          </h1>
          <p>
            {p.white} vs {p.black} · {p.source}
          </p>
        </div>
        <span className="pill lavender">{p.theme}</span>
      </div>
      <div className="board-layout">
        <section>
          <div className="arcade-position-heading">
            <span>{p.color === "w" ? "White" : "Black"} to play</span>
            <strong>You played {p.played}</strong>
          </div>
          <Board
            fen={done && lineIndex > 0 ? positions[lineIndex] || fen : fen}
            onMove={(a, b, c) => void move(a, b, c)}
            disabled={busy || done}
            flipped={p.color === "b"}
            theme={boardTheme}
          />
          {done && (
            <div className="revenge-line-player">
              <span>
                Saved engine continuation
                {alternative ? " · another supported option" : ""}
              </span>
              <div>
                <button
                  aria-label="Previous engine-line move"
                  disabled={lineIndex === 0}
                  onClick={() => {
                    setLineIndex((i) => Math.max(0, i - 1));
                    setFen(p.fen);
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <strong>
                  {lineIndex
                    ? labels.slice(0, lineIndex).join(" ")
                    : "Start position"}
                </strong>
                <button
                  aria-label="Next engine-line move"
                  disabled={lineIndex >= line.length}
                  onClick={() => setLineIndex((i) => i + 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </section>
        <aside className="card training-panel revenge-practice-panel">
          <span className="pill lavender">
            {done ? "PATTERN REINFORCED" : "TURN THE GAME AROUND"}
          </span>
          <h2>{done ? "Remember the idea." : "What would you play now?"}</h2>
          <p>
            {done
              ? p.explanation
              : `Your ${p.played} was classified as ${p.label.toLowerCase()} in the saved review. Find a stronger move from the position before it.`}
          </p>
          <div className={"feedback " + (done ? "success" : "")} role="status">
            {feedback}
          </div>
          {hint && (
            <div className="lesson-note">
              <strong>Engine candidate: {moveName(p.fen, p.bestUci)}</strong>
              <p>
                This attempt counts as assisted. You can still finish the
                position and practice again later.
              </p>
            </div>
          )}
          {!done ? (
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => {
                setHint(true);
                setAssisted(true);
                assistedRef.current = true;
              }}
            >
              <Lightbulb size={17} />
              Reveal the candidate
            </button>
          ) : (
            <>
              <div className="revenge-recall-status">
                <CheckCircle2 size={22} />
                <span>
                  {assisted
                    ? "Assisted practice saved"
                    : "Clean recall saved · up to 15 XP per position/day"}
                </span>
              </div>
              <button className="primary full" onClick={onNext}>
                Next position <ArrowRight size={17} />
              </button>
            </>
          )}
          <button className="text-btn" disabled={busy} onClick={restart}>
            <RotateCcw size={16} />
            Try the position again
          </button>
          <div className="lesson-note">
            <strong>A little space helps it stick.</strong>
            <p>
              Clean recalls return after 1, 3, 7, 14, then 30 days. Multiple
              attempts on one day count as one recall day. Hints or missed
              solutions schedule another try now.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
