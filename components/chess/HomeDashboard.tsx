"use client";
import { useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Download,
  Flame,
  Link2,
  Puzzle,
  Swords,
  Trophy,
  Bell,
  Bookmark,
  Target,
} from "lucide-react";
import { type Progress, type Lesson, levels } from "../../lib/chess/content";
import { ProfileAvatar } from "./ChessComProfile";
import { weeklyReport, localDay } from "../../lib/chess/weekly";
import { gameSide } from "../../lib/chess/revenge";
import { trailLessons } from "../../lib/chess/learning-trail";
export default function HomeDashboard({
  progress,
  name,
  streak,
  nextLesson,
  installed,
  onNavigate,
  onLesson,
  onPuzzle,
  onGame,
  onProfile,
}: {
  progress: Progress;
  name?: string;
  streak: number;
  nextLesson: Lesson;
  installed: boolean;
  onNavigate: (page: string) => void;
  onLesson: (lesson: Lesson) => void;
  onPuzzle: () => void;
  onGame: (pgn: string) => void;
  onProfile: () => void;
}) {
  const now = new Date();
  const today = localDay(now);
  const week = useMemo(
    () => weeklyReport(progress, 0, new Date(), { includeGameDetails: false }),
    [progress, today],
  );
  const account = progress.accounts.chesscom || progress.accounts.lichess;
  const platform = progress.accounts.chesscom ? "chesscom" : "lichess";
  const playerName =
    account?.profile?.name?.trim()?.split(/\s+/)[0] ||
    account?.profile?.username ||
    name;
  const track = trailLessons(nextLesson.level);
  const trackDone = track.filter((l) =>
    progress.completed.includes(l.id),
  ).length;
  const lessonDone = Object.values(progress.lessonDates).includes(today);
  const puzzleDone = new Set(
    progress.puzzles
      .filter((p) => localDay(new Date(p.at)) === today)
      .map((p) => p.id),
  ).size;
  const guidedDone = (progress.guidedSessions || []).some((s) =>
    s.moves.some((m) => localDay(new Date(m.at)) === today),
  );
  const habits =
    Number(lessonDone) + Number(puzzleDone >= 3) + Number(guidedDone);
  const isReview = progress.completed.includes(nextLesson.id);
  const ratings = ["rapid", "blitz", "bullet"].map((speed) => ({
    speed,
    rating:
      platform === "chesscom"
        ? account?.stats?.["chess_" + speed]?.last?.rating
        : account?.profile?.perfs?.[speed]?.rating,
  }));
  const weekDays = new Set(progress.days);
  return (
    <div className="home-v2 home-calm home-mobile-ready">
      <div className="home-v2-welcome">
        <div>
          <span className="home-v2-kicker">CHESS INFINITY</span>
          <h1>
            {playerName
              ? `Welcome back, ${playerName}.`
              : "Your next chapter starts here."}
          </h1>
          <p>A little practice. A stronger next move.</p>
        </div>
        <div className="home-v2-date">
          <CalendarDays size={15} />
          <span>
            {now.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
      <section
        className="home-v2-practice"
        aria-labelledby="home-practice-heading"
      >
        <div className="home-v2-section-heading">
          <h2 id="home-practice-heading">What would you like to do?</h2>
          <button className="home-v2-text" onClick={() => onNavigate("arcade")}>
            Try the arcade
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="home-v2-practice-grid">
          {[
            { title: "Puzzles", text: "Train your tactics", Icon: Puzzle, page: "puzzles", color: "purple" },
            { title: "Play a bot", text: "Find your opponent", Icon: Swords, page: "play", color: "mint" },
            { title: "Review a game", text: "Learn from your moves", Icon: BookOpen, page: "review", color: "gold" },
            { title: "My training plan", text: `${progress.minutes} minutes for you`, Icon: BrainCircuit, page: "coach", color: "purple" },
          ].map((item) => (
            <button
              key={item.page}
              className={"home-v2-practice-tile " + item.color}
              onClick={() => onNavigate(item.page)}
            >
              <span className="home-v2-tile-icon">
                <item.Icon size={23} />
              </span>
              <ArrowUpRight className="home-v2-tile-arrow" size={16} />
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="home-focus-session" aria-labelledby="home-focus-title">
        <span><Target size={23}/></span>
        <div><h2 id="home-focus-title">One session. A clear next step.</h2><p>A lesson, fresh puzzles, and spaced reviews in a 5, 10, or 15-minute plan.</p></div>
        <button className="secondary" onClick={() => onNavigate("focus")}>{progress.focusSessions?.at(-1) && !progress.focusSessions.at(-1)?.finishedAt ? "Resume session" : "Try a focus session"}<ArrowRight size={16}/></button>
      </section>
      <div className="home-v2-top-grid">
        <section
          className="home-v2-continue"
          aria-labelledby="home-next-lesson"
        >
          <div className="home-v2-course-label">
            <span>
              <BookOpen size={19} />
            </span>
            <strong>
              {isReview ? "KEEP AN IDEA SHARP" : "CONTINUE YOUR TRAIL"}
            </strong>
            <small>Track {nextLesson.level}</small>
          </div>
          <h2 id="home-next-lesson">{nextLesson.title}</h2>
          <p>
            {nextLesson.theme}
            <i /> {nextLesson.minutes} min · interactive lesson
          </p>
          <div className="home-v2-course-progress">
            <div>
              <span>{levels[nextLesson.level - 1]}</span>
              <strong>
                {trackDone}
                <span> / {track.length}</span>
              </strong>
            </div>
            <div
              role="progressbar"
              aria-label="Current learning track completion"
              aria-valuemin={0}
              aria-valuemax={track.length}
              aria-valuenow={trackDone}
            >
              <i style={{ width: `${(trackDone / track.length) * 100}%` }} />
            </div>
          </div>
          <div className="home-v2-lesson-actions">
            <button
              className="home-v2-primary"
              onClick={() => onLesson(nextLesson)}
            >
              {isReview ? "Review lesson" : "Continue lesson"}
              <ArrowRight size={18} />
            </button>
            <button
              className="home-v2-text"
              onClick={() => onNavigate("learn")}
            >
              View trail
              <ChevronRight size={15} />
            </button>
          </div>
        </section>
        <details className="home-v2-today">
          <summary><span>Today’s practice</span><strong>{habits} / 3 complete</strong><ChevronRight size={17} /></summary>
          <div className="home-v2-section-heading">
            <div>
              <span className="home-v2-kicker">A SMALL COMMITMENT</span>
              <h2 id="home-today-heading">Today’s focus</h2>
            </div>
            <span
              className={"home-v2-habits " + (habits === 3 ? "all-done" : "")}
              aria-label={`${habits} of 3 daily habits complete`}
            >
              {habits === 3 ? <Check size={16} /> : habits}
              <small>/ 3</small>
            </span>
          </div>
          <div className="home-v2-daily-list">
            {[
              {
                label: "Learn one useful idea",
                detail: lessonDone
                  ? "Done today · keep exploring"
                  : `${nextLesson.minutes} focused minutes`,
                done: lessonDone,
                Icon: BookOpen,
                action: () => onLesson(nextLesson),
              },
              {
                label: "Practice three positions",
                detail: `${Math.min(puzzleDone, 3)} of 3 different puzzles practiced`,
                done: puzzleDone >= 3,
                Icon: Puzzle,
                action: onPuzzle,
              },
              {
                label: "Make a thoughtful move",
                detail: guidedDone
                  ? "Guided feedback received today"
                  : "Play with your guided coach",
                done: guidedDone,
                Icon: BrainCircuit,
                action: () => onNavigate("guided"),
              },
            ].map((item) => (
              <button key={item.label} onClick={item.action}>
                <span
                  className={"home-v2-task-icon " + (item.done ? "done" : "")}
                >
                  {item.done ? <Check size={17} /> : <item.Icon size={17} />}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <button
            className="home-v2-plan-link"
            onClick={() => onNavigate("coach")}
          >
            {habits === 3
              ? "A good day’s work. See your plan."
              : `Make time for your ${progress.minutes}-minute plan`}
            <ArrowUpRight size={14} />
          </button>
        </details>
      </div>
      <div className="home-v2-lower-grid">
        <details className="home-v2-week home-summary-card">
          <summary><span className="home-summary-icon"><Trophy size={19} /></span><span><strong>Your weekly progress</strong><small>{week.lessonIds.length} lessons · {week.attempts} puzzle attempts</small></span><ChevronRight size={18} /></summary>
          <div className="home-v2-section-heading">
            <div>

              <h2 id="home-week-heading">Your week at a glance</h2>
            </div>
            <span className="home-v2-streak">
              <Flame size={16} />
              {streak} <small>{streak === 1 ? "day" : "days"}</small>
            </span>
          </div>
          <div
            className="home-v2-week-days"
            aria-label="Training activity this week"
          >
            {week.range.days.map((date) => {
              const active =
                date <= today &&
                (weekDays.has(date) ||
                  week.daily.some((d) => d.date === date && d.actions > 0));
              return (
                <div
                  key={date}
                  className={
                    (active ? "active " : "") + (date === today ? "today" : "")
                  }
                  aria-label={`${new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}: ${active ? "practiced" : date > today ? "upcoming" : "no recorded practice"}`}
                >
                  <small>
                    {new Date(date + "T12:00:00")
                      .toLocaleDateString(undefined, { weekday: "short" })
                      .slice(0, 1)}
                  </small>
                  <span>
                    {active ? (
                      <Check size={16} />
                    ) : date === today ? (
                      <span className="home-v2-today-dot" />
                    ) : (
                      <i />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="home-v2-week-numbers">
            <div>
              <strong>{week.lessonIds.length}</strong>
              <span>lessons practiced</span>
            </div>
            <div>
              <strong>{week.attempts}</strong>
              <span>puzzle attempts</span>
            </div>
            <div>
              <strong>
                {week.cleanRate === null ? "—" : week.cleanRate + "%"}
              </strong>
              <span>clean solves</span>
            </div>
          </div>
          <button
            className="home-v2-report-link"
            onClick={() => onNavigate("weekly")}
          >
            <span>
              <Trophy size={17} />
              Open weekly improvement report
            </span>
            <ArrowRight size={16} />
          </button>
        </details>
        <details className="home-v2-accounts home-summary-card">
          <summary>
            {platform === "chesscom" && account ? <ProfileAvatar profile={account.profile} size="small" /> : <span className="home-summary-icon"><Link2 size={19} /></span>}
            <span><strong>{account?.profile?.name || account?.profile?.username || "Connect your chess"}</strong><small>{account ? `${platform === "chesscom" ? "Chess.com" : "Lichess"} · profile & ratings` : "Chess.com or Lichess"}</small></span><ChevronRight size={18} />
          </summary>
          <div className="home-v2-section-heading">
            <h2 id="home-account-heading">Your chess, connected.</h2>
            <Link2 size={18} />
          </div>
          {account ? (
            <>
              <button
                className="home-v2-account-profile"
                onClick={
                  platform === "chesscom"
                    ? onProfile
                    : () => onNavigate("connections")
                }
              >
                {platform === "chesscom" ? (
                  <ProfileAvatar profile={account.profile} />
                ) : (
                  <span className="home-v2-provider-icon">♞</span>
                )}
                <span>
                  <strong>
                    {account.profile.name || account.profile.username}
                  </strong>
                  <small>
                    {platform === "chesscom"
                      ? "Chess.com · public profile"
                      : "Lichess · authorized account"}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
              <div className="home-v2-ratings">
                {ratings.map((r) => (
                  <div key={r.speed}>
                    <strong>{r.rating ?? "—"}</strong>
                    <span>{r.speed}</span>
                  </div>
                ))}
              </div>
              <p>Official ratings returned by your connected platform.</p>
              <button
                className="home-v2-text"
                onClick={() => onNavigate("connections")}
              >
                Sync & manage accounts
                <ArrowUpRight size={15} />
              </button>
            </>
          ) : (
            <>
              <span className="home-v2-connect-art" aria-hidden="true">
                <Swords size={28} />
                <Link2 size={19} />
              </span>
              <h3>Let your games guide your practice.</h3>
              <p>
                Bring in completed Chess.com or Lichess games to discover ideas
                worth working on.
              </p>
              <button
                className="home-v2-secondary"
                onClick={() => onNavigate("connections")}
              >
                Connect a chess profile
                <ArrowRight size={16} />
              </button>
              <small className="home-v2-no-password">
                No chess passwords required.
              </small>
            </>
          )}
        </details>
      </div>
      <details className="home-v2-games home-summary-card">
        <summary><span className="home-summary-icon"><Swords size={19} /></span><span><strong>Your game library</strong><small>{progress.games.length.toLocaleString()} saved games · replay & review</small></span><ChevronRight size={18} /></summary>
        <div className="home-v2-section-heading">
          <h2 id="home-games-heading">Return to a game</h2>
          <button className="home-v2-text" onClick={() => onNavigate("review")}>
            Game library
            <ArrowRight size={15} />
          </button>
        </div>
        {progress.games.length ? (
          <div className="home-v2-game-list">
            {progress.games.slice(0, 3).map((game) => {
              const side = gameSide(game, progress.accounts);
              const opponent =
                side === "w" ? game.black : side === "b" ? game.white : null;
              const outcome =
                game.result === "1/2-1/2"
                  ? "draw"
                  : side && ["1-0", "0-1"].includes(game.result)
                    ? game.result === (side === "w" ? "1-0" : "0-1")
                      ? "win"
                      : "loss"
                    : null;
              return (
                <button key={game.id} onClick={() => onGame(game.pgn)}>
                  <span className="home-v2-game-piece">
                    <Swords size={19} />
                  </span>
                  <span className="home-v2-game-copy">
                    <strong>
                      {opponent
                        ? `vs. ${opponent}`
                        : `${game.white} vs. ${game.black}`}
                    </strong>
                    <small>
                      {game.source}
                      {game.timeClass && game.timeClass !== "unknown"
                        ? ` · ${game.timeClass}`
                        : ""}{" "}
                      ·{" "}
                      {new Date(game.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </span>
                  <span className={"home-v2-game-result " + (outcome || "")}>
                    {outcome
                      ? outcome[0].toUpperCase() + outcome.slice(1)
                      : game.result === "*"
                        ? "Practice"
                        : game.result}
                  </span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="home-v2-games-empty">
            <span>
              <Swords size={23} />
            </span>
            <div>
              <strong>Every game has something to teach you.</strong>
              <p>Import a completed game and explore it with Stockfish.</p>
            </div>
            <button
              className="home-v2-text"
              onClick={() => onNavigate("review")}
            >
              Import PGN
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}
      </details>
      <details className="home-summary-card home-fresh-practice"><summary><span className="home-summary-icon"><BookOpen size={19}/></span><span><strong>Fresh ideas for your next session</strong><small>24 new lessons · 96 original checkmate drills</small></span><ChevronRight size={18}/></summary><div><button className="secondary" onClick={() => onNavigate("learn")}>Explore lessons <ArrowRight size={15}/></button><button className="secondary" onClick={() => onNavigate("new-drills")}>Try new puzzles <ArrowRight size={15}/></button></div></details>
      <div className="home-quick-links"><button onClick={() => onNavigate("saved")}><Bookmark size={17}/>Saved practice · {(progress.savedExercises || []).length}<ChevronRight size={16}/></button><button onClick={() => onNavigate("reminders")}><Bell size={17}/>Practice reminders<ChevronRight size={16}/></button>
        <button onClick={() => onNavigate("weekly")}><Trophy size={17} />Weekly report<ChevronRight size={16} /></button>
        <button onClick={() => onNavigate("guided")}><BrainCircuit size={17} />Guided game<ChevronRight size={16} /></button>
      </div>
      <div className="home-v2-utility">
        <span>
          <CircleCheck size={15} />
          Your progress, at your pace.
        </span>
        <button onClick={() => onNavigate("install")}>
          <Download size={15} />
          {installed ? "Offline practice" : "Install & offline"}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
