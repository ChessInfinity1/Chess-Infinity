"use client";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  RotateCcw,
  Check,
  RefreshCw,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Board from "./Board";
import { explainMove } from "../../lib/chess/explain-move";
import { Exercise, Lesson } from "../../lib/chess/content";
export default function Training({
  exercise,
  lesson,
  onClose,
  onComplete,
  boardTheme,
  onNext,
  explainMoves = true,
  bookmarked = false,
  onToggleBookmark,
  backLabel,
  nextLabel,
}: {
  exercise: Exercise;
  lesson?: Lesson;
  onClose: () => void;
  onComplete: (correct: boolean, understanding?: { correctFirstTry: boolean }) => void;
  explainMoves?: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  backLabel?: string;
  nextLabel?: string;
  boardTheme: string;
  onNext?: () => void;
}) {
  const [game, setGame] = useState(() => new Chess(exercise.fen));
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [flip, setFlip] = useState(exercise.fen.split(" ")[1] === "b");
  const [busy, setBusy] = useState(false);
  const [playedLine, setPlayedLine] = useState<string[]>([]);
  const [reasonAnswer, setReasonAnswer] = useState<number | null>(null);
  const [reasonMissed, setReasonMissed] = useState(false);
  const [replay, setReplay] = useState<number | null>(null);
  const proof = useMemo(() => explainMove({ ...exercise, line: done ? playedLine : exercise.line }), [exercise, done, playedLine]);
  const needsReason = !lesson && explainMoves;
  const understood = !needsReason || reasonAnswer === proof.answer;
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (step % 2 === 1 && step < exercise.line.length) {
      setBusy(true);
      t = setTimeout(() => {
        const next = new Chess(game.fen());
        const u = exercise.line[step];
        next.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        setGame(next);
        setPlayedLine((line) => [...line, u]);
        setStep((s) => s + 1);
        setBusy(false);
        setMessage("Your turn. Continue the idea.");
      }, 600);
    }
    return () => clearTimeout(t);
  }, [step]);
  function move(from: string, to: string, promotion = "q") {
    if (done || busy) return;
    const next = new Chess(game.fen());
    try {
      const m = next.move({ from, to, promotion });
      const u = m.from + m.to + (m.promotion || "");
      const expected = exercise.line[step];
      const final = step === exercise.line.length - 1;
      const target = new Chess(game.fen());
      target.move({
        from: expected.slice(0, 2),
        to: expected.slice(2, 4),
        promotion: expected[4],
      });
      if (
        u !== expected &&
        !(final && target.isCheckmate() && next.isCheckmate())
      ) {
        setFailed(true);
        setMessage(
          "That move is legal, but it does not solve this exercise. Look again.",
        );
        return;
      }
      setGame(next);
      setPlayedLine((line) => [...line, u]);
      setStep(step + 1);
      setMessage(final ? exercise.explanation : "Good move. Watch the reply.");
      if (final) setDone(true);
    } catch {
      setMessage("That move is not legal in this position.");
    }
  }
  function finish() {
    if (saved) return;
    if (!understood) return;
    onComplete(!failed, needsReason ? { correctFirstTry: !reasonMissed } : undefined);
    setSaved(true);
  }
  return (
    <div className="training-page">
      <div className="training-top-actions">
      <button className="text-btn back" onClick={onClose}>
        <ArrowLeft size={17} /> Back to {backLabel || (lesson ? "lessons" : "puzzles")}
      </button>
      {onToggleBookmark && <button className="training-bookmark" aria-pressed={bookmarked} onClick={onToggleBookmark}><Bookmark size={17} fill={bookmarked ? "currentColor" : "none"}/>{bookmarked ? "Saved for later" : "Save for later"}</button>}
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {lesson ? "INTERACTIVE LESSON" : "TACTICAL PRACTICE"} ·{" "}
            {exercise.theme}
          </span>
          <h1>{exercise.title}</h1>
        </div>
        <span className="pill">
          {lesson
            ? lesson.minutes + " min"
            : exercise.rating + " training difficulty"}
        </span>
      </div>
      <div className="board-layout">
        <section>
          <Board
            fen={done && replay !== null ? proof.fens[replay] : game.fen()}
            onMove={move}
            flipped={flip}
            disabled={done || busy}
            theme={boardTheme}
          />
          <div className="board-tools">
            <span>
              {done
                ? "Exercise complete"
                : busy
                  ? "Opponent replying…"
                  : (game.turn() === "w" ? "White" : "Black") + " to move"}
            </span>
            <button aria-label="Flip board" onClick={() => setFlip(!flip)}>
              <RefreshCw size={17} />
            </button>
            <button
              aria-label="Restart exercise"
              onClick={() => {
                setGame(new Chess(exercise.fen));
                setStep(0);
                setDone(false);
                setQuiz(null);
                setSaved(false);
                setFailed(false);
                setBusy(false);
                setMessage("");
                setPlayedLine([]);
                setReasonAnswer(null);
                setReasonMissed(false);
                setReplay(null);
              }}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          {done && <div className="solution-replay" aria-label="Solution replay"><div><strong>Replay the solution</strong><span>{replay === 0 ? "Starting position" : `${replay ?? proof.moves.length} / ${proof.moves.length} plies`}</span></div><div className="solution-replay-controls"><button className="secondary" aria-label="Previous solution move" disabled={(replay ?? proof.moves.length) === 0} onClick={() => setReplay(Math.max(0, (replay ?? proof.moves.length) - 1))}><ChevronLeft size={18}/></button><span>{replay === 0 ? "Start" : proof.moves[(replay ?? proof.moves.length) - 1]}</span><button className="secondary" aria-label="Next solution move" disabled={(replay ?? proof.moves.length) === proof.moves.length} onClick={() => setReplay(Math.min(proof.moves.length, (replay ?? proof.moves.length) + 1))}><ChevronRight size={18}/></button></div></div>}
        </section>
        <aside className="card training-panel">
          <span className="pill lavender">
            {lesson ? "Learn by doing" : "Find the idea"}
          </span>
          <h2>{done ? "Nicely calculated." : "Your next move matters."}</h2>
          <p>
            {lesson?.intro ||
              "Study the position, look for checks and captures, then play the strongest continuation. You control " +
                (exercise.fen.split(" ")[1] === "w" ? "White." : "Black.")}
          </p>
          <div className={"feedback " + (done ? "success" : "")}>
            {message ||
              "Tap a piece to see its legal moves. Tap a destination or drag the piece."}
          </div>
          {!done && (
            <button
              className="secondary"
              onClick={() => {
                setFailed(true);
                setMessage(exercise.hint);
              }}
            >
              <Lightbulb size={17} /> Give me a hint
            </button>
          )}
          {done && needsReason && <div className="move-explanation quiz"><span className="eyebrow">EXPLAIN YOUR MOVE · {proof.evidence}</span><h3>{proof.question}</h3><p>Check your understanding before saving. Use the replay if you need another look.</p>{proof.choices.map((choice, i) => <button key={i} disabled={saved || reasonAnswer === proof.answer} className={"quiz-choice " + (reasonAnswer === i ? i === proof.answer ? "right" : "wrong" : "")} onClick={() => {setReasonAnswer(i);if (i !== proof.answer) setReasonMissed(true);}}>{choice}{reasonAnswer === i && i === proof.answer && <Check size={16}/>}</button>)}{reasonAnswer !== null && <p role="status">{reasonAnswer === proof.answer ? proof.detail : "Not quite. Replay the move, then compare checks, captures, and the final position."}</p>}</div>}
          {done && lesson && (
            <div className="quiz">
              <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
              <h3>{lesson.question}</h3>
              {lesson.choices.map((c, i) => (
                <button
                  key={i}
                  className={
                    "quiz-choice " +
                    (quiz === i
                      ? i === lesson.answer
                        ? "right"
                        : "wrong"
                      : "")
                  }
                  onClick={() => setQuiz(i)}
                >
                  {c}
                  {quiz === i && i === lesson.answer && <Check size={16} />}
                </button>
              ))}
              {quiz !== null && (
                <p>
                  {quiz === lesson.answer
                    ? lesson.feedback
                    : "Try again. Think about the purpose of the move you just played."}
                </p>
              )}
            </div>
          )}
          {done && understood && (!lesson || quiz === lesson.answer) && (
            <button
              className="primary"
              onClick={() => {
                if (!saved) finish();
                else onClose();
              }}
            >
              {saved
                ? "Back to training"
                : lesson
                  ? "Complete lesson"
                  : "Save practice result"}
              <ArrowRight size={17} />
            </button>
          )}
          {saved && onNext && (
            <button className="secondary full" onClick={onNext}>
              {nextLabel || "Next recommended position"} <ArrowRight size={17} />
            </button>
          )}
          {exercise.source && (
            <div className="training-source">
              <a href={exercise.source.url} target="_blank" rel="noreferrer">
                View source puzzle ↗
              </a>
              <small>
                {exercise.source.name} · {exercise.source.license}. Difficulty
                is the source puzzle rating, not your playing rating.
              </small>
            </div>
          )}
          <div className="lesson-note">
            <strong>A little better, every move.</strong>
            <p>
              Take your time. Understanding the pattern matters more than
              getting it right on the first try.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
