"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Flag,
  Flame,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import {
  levels,
  lessons,
  type Lesson,
  type Progress,
} from "../../lib/chess/content";
import {
  trailUnits,
  trailPoint,
  trailCurve,
} from "../../lib/chess/learning-trail";
import { nextLearningLesson } from "../../lib/chess/learning";
const descriptions = [
  "Get comfortable with the board, the pieces, and your first good decisions.",
  "Build reliable habits. Recognize opportunities and turn them into good moves.",
  "Train your eye for tactical targets, forcing moves, and useful combinations.",
  "Explore activity, pawn structures, endgames, and plans that give your pieces a purpose.",
  "Practice careful conversion and precise endgame calculation.",
  "Build calculation discipline with deeper tactical exercises.",
];
export default function LearningTrail({
  progress,
  level,
  onLevel,
  onLesson,
  onAssessment,
}: {
  progress: Progress;
  level: number;
  onLevel: (level: number) => void;
  onLesson: (lesson: Lesson) => void;
  onAssessment: () => void;
}) {
  const units = trailUnits(level);
  const next = nextLearningLesson(progress);
  const track = units.flatMap((u) => u.lessons);
  const done = track.filter((l) => progress.completed.includes(l.id)).length;
  const [jump, setJump] = useState(false);
  useEffect(() => {
    if (jump && level === next.level) {
      document.getElementById("trail-" + next.id)?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      setJump(false);
    }
  }, [jump, level, next.id, next.level]);
  return (
    <>
      <div className="section-heading trail-page-heading">
        <div>
          <span className="eyebrow">ONE GOOD MOVE AT A TIME</span>
          <h1>Your learning trail.</h1>
          <p>
            Follow the trail, build a habit, and turn each new idea into a move.
          </p>
        </div>
        <button className="secondary" onClick={onAssessment}>
          <Compass size={16} />
          Find my starting point
        </button>
      </div>
      <div className="trail-level-tabs" aria-label="Learning tracks">
        {levels.map((title, i) => {
          const count = lessons.filter((l) => l.level === i + 1);
          const complete = count.filter((l) =>
            progress.completed.includes(l.id),
          ).length;
          return (
            <button
              key={title}
              aria-pressed={level === i + 1}
              className={level === i + 1 ? "active" : ""}
              onClick={() => onLevel(i + 1)}
            >
              <span className="trail-track-number">
                {complete === count.length ? <Check size={15} /> : i + 1}
              </span>
              <span>
                {title}
                <small>
                  {complete}/{count.length} lessons
                </small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="trail-layout">
        <div className="trail-main">
          <section className="trail-track-header">
            <span className="trail-header-symbol">
              <Flag size={27} />
            </span>
            <div>
              <span className="eyebrow">TRACK {level} OF 6</span>
              <h2>{levels[level - 1]}</h2>
              <p>{descriptions[level - 1]}</p>
              <div
                className="trail-track-progress"
                role="progressbar"
                aria-label="Track completion"
                aria-valuemin={0}
                aria-valuemax={track.length}
                aria-valuenow={done}
              >
                <i style={{ width: `${(done / track.length) * 100}%` }} />
              </div>
              <small>
                {done} of {track.length} lessons completed
              </small>
            </div>
          </section>
          {units.map((unit) => {
            const complete = unit.lessons.filter((l) =>
              progress.completed.includes(l.id),
            ).length;
            const finished = complete === unit.lessons.length;
            const height = unit.lessons.length * 176 + 22;
            return (
              <section
                className="trail-unit"
                key={unit.id}
                aria-labelledby={unit.id}
              >
                <div className="trail-unit-heading">
                  <span>{String(unit.number).padStart(2, "0")}</span>
                  <div>
                    <h3 id={unit.id}>{unit.title}</h3>
                    <small>
                      {complete}/{unit.lessons.length} lessons complete
                    </small>
                  </div>
                  {finished && <Check size={18} />}
                </div>
                <div className="trail-road" style={{ height }}>
                  <svg
                    viewBox={`0 0 480 ${height}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d={trailCurve(unit.lessons.length)}
                      className="trail-line-shadow"
                    />
                    <path
                      d={trailCurve(unit.lessons.length)}
                      className="trail-line"
                    />
                  </svg>
                  {unit.lessons.map((lesson, i) => {
                    const point = trailPoint(i);
                    const actualPoint = { ...point, y: 58 + i * 176 };
                    const isDone = progress.completed.includes(lesson.id);
                    const current = next.id === lesson.id;
                    const Icon = isDone
                      ? Check
                      : current
                        ? BookOpen
                        : [Star, Target, BookOpen, Flag][i % 4];
                    return (
                      <div
                        className={
                          "trail-stop " +
                          (isDone ? "completed " : "") +
                          (current ? "current" : "")
                        }
                        key={lesson.id}
                        id={"trail-" + lesson.id}
                        style={{
                          left: `${(actualPoint.x / 480) * 100}%`,
                          top: actualPoint.y - 34,
                        }}
                      >
                        {current && (
                          <span className="trail-next-bubble">NEXT UP</span>
                        )}
                        <button
                          className="trail-node"
                          onClick={() => onLesson(lesson)}
                          aria-label={`${isDone ? "Review" : current ? "Continue" : "Start"}: ${lesson.title}. ${lesson.minutes} minutes.`}
                        >
                          <span>
                            <Icon size={28} strokeWidth={2.6} />
                          </span>
                          {current && <i />}
                        </button>
                        <strong>{lesson.title}</strong>
                        <small>
                          {isDone
                            ? "Completed · practice again"
                            : `${lesson.minutes} min · interactive lesson`}
                        </small>
                      </div>
                    );
                  })}
                </div>
                <div
                  className={"trail-milestone " + (finished ? "earned" : "")}
                >
                  <span>
                    <Trophy size={25} />
                  </span>
                  <div>
                    <strong>
                      {finished
                        ? "Unit complete. Keep the momentum."
                        : "A milestone worth reaching."}
                    </strong>
                    <small>
                      {finished
                        ? "Every lesson in this unit is complete."
                        : `Complete these ${unit.lessons.length} lessons to finish this unit.`}
                    </small>
                  </div>
                  {finished ? <Check size={19} /> : <Flag size={18} />}
                </div>
              </section>
            );
          })}
          <section className="trail-end">
            <span>
              <Trophy size={32} />
            </span>
            <h2>
              {done === track.length
                ? "You finished this trail."
                : "Every small step counts."}
            </h2>
            <p>
              {done === track.length
                ? "Revisit an idea or explore the next track when you feel ready."
                : "One clear idea today can become a better decision tomorrow."}
            </p>
            {level < 6 && (
              <button
                className="secondary"
                onClick={() => {
                  onLevel(level + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Explore the next track <ChevronRight size={16} />
              </button>
            )}
            <p className="fine trail-scope-note">
              {lessons.length} original, playable lessons. Advanced tracks
              currently teach foundational drills; a complete master curriculum
              is still growing. All lessons remain open for exploration.
            </p>
          </section>
        </div>
        <aside className="trail-companion">
          <section className="card trail-continue">
            <span className="feature-symbol">
              <Flame size={25} />
            </span>
            <span className="eyebrow">YOUR NEXT GOOD MOVE</span>
            <h2>{next.title}</h2>
            <p>
              {next.theme} · {next.minutes} focused minutes
            </p>
            <button className="primary" onClick={() => onLesson(next)}>
              Continue learning <ArrowRight size={16} />
            </button>
            <button
              className="text-btn"
              onClick={() => {
                onLevel(next.level);
                setJump(true);
              }}
            >
              Show my place on the trail
            </button>
          </section>
          <section className="card trail-note">
            <BookOpen size={23} />
            <h3>Learn it. Play it. Remember it.</h3>
            <p>
              Every node opens a real board challenge and a quick quiz.
              Completed lessons stay available for review.
            </p>
            <small>
              Explore freely: the trail suggests an order, and all lessons
              remain accessible. Training XP is separate from official ratings.
              Advanced tracks currently offer foundational drills.
            </small>
          </section>
        </aside>
      </div>
    </>
  );
}
