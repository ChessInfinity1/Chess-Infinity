import { orderPuzzleLibrary } from "../lib/chess/learning";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Puzzle,
  Gamepad2,
  ArrowUpRight,
  WifiOff,
  Download,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import ScreenMode, { useThemeChrome } from "../components/chess/ScreenMode";
import { filterPuzzles, puzzleTags } from "../lib/chess/puzzle-library";
import TrainingArcade from "../components/chess/TrainingArcade";
import Training from "../components/chess/Training";
import {
  lessons,
  puzzles,
  type Exercise,
  type Lesson,
} from "../lib/chess/content";
import { saveArcadeResult, type ArcadeResult } from "../lib/chess/arcade";
import {
  OFFLINE_PROGRESS_KEY,
  parseOfflinePractice,
  emptyOfflinePractice,
  type OfflinePractice,
} from "../lib/chess/offline-progress";
function OfflineAcademy() {
  const [page, setPage] = useState("arcade");
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState("All patterns");
  const [range, setRange] = useState("all");
  const [puzzlePage, setPuzzlePage] = useState(1);
  const [theme, setTheme] = useState("light");
  useThemeChrome(theme);
  useEffect(() => {
    setTheme(
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );
  }, []);
  useEffect(() => setPuzzlePage(1), [query, pattern, range]);
  const [progress, setProgress] =
    useState<OfflinePractice>(emptyOfflinePractice);
  const filtered = orderPuzzleLibrary(
    filterPuzzles(puzzles, query, pattern, range),
    progress.puzzles,
  );
  const [active, setActive] = useState<{
    exercise: Exercise;
    lesson?: Lesson;
  } | null>(null);
  const [status, setStatus] = useState("Offline records stay on this device.");
  useEffect(() => {
    try {
      setProgress(
        parseOfflinePractice(
          JSON.parse(localStorage.getItem(OFFLINE_PROGRESS_KEY) || "null"),
        ),
      );
    } catch {
      setStatus(
        "A previous offline backup could not be read. New practice can still be saved.",
      );
    }
  }, []);
  function save(fn: (p: OfflinePractice) => OfflinePractice) {
    setProgress((p) => {
      const next = fn(p);
      try {
        localStorage.setItem(OFFLINE_PROGRESS_KEY, JSON.stringify(next));
        setStatus(
          "Saved on this device. Import from Install & offline when you reconnect.",
        );
      } catch {
        setStatus(
          "Device storage is full. Keep this page open and export your records.",
        );
      }
      return next;
    });
  }
  function practice(exercise: Exercise, lesson?: Lesson) {
    setActive({ exercise, lesson });
    window.scrollTo({ top: 0 });
  }
  function exportData() {
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = "chess-infinity-offline-practice.json";
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <div className="offline-academy">
      <header className="offline-app-header">
        <a className="offline-brand" href="/">
          <img src="/favicon.svg" alt="Chess Infinity" />
          <strong>
            chess infinity<small>OFFLINE PRACTICE</small>
          </strong>
        </a>
        <ScreenMode />
        <a className="secondary" href="/">
          Online academy <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
        <div className="offline-status">
          <WifiOff size={15} />
          <span>{status}</span>
        </div>
        <nav
          className="offline-app-nav"
          aria-label="Offline practice navigation"
        >
          {[
            { id: "arcade", name: "Arcade", icon: Gamepad2 },
            { id: "learn", name: "Lessons", icon: BookOpen },
            { id: "puzzles", name: "Puzzles", icon: Puzzle },
          ].map((n) => (
            <button
              key={n.id}
              className={page === n.id && !active ? "active" : ""}
              onClick={() => {
                setPage(n.id);
                setActive(null);
              }}
            >
              <n.icon size={17} />
              {n.name}
            </button>
          ))}
        </nav>
        {active ? (
          <Training
            key={active.exercise.id}
            {...active}
            boardTheme="violet"
            onClose={() => setActive(null)}
            onComplete={(correct) =>
              save((p) =>
                active.lesson
                  ? {
                      ...p,
                      lessonDates: {
                        ...p.lessonDates,
                        [active.exercise.id]: new Date().toLocaleDateString(
                          "en-CA",
                        ),
                      },
                      completed: [
                        ...new Set([...p.completed, active.exercise.id]),
                      ],
                    }
                  : {
                      ...p,
                      puzzles: [
                        ...p.puzzles,
                        {
                          id: active.exercise.id.replace(
                            /^(p\d+)-[01]{2}$/,
                            "$1",
                          ),
                          correct,
                          at: new Date().toISOString(),
                        },
                      ].slice(-2000),
                    },
              )
            }
          />
        ) : page === "arcade" ? (
          <TrainingArcade
            progress={progress.arcade}
            onPractice={(e) => practice(e)}
            onFinish={(r) =>
              save((p) => ({ ...p, arcade: saveArcadeResult(p.arcade, r) }))
            }
          />
        ) : (
          <>
            <div className="section-heading">
              <div>
                <span className="eyebrow">LEARN FROM ANYWHERE</span>
                <h1>
                  {page === "learn"
                    ? "One idea. One good move."
                    : "Keep your tactical eye sharp."}
                </h1>
                <p>
                  {page === "learn"
                    ? `${lessons.length} interactive lessons. Complete them offline, then import your progress.`
                    : `${puzzles.length.toLocaleString()} validated puzzles. Filter by difficulty and pattern, then practice offline.`}
                </p>
              </div>
            </div>
            {page === "puzzles" && (
              <div className="filter-bar">
                <div className="search-field">
                  <input
                    aria-label="Search offline puzzles"
                    placeholder="Search tactical ideas…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Offline puzzle pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                >
                  {[
                    "All patterns",
                    ...new Set(puzzles.flatMap(puzzleTags)),
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  aria-label="Offline puzzle difficulty"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="all">All difficulties</option>
                  <option value="beginner">Under 1000</option>
                  <option value="improving">1000–1399</option>
                  <option value="club">1400–1799</option>
                  <option value="advanced">1800+</option>
                </select>
                <span>{filtered.length} positions</span>
              </div>
            )}
            <div className="offline-training-grid">
              {(page === "learn"
                ? lessons
                : filtered.slice((puzzlePage - 1) * 12, puzzlePage * 12)
              ).map((e) => (
                <button
                  className="card"
                  key={e.id}
                  onClick={() =>
                    practice(e, page === "learn" ? (e as Lesson) : undefined)
                  }
                >
                  <span className="pill lavender">{e.theme}</span>
                  <h3>{e.title}</h3>
                  <p>{"intro" in e ? (e as Lesson).intro : e.hint}</p>
                  <strong>
                    {progress.completed.includes(e.id)
                      ? "Practice again"
                      : "Start practice"}
                    {progress.completed.includes(e.id) ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </strong>
                </button>
              ))}
            </div>
            {page === "puzzles" && filtered.length > 12 && (
              <nav
                className="puzzle-pagination"
                aria-label="Offline puzzle pages"
              >
                <button
                  className="secondary"
                  disabled={puzzlePage === 1}
                  onClick={() => setPuzzlePage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {puzzlePage} of {Math.ceil(filtered.length / 12)}
                </span>
                <button
                  className="secondary"
                  disabled={puzzlePage >= Math.ceil(filtered.length / 12)}
                  onClick={() => setPuzzlePage((p) => p + 1)}
                >
                  Next 12
                </button>
              </nav>
            )}
            {page === "puzzles" && !filtered.length && (
              <p className="empty-puzzles">No positions match your filters.</p>
            )}
          </>
        )}
        <footer className="offline-app-footer">
          <p>
            Offline scores are local training records, not official chess
            ratings. Syncing, online game imports, and full engine review are
            available in the online academy.
          </p>
          <button className="text-btn" onClick={exportData}>
            <Download size={14} />
            Export offline records
          </button>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("offline-root")!).render(<OfflineAcademy />);
