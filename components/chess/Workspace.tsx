"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Chess, Square } from "chess.js";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  RefreshCw,
  Lightbulb,
  Upload,
  Download,
  Play,
  Square as Stop,
  BrainCircuit,
} from "lucide-react";
import Board from "./Board";
import { botById, botReply } from "../../lib/chess/bots";
import PracticeArena from "./PracticeArena";
import { useChessClock } from "./useChessClock";
import { formatClock } from "../../lib/chess/clock";
import { replayPosition } from "../../lib/chess/game-state";
import { summarizeReview } from "../../lib/chess/guided";
import { analyzeGame, type ReviewRow } from "../../lib/chess/review";
import ReviewPanel, { type ReviewStatus } from "./ReviewPanel";
import {
  Engine,
  Evaluation,
} from "../../lib/chess/engine";
import { Opening } from "../../lib/chess/content";
function sanLine(fen: string, pv: string[]) {
  const g = new Chess(fen);
  const out = [];
  for (const u of pv.slice(0, 8)) {
    try {
      out.push(
        g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san,
      );
    } catch {
      break;
    }
  }
  return out.join(" ");
}
function download(text: string, name: string) {
  const u = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}
export default function Workspace({
  mode,
  pgn,
  opening,
  boardTheme,
  onClose,
  onSave,
  onReport,
  onOpeningComplete,
  onGuided,
}: {
  mode: "play" | "review" | "opening";
  pgn?: string;
  opening?: Opening;
  boardTheme: string;
  onClose: () => void;
  onSave: (pgn: string) => void;
  onReport: (report: any) => void;
  onOpeningComplete: (id: string) => void;
  onGuided?: () => void;
}) {
  const boardSection = useRef<HTMLElement>(null);
  const [game, setGame] = useState(() => new Chess());
  const [positions, setPositions] = useState<string[]>([new Chess().fen()]);
  const [moves, setMoves] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  const [blind, setBlind] = useState(false);
  const [text, setText] = useState(pgn || "");
  const [fenText, setFenText] = useState("");
  const [error, setError] = useState("");
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [working, setWorking] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [depth, setDepth] = useState(1500);
  const [skill, setSkill] = useState(5);
  const [botId, setBotId] = useState("custom");
  const selectedBot = botById(botId);
  const [seconds, setSeconds] = useState(600);
  const time = useChessClock(seconds);
  const timeoutColor =
    time.clock.flagged === "w" ? 0 : time.clock.flagged === "b" ? 1 : null;
  const [started, setStarted] = useState(false);
  const [tablebase, setTablebase] = useState<any>(null);
  const [explorer, setExplorer] = useState<any>(null);
  const [tab, setTab] = useState(mode === "review" && !pgn ? "import" : "insights");
  const [practice, setPractice] = useState(false);
  const [openingStep, setOpeningStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [reviewSide, setReviewSide] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("idle");
  const [variation, setVariation] = useState<{ positions: string[]; index: number; title: string } | null>(null);
  const engine = useRef<Engine | null>(null);
  const cancelled = useRef(false);
  const aiBusy = useRef(false);
  const generation = useRef(0);
  const current = variation ? variation.positions[variation.index] : positions[index] || game.fen();
  function goTo(ply: number) { setVariation(null); setIndex(ply); }
  function showLine(row: ReviewRow, kind: "best" | "played") {
    const board = new Chess(row.fen), line = kind === "best" ? row.pv : row.playedPv;
    const fens = [board.fen()];
    for (const u of line.slice(0, 12)) {
      try { board.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); fens.push(board.fen()); } catch { break; }
    }
    setVariation({ positions: fens, index: Math.min(1, fens.length-1), title: kind === "best" ? `Engine alternative to ${row.san}` : `Continuation after ${row.san}` });
    boardSection.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  const currentRef = useRef(current);
  currentRef.current = current;
  const view = useMemo(
    () => variation ? new Chess(current) : replayPosition(positions[0], moves, index),
    [positions, moves, index, variation, current],
  );
  useEffect(() => {
    setEv(null);
    setTablebase(null);
    setExplorer(null);
  }, [current]);
  function getEngine() {
    if (!engine.current || engine.current.dead) engine.current = new Engine();
    return engine.current;
  }
  useEffect(() => {
    if (pgn) loadPgn(pgn);
    else if (opening)
      loadPgn(
        opening.line
          .split(" ")
          .map((s, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${s}` : s))
          .join(" "),
      );
    return () => {
      cancelled.current = true;
      generation.current++;
      engine.current?.destroy();
    };
  }, []);
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (variation) setVariation(v => v && ({ ...v, index: Math.max(0,v.index-1) }));
        else goTo(Math.max(0,index-1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (variation) setVariation(v => v && ({ ...v, index: Math.min(v.positions.length-1,v.index+1) }));
        else goTo(Math.min(positions.length-1,index+1));
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [positions.length, index, variation]);
  useEffect(() => {
    if (time.clock.flagged) {
      generation.current++;
      engine.current?.destroy();
      engine.current = null;
      aiBusy.current = false;
      setWorking(false);
    }
  }, [time.clock.flagged]);
  function history(g: Chess) {
    if (mode === "play") {
      g.setHeader("Event", "Chess Infinity local training");
      g.setHeader("White", flip ? selectedBot.name : "Learner");
      g.setHeader("Black", flip ? "Learner" : selectedBot.name);
      g.setHeader("TrainingBot", selectedBot.id);
      g.setHeader("TrainingSkill", String(skill));
    }
    if (mode === "play" && g.isGameOver()) time.pause();
    setReportSaved(false);
    if (g.isGameOver())
      g.setHeader(
        "Result",
        g.isCheckmate() ? (g.turn() === "w" ? "0-1" : "1-0") : "1/2-1/2",
      );
    const hist = g.history({ verbose: true });
    const first = hist[0]?.before || g.fen();
    setPositions([first, ...hist.map((m) => m.after)]);
    setMoves(hist.map((m) => m.san));
    setIndex(mode === "review" ? 0 : hist.length);
    setVariation(null);
    setReviewStatus("idle");
    setGame(g);
    setEv(null);
    setRows([]);
    setSaved(false);
  }
  function loadPgn(value: string) {
    if (mode === "play" && started) {
      setError("Start a new game before importing a different position.");
      return;
    }
    try {
      const g = new Chess();
      g.loadPgn(value, { strict: false });
      generation.current++;
      engine.current?.destroy();
      engine.current = null;
      aiBusy.current = false;
      setWorking(false);
      time.reset(seconds);
      history(g);
      if (mode === "review") setTab("insights");
      setError("");
      setStarted(false);
    } catch {
      setError(
        "This PGN could not be replayed legally. Check the notation and starting position.",
      );
    }
  }
  async function ai(g: Chess) {
    if (g.isGameOver() || aiBusy.current || time.read().flagged) return;
    aiBusy.current = true;
    setWorking(true);
    const gen = generation.current;
    try {
      const u = await botReply(g.fen(), selectedBot, (fen, ms, strength, count) => getEngine().analyze(fen, ms, strength, count), skill);
      if (gen !== generation.current) return;
      if (!u || u === "(none)")
        throw new Error(
          "The engine did not return a move. Resume practice to retry.",
        );
      const next = new Chess();
      next.loadPgn(g.pgn());
      next.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      const charged = next.isGameOver() ? time.pause() : time.run(next.turn());
      if (charged.flagged) return;
      history(next);
    } catch (e) {
      if (gen !== generation.current) return;
      setError((e as Error).message);
      time.pause();
    } finally {
      if (gen === generation.current) {
        aiBusy.current = false;
        setWorking(false);
      }
    }
  }
  function move(from: string, to: string, promotion = "q") {
    if (working || (mode === "play" && time.read().flagged)) return;
    try {
      if (mode === "play") {
        if (index !== positions.length - 1) {
          setError("Return to the latest position before playing.");
          return;
        }
        const player = flip ? "b" : "w";
        if (game.turn() !== player) {
          setError("Start the game to let the engine move.");
          return;
        }
        const next = new Chess();
        next.loadPgn(game.pgn());
        next.move({ from, to, promotion });
        if (!started) time.run(game.turn());
        const charged = next.isGameOver()
          ? time.pause()
          : time.run(next.turn());
        if (charged.flagged) return;
        history(next);
        setStarted(true);
        setError("");
        void ai(next);
      } else if (mode === "opening" && practice && opening) {
        const guide = new Chess();
        const verbose: any[] = [];
        for (const s of opening.line.split(" ")) verbose.push(guide.move(s));
        const expected = verbose[openingStep];
        if (!expected) return;
        const next = new Chess(current);
        const played = next.move({ from, to, promotion });
        if (played.san !== expected.san) {
          setError(
            "Legal move, but this repertoire line calls for " +
              expected.san +
              ".",
          );
          return;
        }
        setPositions((p) => [...p.slice(0, index + 1), next.fen()]);
        setMoves((m) => [...m.slice(0, index), played.san]);
        setIndex(index + 1);
        setOpeningStep(openingStep + 1);
        if (openingStep + 1 === verbose.length) onOpeningComplete(opening.id);
        setError(
          openingStep + 1 === verbose.length
            ? "Line recalled correctly. Review it again tomorrow."
            : "Correct. Now play the next move for the other side.",
        );
      } else {
        const g = replayPosition(positions[0], moves, index, game.getHeaders());
        g.move({ from, to, promotion });
        history(g);
      }
    } catch {
      setError("That move is not legal.");
    }
  }
  async function analyze() {
    setWorking(true);
    setError("");
    const captured = current;
    const gen = generation.current;
    try {
      const context = mode === "review" && !variation ? { startFen: positions[0], moves: game.history({ verbose: true }).slice(0,index).map(m => m.from+m.to+(m.promotion || "")) } : {};
      const r = await getEngine().analyze(captured, depth, 20, 1, context);
      if (gen === generation.current && currentRef.current === captured)
        setEv(r);
    } catch (e) {
      if (gen === generation.current) setError((e as Error).message);
    } finally {
      if (gen === generation.current) setWorking(false);
    }
  }
  function stopReview() {
    cancelled.current = true;
    generation.current++;
    engine.current?.destroy(); engine.current = null;
    setWorking(false); setReviewStatus("stopped");
  }
  async function review() {
    setWorking(true); setError(""); setRows([]); setReportSaved(false);
    setReviewStatus("running"); setVariation(null); cancelled.current = false;
    const gen = generation.current;
    try {
      const result = await analyzeGame(game.pgn(), (fen, ms, options) => getEngine().analyze(fen,ms,20,1,options), {
        ms: depth,
        cancelled: () => cancelled.current || gen !== generation.current,
        onRow: results => { if (gen === generation.current) setRows(results); },
      });
      if (gen !== generation.current) return;
      setReviewStatus(result.length === moves.length ? "complete" : "stopped");
      const first = result.find(r => r.reliable && r.loss >= 0.5) || result[0];
      if (first) goTo(first.ply);
    } catch (e) {
      if (gen === generation.current) { setError((e as Error).message); setReviewStatus("error"); }
    } finally { if (gen === generation.current) setWorking(false); }
  }
  function reset() {
    generation.current++;
    engine.current?.destroy();
    engine.current = null;
    aiBusy.current = false;
    setWorking(false);
    history(new Chess());
    setStarted(false);
    time.reset(seconds);
    setError("");
  }
  const status =
    timeoutColor !== null
      ? (timeoutColor === 0 ? "White" : "Black") +
        " ran out of time · training game stopped."
      : view.isCheckmate()
        ? "Checkmate · " + (view.turn() === "w" ? "Black" : "White") + " wins"
        : view.isStalemate()
          ? "Draw by stalemate"
          : view.isThreefoldRepetition()
            ? "Threefold repetition in played game"
            : view.isDraw()
              ? "Draw position"
              : (view.turn() === "w" ? "White" : "Black") +
                " to move" +
                (view.inCheck() ? " · Check" : "");
  function playerName(color: "White" | "Black") { const name = game.getHeaders()[color]; return name && name !== "?" ? name : "Player"; }
  const liveStatus = game.isGameOver()
    ? game.isCheckmate()
      ? "Checkmate"
      : "Draw"
    : status;
  if (["play"].includes(mode)) return <PracticeArena
    bot={selectedBot} onBot={id => { if (!started && !working) { const next = botById(id); setBotId(next.id); setSkill(next.skill); setError(""); } }}
    fen={current} startFen={positions[0]} theme={boardTheme} flip={flip} blind={blind} skill={skill} seconds={seconds}
    started={started} working={working} finished={timeoutColor !== null || game.isGameOver()}
    status={liveStatus} error={error} clock={time.clock} moves={moves} index={index} saved={saved}
    onMove={move} onClose={onClose} onGuided={onGuided}
    onStart={() => { setStarted(true); setError(""); time.run(game.turn()); if (game.turn() !== (flip ? "b" : "w")) void ai(game); }}
    onReset={reset}
    onTakeback={() => { const g = new Chess(); g.loadPgn(game.pgn()); g.undo(); if (g.turn() !== (flip ? "b" : "w")) g.undo(); time.run(g.turn()); history(g); setError(""); }}
    onColor={value => { if (!started) setFlip(value); }}
    onSkill={value => { if (!started) { setSkill(value); setBotId("custom"); } }}
    onTime={value => { if (!started) { setSeconds(value); time.reset(value); } }}
    onBlind={setBlind} onIndex={setIndex} onPgn={loadPgn}
    onFen={value => { if (started) return; try { const position = new Chess(value); generation.current++; engine.current?.destroy(); engine.current = null; aiBusy.current = false; setWorking(false); time.reset(seconds); history(position); setError(""); } catch { setError("Invalid FEN position."); } }}
    onSave={() => { onSave(game.pgn()); setSaved(true); }}
    onExport={type => download(type === "pgn" ? game.pgn() : current, type === "pgn" ? "chess-infinity.pgn" : "position.fen")}
  />;
  return (
    <>
      <button className="text-btn back" onClick={onClose}>
        <ArrowLeft size={16} /> Back to academy
      </button>
      <div className="section-heading workspace-heading">
        <div>
          <span className="eyebrow">
            {mode === "play"
              ? "YOUR PRACTICE ARENA"
              : mode === "opening"
                ? "OPENING REPERTOIRE"
                : "POST-GAME & TRAINING ONLY"}
          </span>
          <h1>
            {opening?.name ||
              (mode === "play"
                ? "Play a practice game"
                : "Understand every move.")}
          </h1>
        </div>
        <span className="pill lavender">Stockfish 19 · Web Worker</span>
      </div>
      <div
        className={
          "board-layout workspace-layout " +
          (mode === "play" ? "bot-layout" : mode === "review" ? "review-layout" : "")
        }
      >
        <section ref={boardSection}>
          <div className="player-strip">
            <span className="avatar small">{mode === "play" ? "♞" : "♟"}</span>
            <strong>
              {mode === "play"
                ? "Stockfish · skill " + skill
                : mode === "review" ? `${flip ? "White" : "Black"} · ${playerName(flip ? "White" : "Black")}` : "Position workspace"}
            </strong>
            {mode === "play" && (
              <span
                className={
                  "clock " +
                  (time.clock.active === (flip ? "w" : "b") ? "running" : "")
                }
                aria-label="Bot remaining time"
              >
                {formatClock(time.clock.remaining[flip ? 0 : 1])}
              </span>
            )}
          </div>
          {mode === "play" && (
            <p className="board-input-tip">
              Drag a piece to a highlighted square, or tap the piece and
              destination.
            </p>
          )}
          <Board
            fen={current}
            onMove={move}
            flipped={flip}
            disabled={
              working || mode === "review" ||
              (mode === "play" &&
                (timeoutColor !== null ||
                  game.isGameOver() ||
                  game.turn() !== (flip ? "b" : "w")))
            }
            movableColor={mode === "play" ? (flip ? "b" : "w") : undefined}
            theme={boardTheme}
            blind={blind}
          />
          <div className="player-strip">
            <span className="avatar small you">♙</span>
            <strong>
              {mode === "play"
                ? "You · " + (flip ? "Black" : "White")
                : mode === "review" ? `${flip ? "Black" : "White"} · ${playerName(flip ? "Black" : "White")}` : "Analysis board"}
            </strong>
            {mode === "play" && (
              <span
                className={
                  "clock " +
                  (time.clock.active === (flip ? "b" : "w") ? "running" : "")
                }
                aria-label="Your remaining time"
              >
                {formatClock(time.clock.remaining[flip ? 1 : 0])}
              </span>
            )}
          </div>
          {variation ? <div className="review-variation" role="region" aria-label="Engine variation playback"><strong>{variation.title}</strong><div><button className="secondary" aria-label="Previous variation move" disabled={!variation.index} onClick={()=>setVariation(v=>v && ({...v,index:v.index-1}))}><ChevronLeft size={18}/></button><span>{variation.index} / {variation.positions.length-1}</span><button className="secondary" aria-label="Next variation move" disabled={variation.index===variation.positions.length-1} onClick={()=>setVariation(v=>v && ({...v,index:v.index+1}))}><ChevronRight size={18}/></button><button className="text-btn" onClick={()=>setVariation(null)}>Back to game</button></div><small>Exploring an engine line. Your imported game is preserved.</small></div> : <div className="board-tools">
            <button aria-label="First position" onClick={() => goTo(0)}>
              <ChevronsLeft size={20} />
            </button>
            <button
              aria-label="Previous move"
              onClick={() => goTo(Math.max(0, index - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              {index} / {positions.length - 1}
            </span>
            <button
              aria-label="Next move"
              onClick={() =>
                goTo(Math.min(positions.length - 1, index + 1))
              }
            >
              <ChevronRight size={20} />
            </button>
            <button
              aria-label="Last position"
              onClick={() => goTo(positions.length - 1)}
            >
              <ChevronsRight size={20} />
            </button>
            <button
              aria-label="Flip board"
              onClick={() => {
                if (mode === "play" && started) {
                  setError("Choose your color before starting a new game.");
                  return;
                }
                setFlip(!flip);
              }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          }
          <div className="position-status">
            {mode === "play" ? liveStatus : status}
          </div>
        </section>
        <aside className="card workspace-panel">
          <div className="tabs">
            {["insights", "moves", "import"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {error && <div className="feedback" role="alert">{error}</div>}
          {tab === "insights" && (
            <>
              {mode === "review" && <ReviewPanel rows={rows} total={moves.length} index={index} status={reviewStatus} working={working} ms={depth} onMs={setDepth} onReview={review} onStop={stopReview} onSelect={goTo} onLine={showLine} saved={reportSaved} side={reviewSide} onSide={value=>{setReviewSide(value);setReportSaved(false);}} ev={ev} onAnalyze={analyze} onSave={()=>{
                onReport({pgn:game.pgn(),rows:rows.filter(r=>r.reliable).map(({before,played,playedPv,afterFen,...row})=>row),summary:summarizeReview(game.pgn(),rows),playerSide:reviewSide || null,complete:reviewStatus === "complete" && rows.length === moves.length && rows.every(r=>r.reliable),method:"root-candidate-v2",thinkingTime:depth,date:new Date().toISOString()});setReportSaved(true);
              }} />}
              {opening && (
                <>
                  <span className="pill lavender">
                    {opening.eco} · {opening.side}
                  </span>
                  <h2>The idea behind the moves</h2>
                  <p>{opening.idea}</p>
                  <h3>A mistake to avoid</h3>
                  <p>{opening.mistake}</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setPractice(true);
                      setOpeningStep(0);
                      setPositions([new Chess().fen()]);
                      setMoves([]);
                      setIndex(0);
                      setError("Recall the line by playing both sides.");
                    }}
                  >
                    Practice this line <Play size={16} />
                  </button>
                </>
              )}
              {mode === "play" && (
                <>
                  <h2>{started ? "Practice controls" : "Set up your game"}</h2>
                  <p className="bot-strength-note">Stockfish skill is a training setting, not an official rating.</p>
                  <label>
                    Engine skill <strong>{skill} / 20</strong>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={skill}
                      disabled={started}
                      onChange={(e) => setSkill(+e.target.value)}
                    />
                  </label>
                  <label>
                    Time per side
                    <select
                      value={seconds}
                      disabled={started}
                      onChange={(e) => {
                        setSeconds(+e.target.value);
                        time.reset(+e.target.value);
                      }}
                    >
                      {[60, 180, 300, 600, 900, 1800].map((t) => (
                        <option value={t} key={t}>
                          {t / 60} {t === 60 ? "minute" : "minutes"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={
                      working ||
                      !!time.clock.active ||
                      timeoutColor !== null ||
                      game.isGameOver()
                    }
                    onClick={() => {
                      setStarted(true);
                      setError("");
                      time.run(game.turn());
                      if (game.turn() !== (flip ? "b" : "w")) void ai(game);
                    }}
                  >
                    {started ? "Resume practice" : "Start practice game"}{" "}
                    <Play size={16} />
                  </button>
                  <div className="inline-actions">
                    <button
                      className="secondary"
                      disabled={
                        working ||
                        timeoutColor !== null ||
                        moves.length < (flip ? 2 : 1)
                      }
                      onClick={() => {
                        const g = new Chess();
                        g.loadPgn(game.pgn());
                        g.undo();
                        if (g.turn() !== (flip ? "b" : "w")) g.undo();
                        time.run(g.turn());
                        history(g);
                        setError("");
                      }}
                    >
                      Take back
                    </button>
                    <button className="secondary" onClick={reset}>
                      New game
                    </button>
                  </div>
                  {onGuided && <button className="text-btn" onClick={onGuided}><BrainCircuit size={16} /> Play with guided feedback <ChevronRight size={14} /></button>}
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={blind}
                      onChange={(e) => setBlind(e.target.checked)}
                    />{" "}
                    Blindfold visualization
                  </label>
                </>
              )}
              {mode === "opening" && (
                <>
                  <div className="engine-score">
                    <span>
                      {ev
                        ? ev.mate !== null
                          ? "M" + ev.mate
                          : (ev.score > 0 ? "+" : "") + ev.score.toFixed(2)
                        : "—"}
                    </span>
                    <div>
                      <strong>
                        {ev ? "Position evaluation" : "Let’s look deeper"}
                      </strong>
                      <small>
                        {ev
                          ? "Depth " + ev.depth + " · White perspective"
                          : "Local engine · no game sent to a server"}
                      </small>
                    </div>
                  </div>
                  <label>
                    Thinking time
                    <select
                      value={depth}
                      onChange={(e) => setDepth(+e.target.value)}
                    >
                      <option value="350">Quick · 0.35 seconds</option>
                      <option value="1500">Focused · 1.5 seconds</option>
                      <option value="4000">Deep · 4 seconds</option>
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={working || view.isGameOver()}
                    onClick={analyze}
                  >
                    <BrainCircuit size={17} />
                    {working ? "Engine thinking…" : "Analyze this position"}
                  </button>
                  {ev && (
                    <div className="feedback">
                      <strong>Engine line</strong>
                      <p className="mono">
                        {sanLine(current, ev.pv) || "No continuation"}
                      </p>
                      <small>
                        Evaluation is an engine estimate. Recalculate after
                        changing the position.
                      </small>
                    </div>
                  )}
                  {mode === "opening" && (
                    <>
                      <button
                        className="secondary full"
                        disabled={working || practice}
                        onClick={async () => {
                          setWorking(true);
                          setError("");
                          try {
                            const r = await fetch(
                              "/api/explorer?fen=" +
                                encodeURIComponent(current),
                            );
                            const b: any = await r.json();
                            if (!r.ok) throw new Error(b.error);
                            setExplorer(b);
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setWorking(false);
                          }
                        }}
                      >
                        Explore real continuation statistics
                      </button>
                      {explorer && (
                        <div className="opening-explorer">
                          <span className="eyebrow">
                            LICHESS · RAPID & CLASSICAL · 1600–2500+
                          </span>
                          <p>
                            {(
                              (explorer.white || 0) +
                              (explorer.draws || 0) +
                              (explorer.black || 0)
                            ).toLocaleString()}{" "}
                            games in this position. Counts are historical
                            results, not move evaluations.
                          </p>
                          <div className="explorer-head">
                            <span>Move</span>
                            <span>White / Draw / Black</span>
                          </div>
                          {explorer.moves?.map((m: any) => (
                            <button
                              key={m.uci}
                              onClick={() =>
                                move(
                                  m.uci.slice(0, 2),
                                  m.uci.slice(2, 4),
                                  m.uci[4] || "q",
                                )
                              }
                            >
                              <strong>{m.san}</strong>
                              <span>
                                {m.white.toLocaleString()} /{" "}
                                {m.draws.toLocaleString()} /{" "}
                                {m.black.toLocaleString()}
                              </span>
                              <ChevronRight size={14} />
                            </button>
                          ))}
                          {!explorer.moves?.length && (
                            <p>No continuations in this filtered dataset.</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <button
                    className="text-btn"
                    disabled={working}
                    onClick={async () => {
                      setWorking(true);
                      try {
                        const r = await fetch(
                          "/api/tablebase?fen=" + encodeURIComponent(current),
                        );
                        const b: any = await r.json();
                        if (!r.ok) throw new Error(b.error);
                        setTablebase(b);
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setWorking(false);
                      }
                    }}
                  >
                    Look up seven-piece tablebase
                  </button>
                  {tablebase && (
                    <div className="feedback">
                      <strong>Tablebase: {tablebase.category}</strong>
                      <p>
                        Side-to-move result; DTZ{" "}
                        {tablebase.dtz ?? "unavailable"}. Consider the
                        fifty-move rule. Best:{" "}
                        {tablebase.moves?.[0]?.san || "—"}.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {tab === "moves" && (
            <>
              <h2>Every move tells a story.</h2>
              <div className="move-list">
                <button
                  className={index === 0 ? "active" : ""}
                  onClick={() => goTo(0)}
                >
                  Start position
                </button>
                {moves.map((m, i) => (
                  <button
                    key={i}
                    className={index === i + 1 ? "active" : ""}
                    onClick={() => {
                      goTo(i + 1);
                      setEv(null);
                      setTablebase(null);
                    }}
                  >
                    {positions[i].split(" ")[5]}{positions[i].split(" ")[1] === "w" ? "." : "…"} {m}{mode === "review" && rows[i] && <small className="review-move-label">{rows[i].label}</small>}
                  </button>
                ))}
              </div>
              <button
                className="secondary"
                disabled={!moves.length}
                onClick={() => {
                  onSave(game.pgn());
                  setSaved(true);
                }}
              >
                {saved ? "Saved to your games" : "Save to my games"}
              </button>
            </>
          )}
          {tab === "import" && (
            <>
              <h2>Bring your game.</h2>
              <p>
                Paste a completed game or a training PGN. All moves are checked
                with chess.js.
              </p>
              <textarea
                rows={7}
                aria-label="Game PGN"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  '[White "You"]\n[Black "Opponent"]\n1. e4 e5 2. Nf3 Nc6'
                }
              />
              <div className="inline-actions">
                <button
                  className="primary"
                  disabled={mode === "play" && started}
                  onClick={() => loadPgn(text)}
                >
                  Load PGN
                </button>
                <label className="secondary file-btn">
                  <Upload size={16} /> File
                  <input
                    type="file"
                    accept=".pgn,.txt"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 1000000) {
                          setError("Use a PGN file smaller than 1 MB.");
                          return;
                        }
                        const s = await f.text();
                        setText(s);
                        loadPgn(s);
                      }
                    }}
                  />
                </label>
              </div>
              <label>
                Starting FEN
                <textarea
                  rows={3}
                  value={fenText}
                  onChange={(e) => setFenText(e.target.value)}
                  placeholder="Paste a valid FEN position"
                />
              </label>
              <button
                className="secondary"
                disabled={mode === "play" && started}
                onClick={() => {
                  try {
                    const position = new Chess(fenText);
                    generation.current++;
                    engine.current?.destroy();
                    engine.current = null;
                    aiBusy.current = false;
                    setWorking(false);
                    time.reset(seconds);
                    history(position);
                    setError("");
                  } catch {
                    setError("Invalid FEN position.");
                  }
                }}
              >
                Load position
              </button>
              <div className="inline-actions">
                <button
                  className="text-btn"
                  onClick={() => download(game.pgn(), "chess-infinity.pgn")}
                >
                  <Download size={15} /> PGN
                </button>
                <button
                  className="text-btn"
                  onClick={() => download(current, "position.fen")}
                >
                  <Download size={15} /> FEN
                </button>
              </div>
            </>
          )}
          <div className="lesson-note">
            <strong>Training comes first.</strong>
            <p>
              Use engine assistance only in local practice and completed-game
              review.
            </p>
            <a
              href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1"
              target="_blank"
              rel="noreferrer"
            >
              Stockfish source · GPLv3
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
