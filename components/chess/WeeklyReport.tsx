"use client";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Target,
  TrendingUp,
} from "lucide-react";
import { weeklyReport, compareWeeks } from "../../lib/chess/weekly";
import { type Progress, lessons } from "../../lib/chess/content";
export default function WeeklyReport({
  progress,
  onNavigate,
  onPattern,
}: {
  progress: Progress;
  onNavigate: (page: string) => void;
  onPattern: (theme: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const report = weeklyReport(progress, offset, now);
  const previous = weeklyReport(progress, offset + 1, now);
  const delta = compareWeeks(report, previous);
  const format = (key: string) =>
    new Date(key + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const last = report.range.days[6];
  const max = Math.max(1, ...report.daily.map((d) => d.actions));
  const weak = report.skills.find(
    (s) => s.attempts >= 3 && s.clean < s.attempts,
  );
  function exportReport() {
    const data = {
      version: 1,
      generatedAt: now.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      report,
      previous,
      comparison: delta,
      method:
        "Browser-local Monday–Sunday weeks. Clean puzzle = no hint or wrong move. Lesson dates retain latest practice. Game outcomes require a linked player side. Engine review summaries use complete saved reviews only; short searches are estimates. Guided decisions are reported separately.",
    };
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `chess-week-${report.range.start}.json`;
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR WEEK IN CHESS</span>
          <h1>See what your practice is building.</h1>
          <p>Real activity, useful comparisons, and a focused next step.</p>
        </div>
        <button className="secondary" onClick={exportReport}>
          <Download size={16} />
          Export report
        </button>
      </div>
      <div className="weekly-period">
        <CalendarDays size={20} />
        <div>
          <strong>
            {format(report.range.start)} – {format(last)}
          </strong>
          <small>
            {offset === 0
              ? "Current week · still in progress"
              : "Completed calendar week"}{" "}
            · local time
          </small>
        </div>
        <select
          aria-label="Report week"
          value={offset}
          onChange={(e) => setOffset(+e.target.value)}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <option key={i} value={i}>
              {i === 0 ? "This week" : i === 1 ? "Last week" : `${i} weeks ago`}
            </option>
          ))}
        </select>
      </div>
      <div className="weekly-metrics">
        {[
          {
            n: report.activeDays,
            label: "Active training days",
            sub: `${previous.activeDays} in the previous week`,
          },
          {
            n: report.lessonIds.length,
            label: "Lessons practiced",
            sub: "Dated lesson records",
          },
          {
            n: report.attempts,
            label: "Puzzle attempts",
            sub: `${report.clean} solved cleanly`,
          },
          {
            n: report.cleanRate === null ? "—" : report.cleanRate + "%",
            label: "Clean-solve rate",
            sub:
              delta.puzzleChange === null
                ? "Need 5 attempts in each week to compare"
                : `${delta.puzzleChange >= 0 ? "+" : ""}${delta.puzzleChange} percentage points vs. previous week`,
          },
        ].map((m) => (
          <section className="card" key={m.label}>
            <strong>{m.n}</strong>
            <span>{m.label}</span>
            <small>{m.sub}</small>
          </section>
        ))}
      </div>
      <div className="weekly-columns">
        <section className="card weekly-activity">
          <div className="card-heading">
            <h2>A rhythm you can see.</h2>
            <TrendingUp size={20} />
          </div>
          <p>
            Recorded training actions by day: puzzle attempts, dated lessons,
            guided decisions, skill checks, and arcade runs.
          </p>
          <div
            className="weekly-bars"
            role="img"
            aria-label={report.daily
              .map((d) => `${format(d.date)}: ${d.actions} actions`)
              .join("; ")}
          >
            {report.daily.map((d) => (
              <div key={d.date}>
                <strong>{d.actions || "·"}</strong>
                <div>
                  <i
                    style={{
                      height: `${Math.max(d.actions ? 5 : 0, (d.actions / max) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {new Date(d.date + "T12:00:00").toLocaleDateString(
                    undefined,
                    { weekday: "short" },
                  )}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="card weekly-focus">
          <span className="feature-symbol">
            <Target size={25} />
          </span>
          <h2>
            {weak
              ? `Give ${weak.theme.toLowerCase()} some attention.`
              : "Make your next week intentional."}
          </h2>
          <p>
            {weak
              ? `${weak.clean} of ${weak.attempts} attempts were clean this week. Practice a few fresh positions, then revisit what you missed.`
              : report.attempts
                ? "Keep recording practice. Three attempts in a pattern help us suggest a more specific focus."
                : "Start with the skill check, then play a guided game. Your first results will give this report something useful to compare."}
          </p>
          <button
            className="primary"
            onClick={() =>
              weak ? onPattern(weak.theme) : onNavigate("assessment")
            }
          >
            {weak ? "Practice this pattern" : "Find my starting point"}
            <ArrowRight size={16} />
          </button>
          <button className="text-btn" onClick={() => onNavigate("guided")}>
            Play a guided game <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <div className="weekly-columns">
        <section className="card weekly-detail">
          <h2>Your thinking, with feedback.</h2>
          <dl>
            <div>
              <dt>Guided decisions analyzed</dt>
              <dd>{report.guided.moves}</dd>
            </div>
            <div>
              <dt>Guided decisions with ≥2 pawn estimated loss</dt>
              <dd>{report.guided.blunders}</dd>
            </div>
            <div>
              <dt>Skill checks completed</dt>
              <dd>{report.assessments}</dd>
            </div>
            <div>
              <dt>Complete personal reviews saved</dt>
              <dd>{report.review.reports}</dd>
            </div>
            <div>
              <dt>Your moves in those reviews</dt>
              <dd>{report.review.moves}</dd>
            </div>
            <div>
              <dt>Blunders in those reviewed moves</dt>
              <dd>{report.review.moves ? report.review.blunders : "—"}</dd>
            </div>
          </dl>
          <p>
            {delta.blunderRateChange === null
              ? "At least 20 reviewed moves in each week are needed before comparing blunder rates."
              : `${Math.abs(delta.blunderRateChange).toFixed(1)} ${delta.blunderRateChange > 0 ? "more" : "fewer"} blunders per 100 reviewed moves than the previous week.`}
          </p>
          <small>
            Review activity is dated when findings are saved. Only complete
            reviews with full move summaries and an identified player side
            qualify. Older partial findings cannot supply a fair denominator.
            Guided practice is counted separately.
          </small>
        </section>
        <section className="card weekly-detail">
          <h2>Your completed external games.</h2>
          <dl>
            <div>
              <dt>Imported games played in this week</dt>
              <dd>{report.games.total}</dd>
            </div>
            <div>
              <dt>Wins / draws / losses</dt>
              <dd>
                {report.games.wins} / {report.games.draws} /{" "}
                {report.games.losses}
              </dd>
            </div>
            <div>
              <dt>Arcade runs finished</dt>
              <dd>{report.arcade}</dd>
            </div>
          </dl>
          <p>
            Game results include retained completed games whose player matches a
            linked Chess.com or Lichess profile. Training XP and puzzle scores
            are separate from external ratings.
          </p>
          <button
            className="secondary"
            onClick={() => onNavigate("connections")}
          >
            Sync recent games <ArrowRight size={15} />
          </button>
        </section>
      </div>
      {report.lessonIds.length > 0 && (
        <section className="card weekly-detail">
          <h2>Ideas you worked on.</h2>
          <div className="weekly-lesson-list">
            {report.lessonIds.map((id) => (
              <span key={id}>{lessons.find((l) => l.id === id)?.title}</span>
            ))}
          </div>
        </section>
      )}
      <details className="card weekly-method">
        <summary>How to read this report</summary>
        <p>
          Weeks run Monday–Sunday in your device’s local time. This week is
          unfinished; comparisons show activity, not proof of improved playing
          strength. Puzzle difficulty and repeats can affect clean-solve rates.
          A clean solve uses no hint and has no wrong move. Lesson records
          retain the latest practice date, so these are lessons practiced, not
          necessarily new completions. Missing or undated records are excluded.
        </p>
        <p>
          Engine losses use White-perspective evaluations converted to your
          side, capped at ±10 pawns; the engine’s first choice has zero loss. A
          blunder is an estimated loss of at least 2 pawns. Short searches are
          approximate. Only retained data is available: up to 2,000 puzzle
          attempts, 24 guided sessions, 8 skill checks, 20 saved reviews, and
          150 imported games. Reports update automatically when opened; no
          emails or notifications are sent.
        </p>
      </details>
    </>
  );
}
