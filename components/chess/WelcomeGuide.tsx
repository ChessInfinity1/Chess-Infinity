"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Target,
  Link2,
  CheckCircle2,
  ShieldCheck,
  LoaderCircle,
  Infinity as InfinityIcon,
  Sparkles,
  X,
} from "lucide-react";
import Board from "./Board";
export type WelcomeChoices = {
  experience: string;
  goal: string;
  minutes: number;
};
export default function WelcomeGuide({
  name,
  draftKey,
  goal,
  minutes,
  accounts,
  canAuthorize,
  busy,
  error,
  onChessCom,
  onLichessSync,
  onFinish,
}: {
  name?: string;
  draftKey: string;
  goal: string;
  minutes: number;
  accounts: Record<string, any>;
  canAuthorize: boolean;
  busy: boolean;
  error: string;
  onChessCom: (username: string) => Promise<void>;
  onLichessSync: () => Promise<void>;
  onFinish: (
    choices: WelcomeChoices,
    skip?: boolean,
    skillCheck?: boolean,
  ) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState("new");
  const [chosenGoal, setGoal] = useState(goal);
  const [chosenMinutes, setMinutes] = useState(minutes);
  const [platform, setPlatform] = useState("chesscom");
  const [requestedPlatform, setRequestedPlatform] = useState("");
  const [username, setUsername] = useState(
    accounts.chesscom?.profile?.username || "",
  );
  const [board, setBoard] = useState(() => new Chess().fen());
  const [boardMessage, setBoardMessage] = useState(
    "Try it: tap the e2 pawn, then tap e4.",
  );
  const [moved, setMoved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      if (draft) {
        setStep(Math.min(4, Math.max(1, draft.step || 1)));
        if (["new", "rules", "regular"].includes(draft.experience))
          setExperience(draft.experience);
        if (typeof draft.goal === "string") setGoal(draft.goal);
        if ([10, 15, 30, 45, 60, 90].includes(draft.minutes))
          setMinutes(draft.minutes);
        if (draft.platform === "lichess") setPlatform("lichess");
        if (typeof draft.username === "string") setUsername(draft.username);
      }
    } catch {}
    setLoaded(true);
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          step,
          experience,
          goal: chosenGoal,
          minutes: chosenMinutes,
          platform,
          username,
        }),
      );
    } catch {}
  }, [loaded, step, experience, chosenGoal, chosenMinutes, platform, username]);
  const choices = { experience, goal: chosenGoal, minutes: chosenMinutes };
  const titles = [
    "A good place to begin.",
    "Make room for progress.",
    "Bring your chess journey.",
    "One tap. Your next move.",
  ];
  const steps = ["Welcome", "Your goals", "Your accounts", "Your first move"];
  function finish(skip = false, skillCheck = false) {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {}
    onFinish(choices, skip, skillCheck);
  }
  function move(from: string, to: string, promotion = "q") {
    if (moved) return;
    try {
      const g = new Chess(board);
      const m = g.move({ from, to, promotion });
      if (m.from !== "e2" || m.to !== "e4") {
        setBoardMessage(
          "That move is legal. For this quick tour, try the e2 pawn to e4.",
        );
        return;
      }
      setBoard(g.fen());
      setMoved(true);
      setBoardMessage(
        "You’ve got it. The board checks every move for legality.",
      );
    } catch {
      setBoardMessage(
        "Choose a highlighted legal square for the selected piece.",
      );
    }
  }
  return (
    <dialog
      className="welcome-dialog"
      ref={dialog}
      aria-labelledby="welcome-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) finish(true);
      }}
    >
      <div className="welcome-shell">
        <aside className="welcome-aside">
          <span className="welcome-brand">
            <InfinityIcon size={30} />
            <strong>chess infinity</strong>
          </span>
          <div>
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>
              Small steps.
              <br />
              Stronger chess.
            </h2>
            <p>A learning path that fits you, one thoughtful move at a time.</p>
            <span className="welcome-aside-piece" aria-hidden="true">
              ♞
            </span>
          </div>
          <ol>
            {steps.map((label, i) => (
              <li
                key={label}
                className={
                  step === i + 1 ? "current" : step > i + 1 ? "finished" : ""
                }
              >
                <span>{step > i + 1 ? <CheckCircle2 size={16} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </aside>
        <section className="welcome-content">
          <header>
            <span>
              STEP {step} OF 4 · {steps[step - 1].toUpperCase()}
            </span>
            <button
              aria-label="Skip welcome setup"
              className="icon-btn"
              disabled={busy}
              onClick={() => finish(true)}
            >
              <X size={19} />
            </button>
          </header>
          <div className="welcome-step-body">
            <span className="welcome-step-icon">
              {step === 1 ? (
                <Sparkles size={26} />
              ) : step === 2 ? (
                <Target size={26} />
              ) : step === 3 ? (
                <Link2 size={26} />
              ) : (
                <BookOpen size={26} />
              )}
            </span>
            <h1 id="welcome-title">{titles[step - 1]}</h1>
            {step === 1 ? (
              <>
                <p>
                  Welcome{name ? ", " + name.split(" ")[0] : ""}. Tell us where
                  you’re starting. Your experience helps choose your first
                  lessons.
                </p>
                <div className="welcome-options">
                  {[
                    {
                      id: "new",
                      title: "I’m brand new",
                      text: "Learn the board, the pieces, and the rules.",
                    },
                    {
                      id: "rules",
                      title: "I know the rules",
                      text: "Build habits, recognize tactics, and play with a plan.",
                    },
                    {
                      id: "regular",
                      title: "I already play regularly",
                      text: "Sharpen calculation and learn from your own games.",
                    },
                  ].map((o) => (
                    <button
                      key={o.id}
                      aria-pressed={experience === o.id}
                      className={experience === o.id ? "selected" : ""}
                      onClick={() => setExperience(o.id)}
                    >
                      <span>
                        <strong>{o.title}</strong>
                        <small>{o.text}</small>
                      </span>
                      {experience === o.id ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <span className="welcome-option-circle" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : step === 2 ? (
              <>
                <p>
                  A realistic goal and a few focused minutes make practice
                  easier to keep. You can change both later.
                </p>
                <label className="welcome-label">
                  Your main goal
                  <select
                    value={chosenGoal}
                    onChange={(e) => setGoal(e.target.value)}
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
                      "Improve blitz or bullet",
                      "Prepare for tournaments",
                      "Master an opening",
                    ].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="welcome-label">
                  Time for a typical session
                </label>
                <div className="welcome-minutes">
                  {[10, 15, 30, 45, 60, 90].map((m) => (
                    <button
                      aria-pressed={chosenMinutes === m}
                      key={m}
                      className={chosenMinutes === m ? "selected" : ""}
                      onClick={() => setMinutes(m)}
                    >
                      {m}
                      <small>minutes</small>
                    </button>
                  ))}
                </div>
                <div className="lesson-note">
                  <strong>Start small. Keep it steady.</strong>
                  <p>
                    Your training plan will use this session length. Ratings are
                    goals, never guaranteed outcomes.
                  </p>
                </div>
              </>
            ) : step === 3 ? (
              <>
                <p>
                  Bring in real ratings and completed games. Connecting a
                  profile is optional; lessons and puzzles work without one.
                </p>
                <div
                  className="welcome-platforms"
                  role="group"
                  aria-label="Choose chess platform"
                >
                  <button
                    aria-pressed={platform === "chesscom"}
                    className={platform === "chesscom" ? "selected" : ""}
                    onClick={() => setPlatform("chesscom")}
                  >
                    Chess.com
                  </button>
                  <button
                    aria-pressed={platform === "lichess"}
                    className={platform === "lichess" ? "selected" : ""}
                    onClick={() => setPlatform("lichess")}
                  >
                    Lichess
                  </button>
                </div>
                {platform === "chesscom" ? (
                  <>
                    <p className="welcome-connection-note">
                      Chess.com uses a linked public profile, not an
                      authenticated login. Never enter your chess password here.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (username.trim() && !busy) {
                          setRequestedPlatform("chesscom");
                          void onChessCom(username);
                        }
                      }}
                    >
                      <label className="welcome-label">
                        Chess.com username or profile link
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Your Chess.com username"
                        />
                      </label>
                      <button
                        className="secondary full"
                        type="submit"
                        disabled={busy || !username.trim()}
                      >
                        {busy ? (
                          <LoaderCircle size={16} className="spin" />
                        ) : (
                          <Link2 size={16} />
                        )}{" "}
                        {busy
                          ? "Importing your public profile…"
                          : "Connect public profile"}
                      </button>
                    </form>
                    {accounts.chesscom?.profile?.username && (
                      <div className="welcome-connected" role="status">
                        {accounts.chesscom.profile.avatar && (
                          <img
                            src={accounts.chesscom.profile.avatar}
                            alt="Connected Chess.com profile"
                          />
                        )}
                        <span>
                          <CheckCircle2 size={16} />
                          <strong>{accounts.chesscom.profile.username}</strong>
                          <small>
                            Real profile linked. Imported games and ratings are
                            in Connected accounts.
                          </small>
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="welcome-connection-note">
                      Lichess uses its official authorization page. We request
                      only the access needed for supported imports; the app
                      never asks for your Lichess password.
                    </p>
                    {canAuthorize ? (
                      <>
                        <a className="secondary full" href="/api/lichess/start">
                          <Link2 size={16} />
                          Authorize with Lichess
                        </a>
                        <button
                          className="text-btn"
                          disabled={busy}
                          onClick={() => {
                            setRequestedPlatform("lichess");
                            void onLichessSync();
                          }}
                        >
                          {busy
                            ? "Importing authorized games…"
                            : "Already authorized? Import my games"}
                        </button>
                      </>
                    ) : (
                      <a
                        className="secondary full"
                        href="/login?return_to=%2F%3Fonboarding%3D1"
                      >
                        Sign in to your academy to authorize Lichess
                      </a>
                    )}
                    {accounts.lichess?.profile?.username && (
                      <div className="welcome-connected" role="status">
                        <CheckCircle2 size={18} />
                        <strong>{accounts.lichess.profile.username}</strong>
                        <span>Authorized profile imported.</span>
                      </div>
                    )}
                  </>
                )}
                {error && requestedPlatform === platform && (
                  <div className="feedback error" role="alert">
                    {error}
                  </div>
                )}
                <div className="welcome-privacy">
                  <ShieldCheck size={17} />
                  <span>
                    You can skip this step and connect later. Connection is
                    confirmed only when a real profile is returned.
                  </span>
                </div>
              </>
            ) : (
              <>
                <p>
                  Tap a piece to see legal destinations, then tap a square. On a
                  computer, you can also drag pieces.
                </p>
                <div className="welcome-board">
                  <Board
                    fen={board}
                    onMove={move}
                    disabled={moved}
                    theme="violet"
                  />
                </div>
                <div
                  className={"feedback " + (moved ? "success" : "")}
                  role="status"
                >
                  {boardMessage}
                </div>
                <div className="welcome-tour-notes">
                  <span>
                    <CheckCircle2 size={15} />
                    Learn: guided boards and quick quizzes
                  </span>
                  <span>
                    <CheckCircle2 size={15} />
                    Puzzles: fresh positions and targeted review
                  </span>
                  <span>
                    <CheckCircle2 size={15} />
                    Mistake Revenge: practice from your real games
                  </span>
                </div>
              </>
            )}
          </div>
          {step === 4 && (
            <button
              className="text-btn welcome-skill-check"
              disabled={busy}
              onClick={() => finish(false, true)}
            >
              Know the moves already? Find my starting point with a skill check{" "}
              <ArrowRight size={15} />
            </button>
          )}
          <footer>
            {step > 1 ? (
              <button
                className="text-btn"
                disabled={busy}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <button
                className="text-btn"
                disabled={busy}
                onClick={() => finish(true)}
              >
                Set up later
              </button>
            )}
            <button
              className="primary"
              disabled={busy}
              onClick={() => (step < 4 ? setStep((s) => s + 1) : finish())}
            >
              {step === 4
                ? "Start my first lesson"
                : step === 3
                  ? "Continue to board tour"
                  : "Continue"}
              <ArrowRight size={17} />
            </button>
          </footer>
        </section>
      </div>
    </dialog>
  );
}
