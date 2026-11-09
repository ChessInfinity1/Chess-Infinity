"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import { ArrowRight, CheckCircle2, Compass, RotateCcw } from "lucide-react";
import Board from "./Board";
import { lessons } from "../../lib/chess/content";
import {
  assessmentTasks,
  answerAssessment,
  assessmentSummary,
  type AssessmentDraft,
  type AssessmentResult,
} from "../../lib/chess/assessment";
export default function SkillAssessment({
  draft,
  latest,
  boardTheme,
  onDraft,
  onFinish,
  onLesson,
  onGuided,
}: {
  draft: AssessmentDraft | null;
  latest?: AssessmentResult;
  boardTheme: string;
  onDraft: (draft: AssessmentDraft | null) => void;
  onFinish: (result: AssessmentResult) => void;
  onLesson: (id: string) => void;
  onGuided: () => void;
}) {
  const [session, setSession] = useState<AssessmentDraft | null>(draft);
  const [index, setIndex] = useState(draft?.answers.length || 0);
  const [feedback, setFeedback] = useState("");
  const [fen, setFen] = useState(assessmentTasks[Math.min(index, 7)].fen);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState<AssessmentResult | undefined>(
    latest,
  );
  function start() {
    const s = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      answers: [],
    };
    setSession(s);
    onDraft(s);
    setIndex(0);
    setFen(assessmentTasks[0].fen);
    setAnswered(false);
    setFeedback("");
    setFinished(undefined);
  }
  function answer(uci: string | null) {
    if (answered || !session) return;
    try {
      const task = assessmentTasks[index];
      const a = answerAssessment(task.id, uci);
      const next = { ...session, answers: [...session.answers, a] };
      setSession(next);
      onDraft(next);
      if (uci) {
        const g = new Chess(task.fen);
        g.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        });
        setFen(g.fen());
      }
      setAnswered(true);
      setFeedback(
        (a.correct
          ? "Recognized. "
          : uci
            ? "A legal move, but a different idea. "
            : "Saved as not yet recognized. ") + task.explanation,
      );
    } catch {
      setFeedback("Choose a legal move in this position.");
    }
  }
  function next() {
    if (!session) return;
    if (
      index === assessmentTasks.length - 1 ||
      session.answers.length === assessmentTasks.length
    ) {
      const r = {
        ...session,
        version: 1 as const,
        completedAt: new Date().toISOString(),
      };
      onFinish(r);
      setFinished(r);
      setSession(null);
      return;
    }
    const i = index + 1;
    setIndex(i);
    setFen(assessmentTasks[i].fen);
    setAnswered(false);
    setFeedback("");
  }
  const result = finished ? assessmentSummary(finished) : null;
  if (!session)
    return (
      <section className="card skill-assessment-intro">
        <span className="feature-symbol">
          <Compass size={30} />
        </span>
        <span className="eyebrow">YOUR STARTING POINT</span>
        <h1>
          {result
            ? "A path built from your moves."
            : "Find your next learning step."}
        </h1>
        <p>
          Eight short, untimed board challenges. We check your first legal move
          across four foundational skills. This is a learning snapshot, not an
          Elo estimate or a complete measure of chess strength.
        </p>
        {result && (
          <>
            <div className="skill-snapshot-grid">
              {result.skills.map((s) => (
                <div key={s.skill}>
                  <strong>
                    {s.clean}/{s.total}
                  </strong>
                  <span>{s.skill}</span>
                  <small>
                    {s.clean === 2
                      ? "Recognized in this check"
                      : "Worth revisiting"}
                  </small>
                </div>
              ))}
            </div>
            <p>
              Suggested focus: <strong>{result.focus}</strong>. Two positions
              per skill are a small sample. Repeating the same check measures
              recall, so use normal practice to confirm progress.
            </p>
            <div className="learning-action-list">
              {result.lessons.map((id) => (
                <button
                  className="secondary"
                  key={id}
                  onClick={() => onLesson(id)}
                >
                  {lessons.find((l) => l.id === id)?.title ||
                    "Practice this idea"}{" "}
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </>
        )}
        <div className="inline-actions">
          {draft && (
            <button
              className="secondary"
              onClick={() => {
                setSession(draft);
                setIndex(draft.answers.length);
                setFen(assessmentTasks[Math.min(draft.answers.length, 7)].fen);
                setAnswered(false);
                setFeedback("");
                setFinished(undefined);
              }}
            >
              Resume saved skill check <ArrowRight size={16} />
            </button>
          )}
          <button className="primary" onClick={start}>
            {result ? <RotateCcw size={16} /> : <Compass size={16} />}{" "}
            {result ? "Retake skill check" : "Start 8-position skill check"}
          </button>
          {result && (
            <button className="secondary" onClick={onGuided}>
              Try a guided game <ArrowRight size={16} />
            </button>
          )}
        </div>
        <p className="fine">
          No XP or external rating changes. Answers save as you go. You can skip
          a position and return to practice later.
        </p>
      </section>
    );
  const task = assessmentTasks[Math.min(index, 7)];
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">STARTING SKILL CHECK</span>
          <h1>One position. One idea.</h1>
        </div>
        <span className="pill lavender">{Math.min(index + 1, 8)} / 8</span>
      </div>
      <div className="assessment-progress" aria-label="Assessment progress">
        {assessmentTasks.map((t, i) => (
          <i
            key={t.id}
            className={
              i < session.answers.length ? "done" : i === index ? "current" : ""
            }
          />
        ))}
      </div>
      <div className="board-layout assessment-layout">
        <Board
          fen={fen}
          onMove={(from, to, promotion) =>
            answer(from + to + (promotion || ""))
          }
          disabled={answered || index >= 8}
          theme={boardTheme}
        />
        <section className="card assessment-prompt">
          <span className="eyebrow">{task.skill} · WHITE TO MOVE</span>
          <h2>{task.title}</h2>
          <p>{task.prompt}</p>
          <p className="fine">
            Your first legal move is recorded. An illegal move is rejected
            without using your attempt.
          </p>
          {feedback && (
            <div className="feedback" role="status">
              {feedback}
            </div>
          )}
          {answered ? (
            <>
              <button
                className="text-btn"
                onClick={() => {
                  const g = new Chess(task.fen);
                  const u = task.answers[0];
                  g.move({
                    from: u.slice(0, 2),
                    to: u.slice(2, 4),
                    promotion: u[4],
                  });
                  setFen(g.fen());
                }}
              >
                Show the target move on the board
              </button>
              <button className="primary" onClick={next}>
                {index === 7 ? "Save my learning snapshot" : "Next position"}
                <ArrowRight size={16} />
              </button>
            </>
          ) : index >= 8 ? (
            <button className="primary" onClick={next}>
              Save my learning snapshot <CheckCircle2 size={16} />
            </button>
          ) : (
            <button className="secondary" onClick={() => answer(null)}>
              I’m not sure · skip
            </button>
          )}
          <button
            className="text-btn"
            onClick={() => {
              setSession(null);
              setFinished(latest);
            }}
          >
            Pause skill check
          </button>
        </section>
      </div>
    </>
  );
}
