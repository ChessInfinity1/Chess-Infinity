"use client";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, Clock, Puzzle, RotateCcw, Target, Trophy } from "lucide-react";
import { lessons, puzzles, type Progress, type Exercise, type Lesson } from "../../lib/chess/content";
import { duePractice, type FocusSession as Session } from "../../lib/chess/focus";
import "./focus-session.css";

export default function FocusSession({ progress, signedIn, onStart, onPractice }: {
  progress: Progress;
  signedIn: boolean;
  onStart: (minutes: 5 | 10 | 15) => void;
  onPractice: (exercise: Exercise, lesson: Lesson | undefined, sessionId: string) => void;
}) {
  const [minutes, setMinutes] = useState<5 | 10 | 15>(10);
  const sessions = progress.focusSessions || [];
  const session = sessions.at(-1);
  const due = duePractice(progress).length;
  const completed = session?.steps.filter(step => step.completedAt).length || 0;
  const next = session?.steps.find(step => !step.completedAt);
  const finished = !!session?.finishedAt;
  const history = sessions.filter(item => item.finishedAt).slice(-5).reverse();
  function resume(current: Session) {
    const step = current.steps.find(item => !item.completedAt);
    if (!step) return;
    const lesson = step.kind === "lesson" ? lessons.find(item => item.id === step.id) : undefined;
    const exercise = lesson || puzzles.find(item => item.id === step.id);
    if (exercise) onPractice(exercise, lesson, current.id);
  }
  return <div className="focus-page">
    <div className="section-heading"><div><span className="eyebrow">LESS SCROLLING. MORE LEARNING.</span><h1>Your focus session</h1><p>One idea, a few positions, and a clear place to stop.</p></div></div>
    <section className="focus-hero">
      <span className="focus-symbol">{finished ? <Trophy size={27}/> : <Target size={27}/>}</span>
      <div><span className="eyebrow">{finished ? "SESSION COMPLETE" : session ? "PICK UP WHERE YOU LEFT OFF" : "A SMALL STEP FORWARD"}</span><h2>{finished ? "Good practice. Now let it settle." : session ? "Your next move is ready." : "Build a routine that fits your day."}</h2><p>{finished ? "Replay any tricky positions before starting a new session." : "Start with a lesson, then practice tactics. Due reviews come first, followed by fresh positions near your puzzle difficulty."}</p></div>
      <div className="focus-meta"><span><RotateCcw size={16}/>{due} {due === 1 ? "review" : "reviews"} due</span><span><Clock size={16}/>Go at your own pace</span></div>
      {(!session || finished) ? <div className="focus-start"><div className="focus-duration" role="group" aria-label="Session length">{([5,10,15] as const).map(value => <button key={value} aria-pressed={minutes === value} onClick={() => setMinutes(value)}>{value} min</button>)}</div><button className="primary" onClick={() => onStart(minutes)}>{finished ? "Start another session" : "Build my session"}<ArrowRight size={18}/></button><small>Approximate duration · no countdown or time pressure.</small></div> : <button className="primary" onClick={() => resume(session)}>{completed ? "Resume session" : "Start first step"}<ArrowRight size={18}/></button>}
      <p className="focus-save-note">{signedIn ? "Your checklist saves with your account, so you can resume on another device after syncing." : "Guest sessions save on this device. Sign in for saving across devices."}</p>
    </section>
    {session && <section className="card focus-checklist" aria-labelledby="focus-checklist-title">
      <div className="focus-section-heading"><h2 id="focus-checklist-title">{finished ? "Session recap" : "Your practice checklist"}</h2><strong aria-live="polite">{completed} / {session.steps.length}</strong></div>
      <div className="focus-progress" role="progressbar" aria-label="Focus session completion" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={session.steps.length}><span style={{width: `${completed / session.steps.length * 100}%`}}/></div>
      <ol>{session.steps.map((step, index) => {
        const exercise = (step.kind === "lesson" ? lessons : puzzles).find(item => item.id === step.id);
        return <li key={`${step.kind}-${step.id}`} className={step.completedAt ? "is-complete" : step === next ? "is-next" : ""}>
          <span className="focus-step-number">{step.completedAt ? <Check size={18}/> : index + 1}</span>
          <div><small>{step.kind === "lesson" ? <BookOpen size={13}/> : <Puzzle size={13}/>} {step.kind === "lesson" ? "Learn" : "Practice"}{step.completedAt && ` · ${step.clean ? "Solved without a hint or wrong move" : "Reviewed with help"}`}</small><strong>{exercise?.title || "Position unavailable"}</strong><p>{step.reason}</p></div>
          {step === next && exercise && <button className="secondary" aria-label={`Practice ${exercise.title}`} onClick={() => resume(session)}><ArrowRight size={18}/></button>}
          {step.completedAt && exercise && <button className="secondary" aria-label={`Revisit ${exercise.title}`} onClick={() => onPractice(exercise, step.kind === "lesson" ? exercise as Lesson : undefined, session.id)}><RotateCcw size={17}/></button>}
        </li>;
      })}</ol>
      {finished && <div className="focus-recap"><strong>{session.steps.filter(step => step.kind === "puzzle" && step.clean).length} / {session.steps.filter(step => step.kind === "puzzle").length} puzzles solved cleanly</strong><p>{session.steps.some(step => step.clean === false) ? "The positions you needed help with are scheduled for another review. A hint is useful feedback, not a failed session." : "Your practiced ideas have been scheduled for spaced review. Return after a break to test what you remember."}</p></div>}
    </section>}
    {!!history.length && <section className="card focus-history"><h2>Recent sessions</h2>{history.map(item => <div key={item.id}><span><Check size={16}/>{new Date(item.finishedAt!).toLocaleDateString(undefined, {month:"short",day:"numeric"})}</span><strong>{item.steps.length} steps finished</strong><small>~{item.minutes} min plan</small></div>)}</section>}
  </div>;
}
