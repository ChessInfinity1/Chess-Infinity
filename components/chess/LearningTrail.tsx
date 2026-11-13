"use client";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Clock3, Compass, Flag, Layers3, Search, Sparkles, Target, Trophy } from "lucide-react";
import { levels, lessons, type Lesson, type Progress } from "../../lib/chess/content";
import { trailLessons, trailUnits } from "../../lib/chess/learning-trail";
import { nextLearningLesson } from "../../lib/chess/learning";
import Board from "./Board";
import "./learn-academy.css";

const descriptions = ["The board, your pieces, and the moves that make a game.", "Confident openings, a safe king, and reliable everyday habits.", "Forks, pins, forcing moves, and combinations you can actually see.", "Active pieces, useful pawn structures, and a plan for the position.", "Careful calculation and the details that decide an endgame.", "Deeper tactical practice. Take your time and check the reply."];
const symbols = [BookOpen, Flag, Target, Compass, Trophy, Layers3];

export default function LearningTrail({ progress, level, onLevel, onLesson, onAssessment, onNavigate }: {
  progress: Progress; level: number; onLevel: (level: number) => void;
  onLesson: (lesson: Lesson) => void; onAssessment: () => void; onNavigate: (page: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const completed = useMemo(() => new Set(progress.completed), [progress.completed]);
  const next = nextLearningLesson(progress);
  const currentLevel = Math.max(1, Math.min(6, level));
  const track = trailLessons(currentLevel), units = trailUnits(currentLevel);
  const done = track.filter(l => completed.has(l.id)).length;
  const totalDone = lessons.filter(l => completed.has(l.id)).length;
  const activeUnit = units.find(u => u.lessons.some(l => !completed.has(l.id)))?.id || units[0]?.id;
  const visibleUnit = openUnit || activeUnit;
  const searching = !!query.trim() || filter !== "all";
  const results = (query.trim() ? lessons : track).filter(l => `${l.title} ${l.theme} ${l.intro}`.toLowerCase().includes(query.trim().toLowerCase()) && (filter === "all" || (filter === "completed" ? completed.has(l.id) : !completed.has(l.id))));
  const chooseLevel = (n: number) => { onLevel(n); setOpenUnit(null); setQuery(""); setFilter("all"); };
  const isReview = totalDone === lessons.length;
  function lessonRow(lesson: Lesson, index: number) {
    const finished = completed.has(lesson.id), recommended = !finished && lesson.id === next.id;
    return <button key={lesson.id} className={`learn-lesson-row ${finished ? "is-complete" : ""} ${recommended ? "is-next" : ""}`} onClick={() => onLesson(lesson)} aria-label={`${finished ? "Review" : "Start"}: ${lesson.title}. ${lesson.minutes} minutes.`}>
      <span className="learn-lesson-index">{finished ? <Check size={18}/> : recommended ? <BookOpen size={18}/> : String(index + 1).padStart(2, "0")}</span>
      <span className="learn-lesson-name"><strong>{lesson.title}</strong><small>{lesson.theme}{query.trim() ? ` · ${levels[lesson.level - 1]}` : ""}</small></span>
      <span className="learn-lesson-meta">{recommended && <em>Up next</em>}<span><Clock3 size={13}/>{lesson.minutes} min</span></span><ChevronRight className="learn-row-arrow" size={17}/>
    </button>;
  }
  return <div className="learn-academy">
    <header className="learn-heading"><div><span className="eyebrow">THE LEARNING STUDIO</span><h1>Small lessons. <span>Stronger chess.</span></h1><p>Understand the idea. Make the move. Build on it tomorrow.</p></div><button className="secondary" onClick={onAssessment}><Compass size={17}/>Find my level</button></header>
    <section className="learn-hero" aria-labelledby="learn-next-title">
      <div className="learn-hero-copy"><span className="learn-kicker"><Sparkles size={15}/>{isReview ? "KEEP THE IDEAS FRESH" : totalDone ? "PICK UP WHERE YOU LEFT OFF" : "YOUR FIRST STEP STARTS HERE"}</span><div className="learn-hero-track">Track {next.level} <span> / </span>{levels[next.level - 1]}</div><h2 id="learn-next-title">{next.title}</h2><p>{next.intro}</p><div className="learn-hero-details"><span><Clock3 size={15}/>{next.minutes} minutes</span><span><Target size={15}/>Play a position + quick quiz</span></div><button className="primary" onClick={() => onLesson(next)}>{isReview ? "Review this lesson" : totalDone ? "Continue learning" : "Start learning"}<ArrowRight size={18}/></button></div>
      <div className="learn-hero-board"><div className="learn-board-caption"><span className="learn-live-dot"/>Your next position<span>{next.fen.split(" ")[1] === "b" ? "Black" : "White"} to move</span></div><div className="learn-board-preview" aria-hidden="true" inert><Board fen={next.fen} onMove={() => {}} disabled flipped={next.fen.split(" ")[1] === "b"} theme={progress.boardTheme}/></div><span className="learn-board-foot">A real position. A new way to see it.</span></div>
    </section>
    <div className="learn-stat-strip"><span><BookOpen size={19}/><strong>{totalDone}<small> / {lessons.length}</small></strong><span>lessons completed</span></span><span><Layers3 size={19}/><strong>{levels.length}</strong><span>learning tracks</span></span><span><Target size={19}/><strong>{Math.round(done / Math.max(1, track.length) * 100)}%</strong><span>of this track</span></span></div>
    <div className="learn-workspace"><aside className="learn-track-picker"><div className="learn-section-label">YOUR CURRICULUM<span>Explore any track</span></div><nav aria-label="Learning tracks">{levels.map((title,i) => {
      const list = trailLessons(i+1), count = list.filter(l => completed.has(l.id)).length, Icon = symbols[i];
      return <button key={title} onClick={() => chooseLevel(i+1)} aria-pressed={currentLevel === i+1} className={currentLevel === i+1 ? "active" : ""}><span className="learn-track-symbol"><Icon size={19}/></span><span><small>TRACK {String(i+1).padStart(2,"0")}</small><strong>{title}</strong><span className="learn-track-count">{count}/{list.length} complete</span></span>{count === list.length ? <Check size={16}/> : <ChevronRight size={15}/>}</button>;
    })}</nav><div className="learn-assessment-note"><Compass size={22}/><h3>Not sure where to begin?</h3><p>A short board assessment helps find useful lessons for you.</p><button className="text-btn" onClick={onAssessment}>Find my starting point<ArrowRight size={15}/></button></div></aside>
    <section className="learn-course" aria-labelledby="learn-course-title"><div className="learn-course-heading"><div><span className="eyebrow">TRACK {String(currentLevel).padStart(2,"0")}</span><h2 id="learn-course-title">{levels[currentLevel-1]}</h2><p>{descriptions[currentLevel-1]}</p></div><div className="learn-course-counter"><strong>{done}<small>/{track.length}</small></strong><span>completed</span></div></div><div className="learn-course-progress" role="progressbar" aria-label="Track completion" aria-valuemin={0} aria-valuemax={track.length} aria-valuenow={done}><i style={{width:`${done / Math.max(1,track.length)*100}%`}}/></div>
      <div className="learn-library-controls"><label className="learn-search"><Search size={17}/><input aria-label="Search all lessons" placeholder="Search lessons, topics, ideas…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label><select aria-label="Filter lessons by completion" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All lessons</option><option value="remaining">To learn</option><option value="completed">Completed</option></select></div>
      {searching ? <div className="learn-search-results" aria-live="polite"><div className="learn-result-label">{results.length} {results.length === 1 ? "lesson" : "lessons"}{query.trim() ? " across all tracks" : " in this track"}</div>{results.map(lessonRow)}{!results.length && <div className="learn-empty"><Search size={26}/><h3>No lessons found</h3><p>Try a topic like “fork” or “king”, or clear your filters.</p><button className="secondary" onClick={() => {setQuery("");setFilter("all");}}>Clear filters</button></div>}</div> : <div className="learn-unit-list">{units.map(unit => {
        const count = unit.lessons.filter(l => completed.has(l.id)).length, finished = count === unit.lessons.length, expanded = visibleUnit === unit.id;
        return <section className={`learn-unit-card ${expanded ? "is-open" : ""}`} key={unit.id}><button className="learn-unit-toggle" aria-expanded={expanded} aria-controls={unit.id+"-lessons"} onClick={() => setOpenUnit(expanded ? "closed" : unit.id)}><span className={`learn-unit-badge ${finished ? "earned" : ""}`}>{finished ? <Check size={20}/> : String(unit.number).padStart(2,"0")}</span><span><small>UNIT {unit.number}</small><h3>{unit.title}</h3><span>{unit.lessons.length} lessons · {unit.lessons.reduce((n,l)=>n+l.minutes,0)} min</span></span><span className="learn-unit-count">{count}/{unit.lessons.length}</span><ChevronDown size={19}/></button>{expanded && <div className="learn-unit-lessons" id={unit.id+"-lessons"}>{unit.lessons.map(lessonRow)}<div className="learn-unit-footer"><Flag size={15}/>{finished ? "Unit complete. Revisit any lesson to practice again." : "One concept, one board challenge, one step forward."}</div></div>}</section>;
      })}</div>}
      {done === track.length && <div className="learn-track-finished"><Trophy size={24}/><div><h3>Track complete. Well played.</h3><p>Review a lesson or start your next chapter.</p></div>{currentLevel < 6 && <button className="secondary" onClick={()=>chooseLevel(currentLevel+1)}>Next track<ArrowRight size={16}/></button>}</div>}
    </section></div>
    <section className="learn-practice-links" aria-label="Put your learning into practice"><button onClick={()=>onNavigate("focus")}><span className="learn-link-icon"><Sparkles size={23}/></span><span><small>A LITTLE EVERY DAY</small><strong>Start a focus session</strong><span>A lesson and a few puzzles, in one sitting.</span></span><ArrowRight size={19}/></button><button onClick={()=>onNavigate("puzzles")}><span className="learn-link-icon"><Target size={23}/></span><span><small>MAKE THE PATTERNS STICK</small><strong>Practice your tactics</strong><span>Put your new ideas to work on the board.</span></span><ArrowRight size={19}/></button></section>
    <p className="learn-scope-note">Every lesson includes a playable board challenge and a quiz. All tracks are open to explore. Advanced tracks currently focus on foundational drills; the curriculum is growing.</p>
  </div>;
}
