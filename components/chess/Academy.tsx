"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";
import {
  normalizeChessComUsername,
  chessComUsernameHelp,
} from "../../lib/chess/chesscom-input";
import {
  Infinity as InfinityIcon,
  LayoutDashboard,
  BookOpen,
  Puzzle,
  Swords,
  ChartNoAxesCombined,
  Network,
  Link2,
  Settings,
  ArrowRight,
  ChevronRight,
  Flame,
  Zap,
  Target,
  Check,
  CheckCheck,
  Clock,
  Search,
  X,
  ArrowUpRight,
  CalendarDays,
  Trophy,
  GraduationCap,
  Shield,
  Download,
  RefreshCw,
  LogOut,
  BrainCircuit,
  CheckCircle2,
  Plus,
  BookMarked,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import {
  initialProgress,
  Progress,
  lessons,
  levels,
  puzzles,
  openings,
  Opening,
  Exercise,
  Lesson,
} from "../../lib/chess/content";
import Board, { Piece } from "./Board";
import Training from "./Training";
import Workspace from "./Workspace";
import ChessComProfile, { ProfileAvatar } from "./ChessComProfile";
import AcademySidebar from "./AcademySidebar";
import SkillAssessment from "./SkillAssessment";
import GuidedPractice from "./GuidedPractice";
import WeeklyReport from "./WeeklyReport";
import LearningTrail from "./LearningTrail";
import HomeDashboard from "./HomeDashboard";
import PracticeReminders from "./PracticeReminders";
import ReminderNudge from "./ReminderNudge";
import SavedPractice from "./SavedPractice";
import FocusSession from "./FocusSession";
import { appendFocusSession, createFocusSession, completeFocusStep } from "../../lib/chess/focus";
import MobileDock from "./MobileDock";
import { mergeGuidedSession } from "../../lib/chess/guided";
import {
  normalizeImportedGame,
  mergeImportedGames,
  type ImportedGame,
} from "../../lib/chess/imported-games";
import TrainingArcade from "./TrainingArcade";
import InstallCenter, { useAppInstall } from "./InstallCenter";
import {
  saveArcadeResult,
  arcadeXp,
  type ArcadeResult,
} from "../../lib/chess/arcade";
import {
  OFFLINE_PROGRESS_KEY,
  parseOfflinePractice,
  mergeOfflinePractice,
} from "../../lib/chess/offline-progress";
import { useThemeChrome } from "./ScreenMode";
import AcademyHeader from "./AcademyHeader";
import { applyChessComPage, chessComGames, parseChessComPage, syncChessComArchives } from "../../lib/chess/archive-sync";
import MistakeRevenge from "./MistakeRevenge";
import { filterPuzzles, puzzleTags } from "../../lib/chess/puzzle-library";
import {
  emptyRevenge,
  mergeRevenge,
  recordRevenge,
  positionsFromReport,
  gameSide,
  type RevengePosition,
} from "../../lib/chess/revenge";
import WelcomeGuide, { type WelcomeChoices } from "./WelcomeGuide";
import {
  practiceRecommendation,
  skillBreakdown,
  startingLesson,
  nextLearningLesson,
  shouldStartWelcome,
  orderPuzzleLibrary,
} from "../../lib/chess/learning";
import { parseProgressBackup } from "../../lib/progress-backup";
import { useAcademyMotion, useAnimatedPresence } from "../../hooks/use-academy-motion";
import GoogleAccountSettings from "./GoogleSignIn";
const PUZZLES_PER_PAGE = 12;
const today = () => new Date().toLocaleDateString("en-CA");
function getStreak(days: string[]) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(d.toLocaleDateString("en-CA"))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toLocaleDateString("en-CA"))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const titleMap: Record<string, string> = {
  dashboard: "Your academy",
  reminders: "Practice reminders",
  saved: "Saved practice",
  focus: "Focus session",
  learn: "Learning path",
  puzzles: "Tactics lab",
  openings: "Opening library",
  play: "Practice arena",
  review: "Game review",
  connections: "Connected accounts",
  settings: "Your preferences",
  arcade: "Training arcade",
  revenge: "Mistake Revenge",
  assessment: "Your starting point",
  guided: "Guided practice",
  weekly: "Weekly improvement",
  install: "Install & offline",
  coach: "Your training plan",
};
function jsonDownload(data: any, name: string) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}
export default function Academy({
  user,
}: {
  user: { id: string; name: string; isOwner?: boolean } | null;
}) {
  const [page, setPage] = useState("dashboard");
  const install = useAppInstall();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [ready, setReady] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const welcomeChecked = useRef(false);
  const welcomeKey = "chess-infinity-welcome-" + (user?.id || "guest");
  const [cloudReady, setCloudReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading progress");
  const [notice, setNotice] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const scrim = useAnimatedPresence(sidebar);
  const sidebarRef = useRef<HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [active, setActive] = useState<{
    exercise: Exercise;
    lesson?: Lesson;
    focusSessionId?: string;
  } | null>(null);
  const [workspace, setWorkspace] = useState<{
    mode: "play" | "review" | "opening";
    pgn?: string;
    opening?: Opening;
  } | null>(null);
  const [query, setQuery] = useState("");
  const motion = useAcademyMotion(`${ready}:${page}:${active?.exercise.id || ""}:${workspace?.mode || ""}:${workspace?.opening?.id || ""}:${workspace?.pgn || ""}`);
  const [level, setLevel] = useState(1);
  const [puzzleTheme, setPuzzleTheme] = useState("All patterns");
  const [puzzleRange, setPuzzleRange] = useState("all");
  const [puzzleScope, setPuzzleScope] = useState("all");
  const [puzzlePage, setPuzzlePage] = useState(1);
  useEffect(() => setPuzzlePage(1), [query, puzzleTheme, puzzleRange, puzzleScope]);
  const lastPuzzleAttempt = new Map(progress.puzzles.map(item => [item.id, item]));
  const savedExerciseIds = new Set(progress.savedExercises || []);
  const filteredPuzzles = orderPuzzleLibrary(
    filterPuzzles(puzzles, query, puzzleTheme, puzzleRange).filter((puzzle) => {
      const attempt = lastPuzzleAttempt.get(puzzle.id);
      return puzzleScope === "all" || (puzzleScope === "unseen" && !attempt) || (puzzleScope === "missed" && attempt && !attempt.correct) || (puzzleScope === "saved" && savedExerciseIds.has(puzzle.id)) || (puzzleScope === "new" && puzzle.id.startsWith("infinity-"));
    }),
    progress.puzzles,
    progress.puzzleRating,
  );
  const visiblePuzzlePage = Math.min(
    puzzlePage,
    Math.max(1, Math.ceil(filteredPuzzles.length / PUZZLES_PER_PAGE)),
  );
  const [username, setUsername] = useState("");
  const [syncing, setSyncing] = useState("");
  const [syncError, setSyncError] = useState("");
  const syncLock = useRef(false);
  const syncController = useRef<AbortController | null>(null);
  const [syncStatus, setSyncStatus] = useState("");
  useEffect(() => () => syncController.current?.abort(), []);
  const version = useRef(0);
  const dirty = useRef(false);
  const saveRunning = useRef(false);
  const conflict = useRef(false);
  const stateRef = useRef(progress);
  const revision = useRef(0);
  const key = "chess-infinity-v1-" + (user?.id || "guest");
  useEffect(() => {
    let alive = true;
    let local: any;
    try {
      local = JSON.parse(localStorage.getItem(key) || "null");
    } catch {}
    async function init() {
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 10000);
      try {
        if (!user) throw new Error("Guest progress is stored on this device.");
        const r = await fetch("/api/progress", { signal: controller.signal });
        if (!r.ok)
          throw new Error(
            r.status === 401 ? "Sign in for cloud saving" : "Cloud unavailable",
          );
        const b: any = await r.json();
        if (!alive) return;
        version.current = b.version;
        let p = { ...initialProgress, ...b.data };
        if (local?.pending) {
          if (local.version === b.version) {
            p = { ...initialProgress, ...local.data };
            dirty.current = true;
            setSaveStatus("Pending sync");
          } else {
            conflict.current = true;
            p = { ...initialProgress, ...local.data };
            setSaveStatus("Save conflict · see settings");
            setNotice(
              "Your cloud progress changed while this device had pending changes. Settings lets you export this device’s backup and reload cloud progress.",
            );
          }
        }
        setProgress(p);
        stateRef.current = p;
        setCloudReady(true);
      } catch (e) {
        if (!alive) return;
        if (local?.data) {
          setProgress({ ...initialProgress, ...local.data });
          stateRef.current = { ...initialProgress, ...local.data };
          version.current = local.version || 0;
          dirty.current = !!local.pending;
        }
        setSaveStatus(
          user ? "Offline · device backup" : "Guest · saved on this device",
        );
      } finally {
        clearTimeout(deadline);
        if (alive) setReady(true);
      }
    }
    void init();
    const params = new URLSearchParams(location.search);
    const requested = params.get("screen");
    if (
      requested &&
      [
        "settings",
        "connections",
        "puzzles",
        "arcade",
        "revenge",
        "play",
        "install",
        "learn",
        "assessment",
        "guided",
        "weekly",
        "reminders",
        "saved",
        "focus",
      ].includes(requested)
    ) {
      setPage(requested);
      if (requested === "play") setWorkspace({ mode: "play" });
    }
    if (params.has("connection")) {
      setPage("connections");
      if (params.get("connection") === "lichess")
        setNotice(
          "Lichess authorized. Sync your account to import completed games.",
        );
      else
        setNotice(
          "Lichess authorization was not completed. You can try again.",
        );
      history.replaceState(null, "", location.pathname);
    }
    return () => {
      alive = false;
    };
  }, []);
  useThemeChrome(progress.theme);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {});
  }, []);
  useEffect(() => {
    const drawerMedia = window.matchMedia(
      "(max-width:760px), (max-width:1100px) and (max-height:500px) and (pointer:coarse)",
    );
    if (!sidebar || !drawerMedia.matches) return;
    const onLayoutChange = () => {
      if (!drawerMedia.matches) setSidebar(false);
    };
    drawerMedia.addEventListener("change", onLayoutChange);
    const before = document.body.style.overflow;
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".mobile-close")
      ?.focus();
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSidebar(false);
      }
      if (e.key === "Tab") {
        const items = Array.from(
          sidebarRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary,[tabindex="0"]') ||
            [],
        ).filter((el) => el.getClientRects().length && !el.closest("[inert]") && getComputedStyle(el).visibility !== "hidden");
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", keys);
      drawerMedia.removeEventListener("change", onLayoutChange);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [sidebar]);
  useEffect(() => {
    const viewport = window.visualViewport;
    let largestHeight = viewport?.height || window.innerHeight;
    let viewportWidth = window.innerWidth;
    function updateKeyboard() {
      const height = viewport?.height || window.innerHeight;
      if (Math.abs(window.innerWidth - viewportWidth) > 80) {
        largestHeight = height;
        viewportWidth = window.innerWidth;
      } else largestHeight = Math.max(largestHeight, height);
      const el = document.activeElement;
      const editing =
        el instanceof HTMLElement &&
        (el.isContentEditable ||
          el.tagName === "TEXTAREA" ||
          (el instanceof HTMLInputElement &&
            ![
              "button",
              "checkbox",
              "radio",
              "range",
              "file",
              "submit",
            ].includes(el.type)));
      setKeyboardOpen(
        editing &&
          (!viewport ||
            largestHeight - height > 130 ||
            window.innerHeight - height > 130),
      );
    }
    let blurTimer: ReturnType<typeof setTimeout>;
    const blur = () => {
      blurTimer = setTimeout(updateKeyboard, 0);
    };
    document.addEventListener("focusin", updateKeyboard);
    document.addEventListener("focusout", blur);
    viewport?.addEventListener("resize", updateKeyboard);
    window.addEventListener("resize", updateKeyboard);
    return () => {
      clearTimeout(blurTimer);
      document.removeEventListener("focusin", updateKeyboard);
      document.removeEventListener("focusout", blur);
      viewport?.removeEventListener("resize", updateKeyboard);
      window.removeEventListener("resize", updateKeyboard);
    };
  }, []);
  function update(fn: (p: Progress) => Progress) {
    setProgress((p) => {
      const n = fn(p);
      stateRef.current = n;
      dirty.current = true;
      revision.current++;
      return n;
    });
  }
  async function flush() {
    if (!dirty.current || saveRunning.current || conflict.current || !user)
      return;
    saveRunning.current = true;
    setSaveStatus("Saving…");
    const rev = revision.current;
    const data = stateRef.current;
    try {
      if (!cloudReady) {
        const check = await fetch("/api/progress");
        if (!check.ok) throw new Error("Cloud unavailable");
        const remote: any = await check.json();
        if (remote.version !== version.current) {
          conflict.current = true;
          throw new Error("Save conflict");
        }
        setCloudReady(true);
      }
      const r = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, version: version.current }),
      });
      if (r.status === 409) {
        conflict.current = true;
        setSaveStatus("Save conflict · see settings");
        return;
      }
      if (!r.ok) throw new Error();
      const b: any = await r.json();
      version.current = b.version;
      if (rev === revision.current) dirty.current = false;
      localStorage.setItem(
        key,
        JSON.stringify({
          data: stateRef.current,
          version: version.current,
          pending: dirty.current,
        }),
      );
      setSaveStatus(dirty.current ? "Pending sync" : "All changes saved");
    } catch {
      setSaveStatus(
        conflict.current
          ? "Save conflict · see settings"
          : "Offline · changes queued",
      );
    } finally {
      saveRunning.current = false;
    }
  }
  useEffect(() => {
    if (!ready) return;
    if (conflict.current) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data: progress,
          version: version.current,
          pending: dirty.current,
        }),
      );
    } catch {
      setSaveStatus("Device storage full · cloud sync needed");
    }
    const t = setTimeout(() => void flush(), 700);
    return () => clearTimeout(t);
  }, [progress, ready]);
  useEffect(() => {
    if (!ready) return;
    const leaving = () => {
      if (conflict.current) return;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            data: stateRef.current,
            version: version.current,
            pending: dirty.current,
          }),
        );
      } catch {}
    };
    window.addEventListener("pagehide", leaving);
    const t = setInterval(() => void flush(), 15000);
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", online);
      window.removeEventListener("pagehide", leaving);
    };
  }, [ready, cloudReady]);
  useEffect(() => {
    if (!ready || welcomeChecked.current) return;
    welcomeChecked.current = true;
    const p = stateRef.current;
    let draft = false;
    try {
      draft = !!sessionStorage.getItem(welcomeKey);
    } catch {}
    const force = new URLSearchParams(location.search).has("onboarding");
    if (shouldStartWelcome(p, draft, force)) setWelcomeOpen(true);
  }, [ready]);
  function finishWelcome(
    choices: WelcomeChoices,
    skip = false,
    skillCheck = false,
  ) {
    update((p) => ({
      ...p,
      goal: choices.goal,
      minutes: choices.minutes,
      onboarding: {
        version: 1,
        completed: true,
        experience: choices.experience,
        finishedAt: new Date().toISOString(),
        skipped: skip,
      },
    }));
    setWelcomeOpen(false);
    const url = new URL(location.href);
    if (url.searchParams.has("onboarding")) {
      url.searchParams.delete("onboarding");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    if (skillCheck) {
      go("assessment");
      return;
    }
    if (!skip) {
      const lesson = startingLesson(choices.experience);
      train(lesson, lesson);
    }
  }
  function go(p: string) {
    motion.changeView(() => {
      setPage(p);
      setActive(null);
      setWorkspace(null);
      setQuery("");
      setSidebar(false);
      setNotice("");
      if (p === "learn") setLevel(nextLearningLesson(stateRef.current).level);
      if (p === "play") setWorkspace({ mode: "play" });
      if (p === "review" && progress.games.length === 0)
        setWorkspace({ mode: "review" });
      window.scrollTo({ top: 0 });
    });
  }
  function toggleBookmark(id: string) {
    update(p => ({...p,savedExercises:(p.savedExercises || []).includes(id) ? p.savedExercises!.filter(value => value !== id) : [...(p.savedExercises || []),id]}));
  }
  function train(exercise: Exercise, lesson?: Lesson) {
    motion.changeView(() => {
      setActive({ exercise, lesson });
      setWorkspace(null);
      window.scrollTo({ top: 0 });
    });
  }
  function award(id: string, isLesson: boolean, correct: boolean, understanding?: { correctFirstTry: boolean }, focusSessionId?: string) {
    update((p) => {
      const isNew = isLesson
        ? !p.completed.includes(id)
        : !p.puzzles.some(
            (x) =>
              x.id === id &&
              x.at.slice(0, 10) === new Date().toISOString().slice(0, 10),
          );
      const days = [...new Set([...p.days, today()])];
      return {
        ...p,
        focusSessions: focusSessionId ? completeFocusStep(p.focusSessions, focusSessionId, id, isLesson ? "lesson" : "puzzle", correct) : p.focusSessions,
        explanations: understanding ? [...(p.explanations || []).filter(item => !(item.id === id && item.at.slice(0,10) === new Date().toISOString().slice(0,10))), {id,correctFirstTry:understanding.correctFirstTry,at:new Date().toISOString()}].slice(-500) : (p.explanations || []),
        days,
        lessonDates: isLesson
          ? { ...p.lessonDates, [id]: today() }
          : p.lessonDates,
        puzzleRating: isLesson
          ? p.puzzleRating
          : Math.max(
              100,
              Math.round(
                p.puzzleRating +
                  32 *
                    ((correct ? 1 : 0) -
                      1 /
                        (1 +
                          Math.pow(
                            10,
                            ((puzzles.find((x) => x.id === id)?.rating || 600) -
                              p.puzzleRating) /
                              400,
                          ))),
              ),
            ),
        xp: p.xp + (isNew ? (isLesson ? 50 : 20) : 0),
        completed: isLesson ? [...new Set([...p.completed, id])] : p.completed,
        puzzles: !isLesson
          ? [...p.puzzles, { id, correct, at: new Date().toISOString() }].slice(
              -2000,
            )
          : p.puzzles,
        reviews: {
          ...p.reviews,
          [id]: {
            due: new Date(
              Date.now() +
                (correct ? Math.min((p.reviews[id]?.interval || 1) * 2, 30) : 1) * 86400000,
            ).toISOString(),
            interval: correct
              ? Math.min((p.reviews[id]?.interval || 1) * 2, 30)
              : 1,
          },
        },
      };
    });
  }
  function saveGame(pgn: string, source = "PGN import") {
    try {
      const g = new Chess();
      g.loadPgn(pgn);
      const headers = g.getHeaders();
      const item = {
        id: "local-" + hash(pgn),
        pgn,
        white: headers.White || "White",
        black: headers.Black || "Black",
        result: headers.Result || "*",
        source,
        date: new Date().toISOString(),
      };
      update((p) => ({
        ...p,
        games: mergeImportedGames(p.games, [item]),
      }));
      setNotice("Game saved to your review library.");
    } catch {
      setNotice("This game could not be saved because its moves are invalid.");
    }
  }
  async function sync(platform: string, requestedName?: string, all = false) {
    if (syncLock.current) return;
    if (platform !== "chesscom" && !user) {
      setSyncError(
        "Sign in to your academy account before authorizing Lichess.",
      );
      return;
    }
    const chesscomName =
      platform === "chesscom"
        ? normalizeChessComUsername(
            requestedName ||
              username.trim() ||
              progress.accounts.chesscom?.profile?.username ||
              "",
          )
        : null;
    if (platform === "chesscom" && !chesscomName) {
      setSyncError(chessComUsernameHelp);
      return;
    }
    syncLock.current = true;
    setSyncing(platform);
    setSyncError("");
    setSyncStatus("Connecting to your public profile…");
    const controller = new AbortController();
    syncController.current = controller;
    try {
      if (platform === "chesscom") {
        const counts = await syncChessComArchives({
          existing: stateRef.current.games as ImportedGame[],
          all,
          signal: controller.signal,
          loadPage: async (cursor) => {
            const response = await fetch("/api/chesscom?username=" + encodeURIComponent(chesscomName!) + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""), {
              cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]),
            });
            const body: any = await response.json();
            if (!response.ok) throw new Error(body.error || "Sync failed. Please retry.");
            return parseChessComPage(body);
          },
          onPage: (page, count) => {
            const next = applyChessComPage(stateRef.current, page, all);
            if (new TextEncoder().encode(JSON.stringify(next)).byteLength > 1800000)
              throw new Error("This collection exceeds the current save capacity. Games from completed pages are kept. Export your data in Preferences before importing more.");
            update(() => next);
            stateRef.current = next;
            setUsername(page.profile.username);
            setSyncStatus(`${count.total.toLocaleString()} games imported · ${count.added.toLocaleString()} new · ${count.pages} ${count.pages === 1 ? "page" : "pages"} checked`);
            if (!welcomeOpen && count.pages === 1) setProfileOpen(true);
          },
        });
        const message = `${counts.added.toLocaleString()} new ${counts.added === 1 ? "game" : "games"} · ${counts.total.toLocaleString()} imported in total. ${all ? "Available history checked." : "Latest games checked."}${counts.added === 0 ? " No new published games found." : ""}${counts.rejected ? ` ${counts.rejected} invalid or unfinished games skipped.` : ""}`;
        setSyncStatus(message);
        setNotice(message);
        return;
      }
      const response = await fetch(
        "/api/lichess",
        { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]) },
      );
      let b: any;
      try {
        b = await response.json();
      } catch {
        throw new Error(
          "The connection returned an unreadable response. Reload Chess Infinity and try again.",
        );
      }
      if (!response.ok)
        throw new Error(b.error || "Sync failed. Try again later.");
      if (!b.profile?.username || !Array.isArray(b.games))
        throw new Error(
          "The connection did not return a valid profile and game archive. Please retry.",
        );
      let rejected = 0;
      const games: any[] = [];
      for (const item of b.games) {
        const game = normalizeImportedGame(
          item,
          platform as "chesscom" | "lichess",
        );
        if (game) games.push(game);
        else rejected++;
      }
      update((p) => ({
        ...p,
        accounts: {
          ...p.accounts,
          [platform]: {
            profile: b.profile,
            stats: b.stats,
            syncedAt: b.syncedAt,
            coverage: b.coverage,
            nextCursor: b.nextCursor,
            archiveCount: b.archiveCount,
            recentGameIds: games.map((g) => g.id),
          },
        },
        games: mergeImportedGames(p.games, games),
      }));
      setNotice(
        `Imported ${games.length} available completed games. ${rejected ? rejected + " invalid or unfinished games skipped. " : ""}Duplicate games are kept once.`,
      );
    } catch (e) {
      if (controller.signal.aborted) {
        setSyncStatus("Sync paused. Imported games are kept; use Load older games to continue.");
      } else {
        setSyncError((e as Error).message);
        setSyncStatus("Sync interrupted. Games from completed pages are kept.");
      }
    } finally {
      syncController.current = null;
      syncLock.current = false;
      setSyncing("");
    }
  }
  async function loadOlderChessCom(cursor?: string) {
    const name = progress.accounts.chesscom?.profile?.username;
    if (!name) throw new Error("Link a Chess.com profile first.");
    const r = await fetch(
      "/api/chesscom?username=" +
        encodeURIComponent(name) +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      { cache: "no-store", signal: AbortSignal.timeout(90000) },
    );
    const b: any = await r.json();
    if (!r.ok) throw new Error(b.error || "Could not load older games.");
    if (!Array.isArray(b.games))
      throw new Error("The archive response could not be read.");
    const page = parseChessComPage(b);
    const next = applyChessComPage(stateRef.current, page, true);
    if (new TextEncoder().encode(JSON.stringify(next)).byteLength > 1800000)
      throw new Error("This collection exceeds the current save capacity. Export your data in Preferences before importing more games.");
    update(() => next);
    stateRef.current = next;
    return {
      games: page.games,
      nextCursor: b.nextCursor ?? null,
      archiveCount: b.archiveCount,
    };
  }
  function finishArcade(result: ArcadeResult) {
    update((p) => ({
      ...p,
      arcade: saveArcadeResult(p.arcade, result),
      xp:
        p.xp +
        arcadeXp(
          p.arcade,
          result,
          new Date(result.finishedAt).toLocaleDateString("en-CA"),
        ),
      days:
        result.solved || result.errors
          ? [
              ...new Set([
                ...p.days,
                new Date(result.finishedAt).toLocaleDateString("en-CA"),
              ]),
            ]
          : p.days,
    }));
  }
  function addRevenge(positions: RevengePosition[]) {
    update((p) => ({ ...p, revenge: mergeRevenge(p.revenge, positions) }));
  }
  function finishRevenge(id: string, clean: boolean) {
    update((p) => {
      const result = recordRevenge(p.revenge, id, clean);
      return {
        ...p,
        revenge: result.progress,
        xp: p.xp + result.xp,
        days: [...new Set([...p.days, today()])],
      };
    });
  }
  function importOffline() {
    try {
      const raw = localStorage.getItem(OFFLINE_PROGRESS_KEY);
      if (!raw) {
        setNotice("There are no offline practice records to import.");
        return;
      }
      const pack = parseOfflinePractice(JSON.parse(raw));
      const next = mergeOfflinePractice(stateRef.current, pack);
      localStorage.setItem(
        key,
        JSON.stringify({ data: next, version: version.current, pending: true }),
      );
      dirty.current = true;
      revision.current++;
      stateRef.current = next;
      setProgress(next);
      localStorage.removeItem(OFFLINE_PROGRESS_KEY);
      setNotice(
        "Offline practice imported. New records are queued for your academy save; duplicate records add no extra XP.",
      );
    } catch {
      setNotice(
        "Offline records could not be imported. Your existing records have been kept.",
      );
    }
  }
  const completed = progress.completed.length;
  const xp = progress.xp;
  const streak = getStreak(progress.days);
  const nextLesson = nextLearningLesson(progress);
  const nextPractice = practiceRecommendation(progress);
  const skills = skillBreakdown(progress);
  const correct = progress.puzzles.filter((p) => p.correct).length;
  const rate = progress.puzzles.length
    ? Math.round((correct / progress.puzzles.length) * 100)
    : 0;
  const due = Object.entries(progress.reviews)
    .filter(([, r]) => new Date(r.due) <= new Date())
    .map(([id]) => id);
  const openWorkspace = (
    mode: "play" | "review" | "opening",
    pgn?: string,
    opening?: Opening,
  ) => {
    motion.changeView(() => {
    setWorkspace({ mode, pgn, opening });
    setActive(null);
    window.scrollTo({ top: 0 });
    });
  };
  function hash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function ratings(account: any, platform: string) {
    if (platform === "chesscom")
      return ["rapid", "blitz", "bullet"].map((t) => ({
        name: t,
        rating: account.stats?.["chess_" + t]?.last?.rating,
      }));
    return ["rapid", "blitz", "bullet"].map((t) => ({
      name: t,
      rating: account.profile?.perfs?.[t]?.rating,
    }));
  }
  function gameList(limit = 100) {
    return progress.games.length ? (
      <div className="game-list">
        {progress.games.slice(0, limit).map((g) => (
          <button key={g.id} onClick={() => openWorkspace("review", g.pgn)}>
            <span className="game-icon">
              <Swords size={19} />
            </span>
            <span>
              <strong>
                {g.white} <span className="muted">vs.</span> {g.black}
              </strong>
              <small>
                {g.source} · {new Date(g.date).toLocaleDateString()}
              </small>
            </span>
            <b className="result">{g.result}</b>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    ) : (
      <div className="empty-inline">
        <span className="icon-box">
          <Swords size={24} />
        </span>
        <div>
          <strong>Your games belong here.</strong>
          <p>
            Connect an account or import a PGN to discover what to practice
            next.
          </p>
        </div>
        <button className="secondary" onClick={() => go("connections")}>
          Connect account <ArrowUpRight size={15} />
        </button>
      </div>
    );
  }
  function sectionHeading(kicker: string, title: string, text?: string) {
    return (
      <div className="section-heading">
        <div>
          <span className="eyebrow">{kicker}</span>
          <h1>{title}</h1>
          {text && <p>{text}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="app-shell" ref={motion.shell}>
      <AcademySidebar
        sidebarRef={sidebarRef}
        open={sidebar}
        page={page}
        onClose={() => setSidebar(false)}
        onNavigate={go}
        onProfile={() => {
          setSidebar(false);
          setProfileOpen(true);
        }}
        profile={progress.accounts.chesscom?.profile}
        userName={user?.name}
        xp={xp}
        completed={completed}
        lessonCount={lessons.length}
        isOwner={user?.isOwner === true}
      />
      {scrim.mounted && <div className="scrim" data-motion-open={scrim.visible} aria-hidden="true" onClick={() => setSidebar(false)} />}
      <main className="main" inert={sidebar || profileOpen}>
        <AcademyHeader
          title={titleMap[page]}
          sidebarOpen={sidebar}
          onOpenNavigation={() => setSidebar(true)}
          theme={progress.theme}
          onToggleTheme={() => update((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}
          streak={streak}
          xp={xp}
          saveStatus={saveStatus}
          onNavigate={go}
        />
        <div className="content" ref={motion.content}>
          {notice && (
            <div className="notice">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button
                className="icon-btn"
                aria-label="Dismiss notice"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {!ready ? (
            <div className="loading">
              <InfinityIcon size={45} />
              <h2>Setting up your board…</h2>
            </div>
          ) : active ? (
            <Training
              key={active.exercise.id}
              exercise={active.exercise}
              lesson={active.lesson}
              boardTheme={progress.boardTheme}
              explainMoves={progress.explainMoves !== false}
              bookmarked={(progress.savedExercises || []).includes(active.exercise.id)}
              onToggleBookmark={() => toggleBookmark(active.exercise.id)}
              onNext={
                active.focusSessionId ? () => motion.changeView(() => setActive(null)) : !active.lesson
                  ? () => train(practiceRecommendation(stateRef.current).puzzle)
                  : undefined
              }
              backLabel={active.focusSessionId ? "focus session" : undefined}
              nextLabel={active.focusSessionId ? "Continue focus session" : undefined}
              onClose={() => motion.changeView(() => setActive(null))}
              onComplete={(correct, understanding) =>
                award(active.exercise.id, !!active.lesson, correct, understanding, active.focusSessionId)
              }
            />
          ) : workspace ? (
            <Workspace
              key={
                workspace.mode +
                (workspace.pgn || "") +
                (workspace.opening?.id || "")
              }
              {...workspace}
              onGuided={() => go("guided")}
              boardTheme={progress.boardTheme}
              onClose={() => {
                motion.changeView(() => {
                setWorkspace(null);
                if (page === "play") setPage("dashboard");
                });
              }}
              onSave={(pgn) =>
                saveGame(
                  pgn,
                  workspace.mode === "play" ? "Local practice" : "PGN import",
                )
              }
              onOpeningComplete={(id) =>
                update((p) => {
                  const interval = Math.min(
                    (p.reviews[id]?.interval || 1) * 2,
                    30,
                  );
                  return {
                    ...p,
                    reviews: {
                      ...p.reviews,
                      [id]: {
                        due: new Date(
                          Date.now() + interval * 86400000,
                        ).toISOString(),
                        interval,
                      },
                    },
                  };
                })
              }
              onReport={(report) => {
                if (!progress.games.some((g) => g.pgn === report.pgn))
                  saveGame(report.pgn);
                update((p) => {
                  const parsed = new Chess();
                  parsed.loadPgn(report.pgn);
                  const h = parsed.getHeaders();
                  const game = p.games.find((g) => g.pgn === report.pgn) || {
                    id: "local-" + hash(report.pgn),
                    pgn: report.pgn,
                    white: h.White || "White",
                    black: h.Black || "Black",
                    result: h.Result || "*",
                    source: "Saved review",
                    date: report.date,
                    whiteRating: null,
                    blackRating: null,
                  };
                  const side =
                    report.playerSide === "w" || report.playerSide === "b"
                      ? report.playerSide
                      : gameSide(game, p.accounts);
                  const incoming = side
                    ? positionsFromReport(game, report, side)
                    : [];
                  return {
                    ...p,
                    revenge: mergeRevenge(p.revenge, incoming),
                    analyses: [
                      {
                        ...report,
                        rows: report.rows
                          .filter((r: any) => r.loss >= 0.5)
                          .slice(0, 60),
                        id: hash(report.pgn),
                      },
                      ...p.analyses.filter((a) => a.id !== hash(report.pgn)),
                    ].slice(0, 20),
                  };
                });
                setNotice(
                  "Review saved. Only graded mistakes from your side are used for practice.",
                );
              }}
            />
          ) : (
            <>
              {page === "assessment" && (
                <SkillAssessment
                  draft={progress.assessmentDraft || null}
                  latest={progress.assessments?.[0]}
                  boardTheme={progress.boardTheme}
                  onDraft={(draft) =>
                    update((p) => ({ ...p, assessmentDraft: draft }))
                  }
                  onFinish={(result) => {
                    update((p) => ({
                      ...p,
                      assessmentDraft: null,
                      assessments: [
                        result,
                        ...(p.assessments || []).filter(
                          (a) => a.id !== result.id,
                        ),
                      ].slice(0, 8),
                      days: [...new Set([...p.days, today()])],
                    }));
                    setNotice(
                      "Your learning snapshot is saved. Recommendations now use this snapshot.",
                    );
                  }}
                  onLesson={(id) => {
                    const l = lessons.find((l) => l.id === id);
                    if (l) train(l, l);
                  }}
                  onGuided={() => go("guided")}
                />
              )}
              {page === "guided" && (
                <GuidedPractice
                  resume={(progress.guidedSessions || []).find(
                    (s) => !s.completed && s.pgn.includes("1."),
                  )}
                  boardTheme={progress.boardTheme}
                  onSave={(session) =>
                    update((p) => ({
                      ...p,
                      guidedSessions: mergeGuidedSession(
                        p.guidedSessions || [],
                        session,
                      ),
                      days: session.moves.length
                        ? [...new Set([...p.days, today()])]
                        : p.days,
                    }))
                  }
                  onReports={() => go("weekly")}
                />
              )}
              {page === "weekly" && (
                <WeeklyReport
                  progress={progress}
                  onNavigate={go}
                  onPattern={(theme) => {
                    go("puzzles");
                    setPuzzleTheme(theme);
                  }}
                />
              )}
              {page === "reminders" && <PracticeReminders value={progress.practiceReminder} minutes={progress.minutes} signedIn={!!user} onSave={value => update(p => ({...p,practiceReminder:value}))} />}
              {page === "saved" && <SavedPractice ids={progress.savedExercises || []} onPractice={train} onRemove={toggleBookmark} onNavigate={go} />}
              {page === "focus" && <FocusSession progress={progress} signedIn={!!user} onStart={minutes => update(p => ({ ...p, focusSessions: appendFocusSession(p.focusSessions, createFocusSession(p, minutes, crypto.randomUUID())) }))} onPractice={(exercise, lesson, focusSessionId) => motion.changeView(() => { setActive({ exercise, lesson, focusSessionId }); window.scrollTo({top:0}); })} />}
              {page !== "reminders" && <ReminderNudge value={progress.practiceReminder} practicedDays={progress.days} onChange={value => update(p => ({...p,practiceReminder:value}))} onStart={() => train(nextLesson,nextLesson)} />}
              {page === "dashboard" && (
                <HomeDashboard
                  progress={progress}
                  name={user?.name}
                  streak={streak}
                  nextLesson={nextLesson}
                  installed={install.installed}
                  onNavigate={(page) => {if (page === "new-drills") {go("puzzles");setPuzzleScope("new");} else go(page);}}
                  onLesson={(l) => train(l, l)}
                  onPuzzle={() => train(nextPractice.puzzle)}
                  onGame={(pgn) => openWorkspace("review", pgn)}
                  onProfile={() => setProfileOpen(true)}
                />
              )}
              {page === "revenge" && (
                <MistakeRevenge
                  progress={progress}
                  onAdd={addRevenge}
                  onResult={finishRevenge}
                  onConnect={() => go("connections")}
                  onImport={() => openWorkspace("review")}
                  onReview={(pgn) => openWorkspace("review", pgn)}
                />
              )}
              {page === "arcade" && (
                <TrainingArcade
                  progress={progress.arcade}
                  boardTheme={progress.boardTheme}
                  onFinish={finishArcade}
                  onPractice={(e) => train(e)}
                />
              )}
              {page === "install" && (
                <InstallCenter
                  install={install}
                  onImportOffline={importOffline}
                />
              )}
              {page === "learn" && (
                <LearningTrail
                  progress={progress}
                  level={level}
                  onLevel={setLevel}
                  onLesson={(l) => train(l, l)}
                  onAssessment={() => go("assessment")}
                />
              )}
              {page === "puzzles" && (
                <>
                  {sectionHeading(
                    "TRAIN YOUR TACTICAL EYE",
                    "Find the move that matters.",
                    "Slow down, look for forcing moves, and make the pattern yours.",
                  )}
                  <div className="puzzle-hero card">
                    <div>
                      <span className="pill lavender">DAILY PRACTICE</span>
                      <h2>
                        Good instincts are built
                        <br />
                        one puzzle at a time.
                      </h2>
                      <p>
                        {puzzles.length.toLocaleString()} legally validated
                        exercises, including CC0 puzzles from Lichess. Filter by
                        pattern and strength.
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          train(nextPractice.puzzle);
                        }}
                      >
                        Start training <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="puzzle-score">
                      <Puzzle size={50} />
                      <strong>{progress.puzzleRating}</strong>
                      <span>internal puzzle rating</span>
                      <small>
                        {rate}% clean solves · {progress.puzzles.length}{" "}
                        attempts. Elo-style training estimate; independent of
                        external ratings.
                      </small>
                    </div>
                  </div>
                  <section className="smart-practice card">
                    <span className="icon-box">
                      <Target size={24} />
                    </span>
                    <div>
                      <span className="eyebrow">
                        LESS GUESSWORK. BETTER PRACTICE.
                      </span>
                      <h3>
                        {nextPractice.review
                          ? "A pattern worth revisiting."
                          : "A fresh position, chosen for you."}
                      </h3>
                      <p>
                        {nextPractice.reason}. Your next position is{" "}
                        {nextPractice.puzzle.theme.toLowerCase()}, difficulty{" "}
                        {nextPractice.puzzle.rating}.
                      </p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => train(nextPractice.puzzle)}
                    >
                      Start smart practice <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="puzzle-scope-controls" aria-label="Puzzle practice filters">{[["all","All puzzles"],["unseen","Unseen"],["missed","Missed"],["saved","Saved"],["new","New drills"]].map(([value,label]) => <button key={value} aria-pressed={puzzleScope === value} onClick={() => setPuzzleScope(value)}>{label}</button>)}<span>{(progress.explanations || []).length} explanations practiced</span></div>
                  <div className="filter-bar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        placeholder="Search tactical ideas…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Puzzle pattern"
                      value={puzzleTheme}
                      onChange={(e) => setPuzzleTheme(e.target.value)}
                    >
                      {[
                        "All patterns",
                        ...new Set(puzzles.flatMap(puzzleTags)),
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Puzzle difficulty"
                      value={puzzleRange}
                      onChange={(e) => setPuzzleRange(e.target.value)}
                    >
                      <option value="all">All difficulties</option>
                      <option value="beginner">Under 1000</option>
                      <option value="improving">1000–1399</option>
                      <option value="club">1400–1799</option>
                      <option value="advanced">1800+</option>
                    </select>
                    <span className="muted">
                      {filteredPuzzles.length.toLocaleString()} positions ·{" "}
                      {correct} clean solutions
                    </span>
                  </div>
                  <div className="puzzle-grid">
                    {filteredPuzzles
                      .slice(
                        (visiblePuzzlePage - 1) * PUZZLES_PER_PAGE,
                        visiblePuzzlePage * PUZZLES_PER_PAGE,
                      )
                      .map((p) => (
                        <button
                          className="card puzzle-card"
                          key={p.id}
                          onClick={() => train(p)}
                        >
                          <div className="puzzle-preview">
                            <Board
                              fen={p.fen}
                              onMove={() => {}}
                              disabled
                              theme={progress.boardTheme}
                            />
                          </div>
                          <div className="puzzle-card-copy">
                            <span className="eyebrow">{p.theme}</span>
                            <h3>{p.title}</h3>
                            <span className="muted">
                              Difficulty {p.rating} ·{" "}
                              {Math.ceil(p.line.length / 2)} move
                              {p.line.length > 2 ? "s" : ""}
                            </span>
                            <span className="puzzle-arrow">
                              <ArrowUpRight size={18} />
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                  {!filteredPuzzles.length && (
                    <div className="card empty-puzzles">
                      <Target size={30} />
                      <h3>No positions match these filters.</h3>
                      <p>Try another pattern, difficulty, or search.</p>
                      <button
                        className="secondary"
                        onClick={() => {
                          setQuery("");
                          setPuzzleTheme("All patterns");
                          setPuzzleRange("all");
                          setPuzzleScope("all");
                        }}
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                  {filteredPuzzles.length > PUZZLES_PER_PAGE && (
                    <nav
                      className="puzzle-pagination"
                      aria-label="Puzzle library pages"
                    >
                      <button
                        className="secondary"
                        disabled={visiblePuzzlePage === 1}
                        onClick={() => {
                          setPuzzlePage((x) => Math.max(1, x - 1));
                          window.scrollTo({ top: 0 });
                        }}
                      >
                        Previous
                      </button>
                      <span>
                        Page {visiblePuzzlePage} of{" "}
                        {Math.ceil(filteredPuzzles.length / PUZZLES_PER_PAGE)}
                      </span>
                      <button
                        className="secondary"
                        disabled={
                          visiblePuzzlePage >=
                          Math.ceil(filteredPuzzles.length / PUZZLES_PER_PAGE)
                        }
                        onClick={() => {
                          setPuzzlePage((x) => x + 1);
                          window.scrollTo({ top: 0 });
                        }}
                      >
                        Next 12 <ArrowRight size={15} />
                      </button>
                    </nav>
                  )}
                  <p className="library-credit">
                    Lichess source puzzles are CC0 public-domain data. Starting
                    positions and every solution move are validated with
                    chess.js.{" "}
                    <a
                      href="https://database.lichess.org/#puzzles"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source &amp; license ↗
                    </a>
                  </p>
                </>
              )}
              {page === "openings" && (
                <>
                  {sectionHeading(
                    "GOOD PLANS START EARLY",
                    "Find your opening identity.",
                    "Learn the moves and the ideas behind them. Save lines to your personal repertoire.",
                  )}
                  <div className="filter-bar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        placeholder="Search opening name or ECO…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <span className="pill lavender">
                      {progress.repertoire.length} saved lines
                    </span>
                  </div>
                  {due.some((id) => progress.repertoire.includes(id)) && (
                    <div className="info-banner">
                      <RefreshCw size={18} />
                      <p>
                        Some repertoire lines are ready for spaced review. Open
                        a saved line and practice it again.
                      </p>
                    </div>
                  )}
                  <div className="opening-grid">
                    {openings
                      .filter((o) =>
                        (o.name + " " + o.eco)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((o) => (
                        <section className="card opening-card" key={o.id}>
                          <div className="opening-card-head">
                            <span className="opening-symbol">
                              <Piece
                                type={o.side === "White" ? "n" : "b"}
                                color={o.side === "White" ? "w" : "b"}
                              />
                            </span>
                            <span className="pill">
                              {o.eco} · {o.side}
                            </span>
                            <button
                              className={
                                "icon-btn bookmark " +
                                (progress.repertoire.includes(o.id)
                                  ? "purple"
                                  : "")
                              }
                              aria-label={"Save " + o.name}
                              onClick={() =>
                                update((p) => ({
                                  ...p,
                                  repertoire: p.repertoire.includes(o.id)
                                    ? p.repertoire.filter((id) => id !== o.id)
                                    : [...p.repertoire, o.id],
                                  reviews: {
                                    ...p.reviews,
                                    [o.id]: {
                                      due: new Date(
                                        Date.now() + 86400000,
                                      ).toISOString(),
                                      interval: 1,
                                    },
                                  },
                                }))
                              }
                            >
                              <BookMarked size={19} />
                            </button>
                          </div>
                          <h3>{o.name}</h3>
                          <p>{o.idea}</p>
                          <div className="opening-line mono">{o.line}</div>
                          <button
                            className="text-btn"
                            onClick={() =>
                              openWorkspace("opening", undefined, o)
                            }
                          >
                            Explore & practice <ArrowRight size={16} />
                          </button>
                        </section>
                      ))}
                  </div>
                </>
              )}
              {page === "review" && (
                <>
                  {sectionHeading(
                    "TURN EXPERIENCE INTO IMPROVEMENT",
                    "Your games have something to teach.",
                    "Replay, analyze, and understand your completed games with Stockfish.",
                  )}
                  <div className="review-actions">
                    <button
                      className="primary"
                      onClick={() => openWorkspace("review")}
                    >
                      Import PGN or FEN <Plus size={17} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => go("connections")}
                    >
                      <RefreshCw size={16} />
                      Sync external games
                    </button>
                  </div>
                  <section className="card games-card">{gameList()}</section>
                </>
              )}
              {page === "connections" && (
                <>
                  {sectionHeading(
                    "BRING YOUR CHESS TOGETHER",
                    "Your games. Your real progress.",
                    "Import completed games and public ratings. No invented results and no chess passwords.",
                  )}
                  <div className="connection-grid">
                    <section className="card connection">
                      <span className="platform-icon chesscom">♟</span>
                      <span className="pill">Public profile</span>
                      <h2>Chess.com</h2>
                      <p>
                        Link a public username to retrieve ratings and up to 40
                        completed standard games from recent archives. This does
                        not authenticate ownership.
                      </p>
                      <label>
                        Chess.com username or profile link
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void sync("chesscom");
                            }
                          }}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder={
                            progress.accounts.chesscom?.profile?.username ||
                            "Username or chess.com/member/username"
                          }
                        />
                      </label>
                      <button
                        className="primary"
                        disabled={
                          !!syncing ||
                          !(
                            username.trim() ||
                            progress.accounts.chesscom?.profile?.username
                          )
                        }
                        onClick={() => void sync("chesscom")}
                      >
                        {syncing === "chesscom"
                          ? "Importing real archives…"
                          : "Link public profile & import"}
                        <ArrowRight size={16} />
                      </button>
                      {!user && (
                        <p className="fine">
                          Public Chess.com profiles work without an academy
                          sign-in. Your linked profile and imported games save
                          on this device.
                        </p>
                      )}
                      {progress.accounts.chesscom && (
                        <>
                          <button
                            className="linked-public-profile"
                            onClick={() => setProfileOpen(true)}
                          >
                            <ProfileAvatar
                              profile={progress.accounts.chesscom.profile}
                            />
                            <span>
                              <strong>
                                {progress.accounts.chesscom.profile.name ||
                                  progress.accounts.chesscom.profile.username}
                              </strong>
                              <small>Open profile, games & statistics</small>
                            </span>
                            <ArrowRight size={18} />
                          </button>
                          <div className="connected-state">
                            <CheckCircle2 size={17} />
                            Linked:{" "}
                            {progress.accounts.chesscom.profile.username}
                          </div>
                          <div className="ratings-grid">
                            {ratings(
                              progress.accounts.chesscom,
                              "chesscom",
                            ).map((r) => (
                              <div key={r.name}>
                                <strong>{r.rating || "—"}</strong>
                                <small>{r.name}</small>
                              </div>
                            ))}
                          </div>
                          <small className="muted">
                            Last sync{" "}
                            {new Date(
                              progress.accounts.chesscom.syncedAt,
                            ).toLocaleString()}
                          </small>
                          <button
                            className="text-btn"
                            onClick={() =>
                              update((p) => {
                                const accounts = { ...p.accounts };
                                delete accounts.chesscom;
                                return { ...p, accounts };
                              })
                            }
                          >
                            Unlink public profile
                          </button>
                        </>
                      )}
                    </section>
                    <section className="card connection">
                      <span className="platform-icon lichess">♞</span>
                      <span className="pill">Official OAuth2 · PKCE</span>
                      <h2>Lichess</h2>
                      <p>
                        Authorize directly on Lichess. We request no optional
                        permissions. Your access token stays in a secure
                        HttpOnly cookie and never enters browser JavaScript.
                      </p>
                      <a
                        className="secondary full"
                        href="/api/lichess/start"
                        target="_top"
                      >
                        Authorize with Lichess <ArrowUpRight size={16} />
                      </a>
                      <button
                        className="primary full"
                        disabled={!!syncing}
                        onClick={() => void sync("lichess")}
                      >
                        {syncing === "lichess"
                          ? "Importing completed games…"
                          : "Sync authorized account"}
                        <RefreshCw size={16} />
                      </button>
                      {progress.accounts.lichess && (
                        <>
                          <div className="connected-state">
                            <CheckCircle2 size={17} />
                            Synced: {progress.accounts.lichess.profile.username}
                          </div>
                          <div className="ratings-grid">
                            {ratings(progress.accounts.lichess, "lichess").map(
                              (r) => (
                                <div key={r.name}>
                                  <strong>{r.rating || "—"}</strong>
                                  <small>{r.name}</small>
                                </div>
                              ),
                            )}
                          </div>
                          <small className="muted">
                            Last sync{" "}
                            {new Date(
                              progress.accounts.lichess.syncedAt,
                            ).toLocaleString()}
                          </small>
                        </>
                      )}
                      <button
                        className="text-btn"
                        onClick={async () => {
                          setSyncError("");
                          try {
                            const r = await fetch("/api/lichess", {
                              method: "DELETE",
                            });
                            const b: any = await r.json();
                            if (!r.ok) throw new Error(b.error);
                            update((p) => {
                              const accounts = { ...p.accounts };
                              delete accounts.lichess;
                              return { ...p, accounts };
                            });
                            setNotice(
                              "Lichess access revoked. Imported games remain in your library.",
                            );
                          } catch (e) {
                            setSyncError((e as Error).message);
                          }
                        }}
                      >
                        Disconnect & revoke access
                      </button>
                    </section>
                  </div>
                  {syncError && (
                    <div className="feedback error">{syncError}</div>
                  )}
                  <div className="info-banner">
                    <Shield size={24} />
                    <p>
                      <strong>Completed games only. Training only.</strong> The
                      app never connects to a live external game or submits
                      moves. External services can delay data, impose rate
                      limits, or return errors; a sync succeeds only after real
                      data is received.
                    </p>
                  </div>
                  <div className="card platform-summary">
                    <div className="card-heading">
                      <h2>Your imported game results</h2>
                      <span className="muted">
                        {progress.games.length} games
                      </span>
                    </div>
                    {["Chess.com", "Lichess"].map((source) => {
                      const g = progress.games.filter(
                        (g) => g.source === source,
                      );
                      const name =
                        progress.accounts[
                          source === "Chess.com" ? "chesscom" : "lichess"
                        ]?.profile?.username?.toLowerCase();
                      const mine = g.filter((x) =>
                        [x.white.toLowerCase(), x.black.toLowerCase()].includes(
                          name,
                        ),
                      );
                      const wins = mine.filter(
                        (x) =>
                          x.result ===
                          (x.white.toLowerCase() === name ? "1-0" : "0-1"),
                      ).length;
                      const losses = mine.filter(
                        (x) =>
                          x.result ===
                          (x.white.toLowerCase() === name ? "0-1" : "1-0"),
                      ).length;
                      return (
                        <div className="summary-row" key={source}>
                          <strong>{source}</strong>
                          <span>{g.length} imported</span>
                          <span>{name ? wins : "—"} wins</span>
                          <span>{name ? losses : "—"} losses</span>
                          <span>
                            {name
                              ? mine.filter((x) => x.result === "1/2-1/2")
                                  .length
                              : "—"}{" "}
                            draws
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {page === "coach" && (
                <>
                  {sectionHeading(
                    "A PLAN THAT FITS YOUR LIFE",
                    "Build your daily rhythm.",
                    "Your goals set the direction. Your completed training sets the pace.",
                  )}
                  <div className="learning-quick-tools">
                    <button onClick={() => go("assessment")}>
                      <Target size={18} />
                      <span>
                        Skill check<small>Choose a focused path</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                    <button onClick={() => go("guided")}>
                      <BrainCircuit size={18} />
                      <span>
                        Guided game<small>Build a thinking routine</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                    <button onClick={() => go("weekly")}>
                      <ChartNoAxesCombined size={18} />
                      <span>
                        Weekly report<small>Compare recorded practice</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <section className="card revenge-coach-link">
                    <span className="icon-box">
                      <RefreshCw size={24} />
                    </span>
                    <div>
                      <h2>Turn your mistakes into practice.</h2>
                      <p>
                        {(progress.revenge || emptyRevenge).positions.length}{" "}
                        verified positions saved. Choose your side, find the
                        stronger move, and build a habit that sticks.
                      </p>
                    </div>
                    <button className="primary" onClick={() => go("revenge")}>
                      Mistake Revenge <ArrowRight size={16} />
                    </button>
                  </section>
                  {skills.length > 0 && (
                    <section className="card learner-insights">
                      <div className="card-heading">
                        <h2>Your recent tactical patterns</h2>
                        <span className="pill lavender">
                          Last {Math.min(progress.puzzles.length, 200)} attempts
                        </span>
                      </div>
                      <p>
                        Clean-solve rates from your recorded practice. Small
                        samples are a starting point, not a complete skill
                        assessment.
                      </p>
                      <div>
                        {skills.map((skill) => (
                          <button
                            key={skill.theme}
                            onClick={() => {
                              go("puzzles");
                              setPuzzleTheme(skill.theme);
                            }}
                          >
                            <strong>{skill.theme}</strong>
                            <span>
                              {skill.clean}/{skill.attempts} clean ·{" "}
                              {skill.rate}%
                            </span>
                            <i>
                              <b style={{ width: skill.rate + "%" }} />
                            </i>
                            <small>
                              Train this pattern <ArrowRight size={12} />
                            </small>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  <div className="coach-layout">
                    <section className="card plan-settings">
                      <span className="icon-box">
                        <Target size={25} />
                      </span>
                      <h2>What are you working toward?</h2>
                      <label>
                        Your goal
                        <select
                          value={progress.goal}
                          onChange={(e) =>
                            update((p) => ({ ...p, goal: e.target.value }))
                          }
                        >
                          {[
                            "Learn chess from scratch",
                            "Reach 500 Elo",
                            "Reach 800 Elo",
                            "Reach 1000 Elo",
                            "Reach 1200 Elo",
                            "Reach 1500 Elo",
                            "Reach 1800 Elo",
                            "Reach 2000 Elo",
                            "Prepare for tournaments",
                            "Improve blitz or bullet",
                            "Master a specific opening",
                          ].map((g) => (
                            <option key={g}>{g}</option>
                          ))}
                        </select>
                      </label>
                      <label>Time each day</label>
                      <div className="time-options">
                        {[10, 15, 30, 45, 60, 90].map((m) => (
                          <button
                            className={progress.minutes === m ? "active" : ""}
                            key={m}
                            onClick={() =>
                              update((p) => ({ ...p, minutes: m }))
                            }
                          >
                            {m}
                            <small> min</small>
                          </button>
                        ))}
                      </div>
                      <div className="feedback">
                        <strong>Your next focus</strong>
                        <p>
                          {progress.puzzles.length && rate < 70
                            ? "Tactical accuracy. Work slowly and name every threat before moving."
                            : completed < 4
                              ? "Build your foundation. Master piece activity and king safety."
                              : "Keep developing your pattern recognition, with regular game review."}
                        </p>
                        <small>
                          These are rule-based training suggestions from your
                          recorded practice. Save engine findings from Game
                          review to build a mistake practice queue and
                          recurring-theme summary. A language-model chat service
                          is not connected.
                        </small>
                      </div>
                    </section>
                    <section className="card plan-card">
                      <div className="card-heading">
                        <h2>Your {progress.minutes}-minute session</h2>
                        <span className="pill lavender">{progress.goal}</span>
                      </div>
                      {[
                        {
                          title: due.length
                            ? "Review what is due"
                            : "Recall yesterday’s ideas",
                          desc: due.length + " spaced reviews due",
                          icon: RefreshCw,
                          ratio: 0.17,
                          run: () => {
                            const p = puzzles.find((x) => due.includes(x.id));
                            const l = lessons.find((x) => due.includes(x.id));
                            if (l) train(l, l);
                            else
                              train(
                                p || nextLesson,
                                p ? undefined : nextLesson,
                              );
                          },
                        },
                        {
                          title: "Sharpen tactical patterns",
                          desc:
                            rate < 70 && progress.puzzles.length
                              ? "Focus on clean solutions over speed"
                              : "Look for checks, captures, and threats",
                          icon: Puzzle,
                          ratio: 0.33,
                          run: () =>
                            train(
                              puzzles[progress.puzzles.length % puzzles.length],
                            ),
                        },
                        {
                          title: "Learn one useful idea",
                          desc: nextLesson.title,
                          icon: BookOpen,
                          ratio: 0.17,
                          run: () => train(nextLesson, nextLesson),
                        },
                        {
                          title: "Rehearse your repertoire",
                          desc:
                            progress.repertoire.length + " saved opening lines",
                          icon: Network,
                          ratio: 0.16,
                          run: () => {
                            const o =
                              openings.find((o) =>
                                progress.repertoire.includes(o.id),
                              ) || openings[0];
                            openWorkspace("opening", undefined, o);
                          },
                        },
                        {
                          title: "Review, then reflect",
                          desc: progress.games.length
                            ? "Choose one completed game"
                            : "Play a training game or import a PGN",
                          icon: BrainCircuit,
                          ratio: 0.17,
                          run: () => go("review"),
                        },
                      ].map((task, i, all) => {
                        const allocated = all
                          .slice(0, 4)
                          .map((t) => Math.floor(progress.minutes * t.ratio));
                        const minutes =
                          i === 4
                            ? progress.minutes -
                              allocated.reduce((a, b) => a + b, 0)
                            : allocated[i];
                        return (
                          <button
                            className="plan-task"
                            key={task.title}
                            onClick={task.run}
                          >
                            <span className="plan-index">0{i + 1}</span>
                            <span className="task-check">
                              <task.icon size={19} />
                            </span>
                            <span>
                              <strong>{task.title}</strong>
                              <small>{task.desc}</small>
                            </span>
                            <b>{minutes} min</b>
                            <ArrowRight size={16} />
                          </button>
                        );
                      })}
                      <div className="daily-footer">
                        <Clock size={15} />
                        <span>
                          Regular practice is the goal. Your training XP is
                          separate from any official rating.
                        </span>
                      </div>
                    </section>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <Trophy className="purple" />
                      <div>
                        <small>Milestone</small>
                        <strong>
                          {completed >= 1 ? "First steps" : "Your first lesson"}
                        </strong>
                        <p>
                          {completed >= 1
                            ? "First lesson completed"
                            : "Complete one lesson to earn it"}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <Flame className="orange" />
                      <div>
                        <small>Consistency</small>
                        <strong>
                          {streak >= 3
                            ? "Building a habit"
                            : "Three-day streak"}
                        </strong>
                        <p>{Math.min(streak, 3)} / 3 days</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <Puzzle className="green" />
                      <div>
                        <small>Tactical work</small>
                        <strong>
                          {correct >= 10
                            ? "Pattern finder"
                            : "Ten clean puzzles"}
                        </strong>
                        <p>{Math.min(correct, 10)} / 10 clean solutions</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {page === "settings" && (
                <>
                  {sectionHeading(
                    "MAKE YOURSELF AT HOME",
                    "A board that feels like yours.",
                  )}
                  <div className="settings-grid">
                    <section className="card">
                      <h2>Training preferences</h2><label className="explain-preference"><input type="checkbox" checked={progress.explainMoves !== false} onChange={e => update(p => ({...p,explainMoves:e.target.checked}))}/><span>Explain my move after puzzles<small>Answer a board-based question before saving the result.</small></span></label><div className="settings-learning-links"><button className="secondary full" onClick={() => go("reminders")}>Practice reminders <ArrowRight size={16}/></button><button className="secondary full" onClick={() => go("saved")}>Saved practice · {(progress.savedExercises || []).length} <ArrowRight size={16}/></button></div>
                      <h2>Appearance</h2>
                      <button
                        className="secondary full replay-welcome"
                        onClick={() => {
                          setWelcomeOpen(true);
                          setSyncError("");
                        }}
                      >
                        Replay welcome walkthrough <ArrowRight size={15} />
                      </button>
                      <label>
                        Interface
                        <select
                          value={progress.theme}
                          onChange={(e) =>
                            update((p) => ({ ...p, theme: e.target.value }))
                          }
                        >
                          <option value="light">Light · Cloud</option>
                          <option value="dark">Dark · Midnight</option>
                        </select>
                      </label>
                      <label>
                        Mobile dock
                        <select
                          value={progress.dockStyle || "glass"}
                          onChange={(e) =>
                            update((p) => ({
                              ...p,
                              dockStyle:
                                e.target.value === "solid" ? "solid" : "glass",
                            }))
                          }
                        >
                          <option value="glass">Soft glass pill</option>
                          <option value="solid">Solid · higher contrast</option>
                        </select>
                      </label>
                      <label>
                        Board palette
                        <select
                          value={progress.boardTheme}
                          onChange={(e) =>
                            update((p) => ({
                              ...p,
                              boardTheme: e.target.value,
                            }))
                          }
                        >
                          <option value="violet">Infinity violet</option>
                          <option value="sage">Garden sage</option>
                          <option value="wood">Classic walnut</option>
                        </select>
                      </label>
                      <div className="settings-board">
                        <Board
                          fen={new Chess().fen()}
                          onMove={() => {}}
                          disabled
                          theme={progress.boardTheme}
                        />
                      </div>
                    </section>
                    <section className="card">
                      <h2>Your data & account</h2>
                      {user && <GoogleAccountSettings/>}
                      <div className="feedback">
                        <strong>{saveStatus}</strong>
                        <p>
                          {user
                            ? "Your cloud records belong to your signed-in Academy account. Pending changes are backed up on this device and retried automatically."
                            : "Guest progress stays on this device. Sign in for cloud progress."}
                        </p>
                      </div>
                      {!user && (
                        <a
                          className="primary full"
                          href="/login?return_to=%2F"
                          target="_top"
                        >
                          Sign in / Create account
                        </a>
                      )}
                      <label className="secondary full" style={{cursor: "pointer", margin: "12px 0"}}>
                        Import progress from the original site / JSON backup
                        <input type="file" accept=".json,application/json" aria-label="Import Academy progress backup" onChange={async event => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";
                          if (!file) return;
                          try {
                            if (saveRunning.current || conflict.current) throw new Error("Finish your pending save or resolve the cloud conflict before importing.");
                            const imported = parseProgressBackup(await file.text());
                            if (!window.confirm(`Replace progress on this account with ${imported.completed.length} completed lessons, ${imported.puzzles.length} puzzle attempts and ${imported.games.length} games? A copy of current progress will download first. Your original website stays unchanged.`)) return;
                            jsonDownload(stateRef.current, "chess-infinity-before-import.json");
                            update(() => imported);
                            setNotice(user ? "Backup imported. Cloud save is queued; wait for All changes saved before closing. Reauthorize Lichess on this new website." : "Backup imported on this device. Create an Academy account for cloud saving. Lichess must be reauthorized.");
                          } catch (e) { setNotice((e as Error).message); }
                        }} />
                      </label>
                      <button
                        className="secondary full"
                        onClick={() =>
                          jsonDownload(progress, "chess-infinity-progress.json")
                        }
                      >
                        <Download size={16} /> Export my progress & games
                      </button>
                      <button
                        className="secondary full"
                        onClick={() => {
                          try {
                            jsonDownload(
                              JSON.parse(localStorage.getItem(key) || "{}"),
                              "chess-infinity-device-backup.json",
                            );
                          } catch {
                            setNotice("No device backup is available.");
                          }
                        }}
                      >
                        Export this device’s backup
                      </button>
                      <button
                        className="secondary full"
                        onClick={async () => {
                          try {
                            const r = await fetch("/api/progress");
                            if (!r.ok) throw new Error();
                            const b: any = await r.json();
                            version.current = b.version;
                            dirty.current = false;
                            conflict.current = false;
                            const p = { ...initialProgress, ...b.data };
                            stateRef.current = p;
                            setProgress(p);
                            setCloudReady(true);
                            setSaveStatus("Cloud progress loaded");
                          } catch {
                            setNotice(
                              "Could not reach cloud progress. Your device backup remains available.",
                            );
                          }
                        }}
                      >
                        Reload cloud progress · discard pending changes
                      </button>
                      <button
                        className="secondary full"
                        onClick={() => void flush()}
                      >
                        <RefreshCw size={16} />
                        Retry pending save
                      </button>
                      <details>
                        <summary>Delete academy data</summary>
                        <p>
                          Deletion removes this account’s saved academy progress
                          and games. Export a copy first if you want to keep
                          them.
                        </p>
                        <button
                          className="danger"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "Permanently delete your Chess Infinity progress and imported games?",
                              )
                            )
                              return;
                            try {
                              const r = await fetch("/api/progress", {
                                method: "DELETE",
                              });
                              if (!r.ok && user) throw new Error();
                              const l = await fetch("/api/lichess", {
                                method: "DELETE",
                              });
                              localStorage.removeItem(key);
                              dirty.current = false;
                              conflict.current = false;
                              version.current = 0;
                              setProgress({ ...initialProgress });
                              setNotice(
                                l.ok
                                  ? "Your academy data was deleted and Lichess access revoked."
                                  : "Academy data deleted. Lichess token revocation failed; revoke access on Lichess.",
                              );
                            } catch {
                              setNotice(
                                "Deletion failed. Your data has been retained.",
                              );
                            }
                          }}
                        >
                          Permanently delete my academy data
                        </button>
                      </details>
                      {user && (
                        <a
                          className="text-btn"
                          href="/logout?return_to=%2F"
                          target="_top"
                        >
                          <LogOut size={16} /> Sign out
                        </a>
                      )}
                    </section>
                  </div>
                  <div className="info-banner">
                    <BookOpen size={21} />
                    <p>
                      <strong>Built with real chess tools.</strong> Rules:
                      chess.js (BSD-2-Clause). Engine: Stockfish 19 (GPLv3).
                      Original instructional content and piece artwork.{" "}
                      <a href="/engine/LICENSE.txt" target="_blank">
                        Engine license
                      </a>{" "}
                      ·{" "}
                      <a
                        href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Engine source
                      </a>
                      . Expansion to extensive master courses, unlimited
                      puzzles, authenticated study import, and conversational
                      coaching remains future work.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="app-footer">
            <span className="footer-brand">
              <InfinityIcon size={18} /> chess infinity
            </span>
            <span>From your first move to grandmaster.</span>
            <span>
              Made for the love of the game. <span className="purple">♟</span>
            </span>
          </footer>
        </div>
        {!sidebar && !profileOpen && (
          <MobileDock
            page={page}
            keyboardOpen={keyboardOpen}
            solid={progress.dockStyle === "solid"}
            onNavigate={go}
          />
        )}
      </main>
      {ready && welcomeOpen && (
        <WelcomeGuide
          name={user?.name}
          draftKey={welcomeKey}
          goal={progress.goal}
          minutes={progress.minutes}
          accounts={progress.accounts}
          canAuthorize={!!user}
          busy={!!syncing}
          error={syncError}
          onChessCom={async (name) => {
            setUsername(name);
            await sync("chesscom", name);
          }}
          onLichessSync={async () => {
            await sync("lichess");
          }}
          onFinish={finishWelcome}
        />
      )}
      {progress.accounts.chesscom && (
        <ChessComProfile
          key={progress.accounts.chesscom.profile.username}
          open={profileOpen}
          account={progress.accounts.chesscom}
          games={chessComGames(progress.games, progress.accounts.chesscom.profile.username) as ImportedGame[]}
          syncStatus={syncStatus}
          syncError={syncError}
          onStopSync={() => syncController.current?.abort()}
          onClose={closeProfile}
          onAnalyze={(game) => {
            setProfileOpen(false);
            setPage("review");
            openWorkspace("review", game.pgn);
            window.scrollTo({ top: 0 });
          }}
          onLoadMore={loadOlderChessCom}
          onSync={(all = false) => {
            setUsername(progress.accounts.chesscom.profile.username);
            void sync("chesscom", progress.accounts.chesscom.profile.username, all);
          }}
          syncing={syncing === "chesscom"}
        />
      )}
    </div>
  );
}
