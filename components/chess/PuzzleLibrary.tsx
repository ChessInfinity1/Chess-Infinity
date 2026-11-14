"use client";
import { useRef } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronLeft, ChevronRight, Crosshair, Layers3, Puzzle, RotateCcw, Search, Sparkles, Target, Zap } from "lucide-react";
import Board from "./Board";
import { puzzles, type Exercise, type Progress } from "../../lib/chess/content";
import { puzzleTags } from "../../lib/chess/puzzle-library";
import { practiceRecommendation } from "../../lib/chess/learning";

const PAGE_SIZE = 12;
export default function PuzzleLibrary({ progress, recommendation, filtered, query, pattern, range, scope, page, onQuery, onPattern, onRange, onScope, onPage, onTrain, onNavigate }: {
  progress: Progress;
  recommendation: ReturnType<typeof practiceRecommendation>;
  filtered: Exercise[];
  query: string; pattern: string; range: string; scope: string; page: number;
  onQuery: (value: string) => void; onPattern: (value: string) => void;
  onRange: (value: string) => void; onScope: (value: string) => void;
  onPage: (value: number) => void; onTrain: (exercise: Exercise) => void;
  onNavigate: (page: string) => void;
}) {
  const library = useRef<HTMLDivElement>(null);
  const attempts = new Map(progress.puzzles.map(attempt => [attempt.id, attempt]));
  const saved = new Set(progress.savedExercises || []);
  const clean = progress.puzzles.filter(attempt => attempt.correct).length;
  const missed = [...attempts.values()].filter(attempt => !attempt.correct).length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const hasFilters = query !== "" || pattern !== "All patterns" || range !== "all" || scope !== "all";
  function reset() { onQuery(""); onPattern("All patterns"); onRange("all"); onScope("all"); }
  function browse(value: string) { onScope(value); library.current?.scrollIntoView({ block: "start" }); }
  function changePage(value: number) { onPage(value); library.current?.scrollIntoView({ block: "start" }); }
  return <section className="puzzles-page puzzle-hub" aria-label="Puzzle training">
    <header className="puzzle-hub-heading"><div><span className="eyebrow">THE TACTICS CLUB</span><h1>Small puzzles. Big breakthroughs.</h1><p>Find a pattern. Trust your calculation. Come back stronger.</p></div><span className="puzzle-library-badge"><Layers3 size={16}/>{puzzles.length.toLocaleString()} positions</span></header>
    <div className="puzzle-hub-overview">
      <section className="puzzle-feature">
        <div className="puzzle-feature-copy"><span className="puzzle-feature-kicker"><Sparkles size={15}/> PICKED FOR YOU</span><h2>{recommendation.review ? "A second look.\nA stronger instinct." : "Your next\nbreakthrough awaits."}</h2><p>{recommendation.reason}.</p><div className="puzzle-feature-meta"><span>{recommendation.puzzle.theme}</span><span>Difficulty {recommendation.puzzle.rating}</span></div><button className="primary" onClick={() => onTrain(recommendation.puzzle)}>Start my next puzzle <ArrowRight size={18}/></button><small>No clock. Take your time.</small></div>
        <div className="puzzle-feature-board" aria-hidden="true" inert><Board fen={recommendation.puzzle.fen} theme={progress.boardTheme} onMove={() => {}} disabled flipped={recommendation.puzzle.fen.split(" ")[1] === "b"}/><span>YOUR NEXT POSITION</span></div>
      </section>
      <section className="puzzle-progress-card card" aria-label="Your puzzle progress"><div className="puzzle-progress-label"><Target size={19}/><span>YOUR TACTICAL GROWTH</span></div><strong>{progress.puzzleRating.toLocaleString()}</strong><p>Academy puzzle rating</p><div className="puzzle-stat-pair"><div><b>{clean}</b><span>Clean solves</span></div><div><b>{progress.puzzles.length ? Math.round(clean / progress.puzzles.length * 100) + "%" : "—"}</b><span>Clean-solve rate</span></div></div><small>Your personal training estimate, separate from your playing rating.</small></section>
    </div>
    <div className="puzzle-mode-grid" aria-label="Ways to practice">
      <button onClick={() => browse("unseen")}><span className="puzzle-mode-icon"><Crosshair size={21}/></span><span><strong>Fresh eyes</strong><small>Discover an unseen position</small></span><ArrowUpRight size={17}/></button>
      <button onClick={() => browse("missed")}><span className="puzzle-mode-icon amber"><RotateCcw size={21}/></span><span><strong>Try it again</strong><small>{missed ? `${missed} patterns to revisit` : "Turn mistakes into progress"}</small></span><ArrowUpRight size={17}/></button>
      <button onClick={() => browse("saved")}><span className="puzzle-mode-icon sage"><Bookmark size={21}/></span><span><strong>Your collection</strong><small>{saved.size} saved for another look</small></span><ArrowUpRight size={17}/></button>
      <button onClick={() => onNavigate("arcade")}><span className="puzzle-mode-icon rose"><Zap size={21}/></span><span><strong>Pick up the pace</strong><small>Explore the training arcade</small></span><ArrowUpRight size={17}/></button>
    </div>
    <div className="puzzle-library-section" ref={library}>
      <div className="puzzle-library-heading"><div><span className="eyebrow">A LITTLE PRACTICE, EVERY DAY</span><h2>Find your next challenge</h2></div>{hasFilters && <button className="text-btn" onClick={reset}><RotateCcw size={14}/> Clear filters</button>}</div>
      <div className="puzzle-scope-controls" aria-label="Puzzle practice filters">{[["all", "All puzzles"], ["unseen", "Unseen"], ["missed", "Missed"], ["saved", "Saved"], ["new", "Original drills"]].map(([value, label]) => <button key={value} aria-pressed={scope === value} onClick={() => onScope(value)}>{label}</button>)}</div>
      <div className="puzzle-filter-panel">
        <label className="puzzle-search"><Search size={18}/><input aria-label="Search puzzles" placeholder="Search a pattern or idea…" value={query} onChange={event => onQuery(event.target.value)}/></label>
        <label><span>Pattern</span><select value={pattern} onChange={event => onPattern(event.target.value)}>{["All patterns", ...new Set(puzzles.flatMap(puzzleTags))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span>Difficulty</span><select value={range} onChange={event => onRange(event.target.value)}><option value="all">All difficulties</option><option value="beginner">Under 1000</option><option value="improving">1000–1399</option><option value="club">1400–1799</option><option value="advanced">1800+</option></select></label>
      </div>
      <p className="puzzle-result-count" role="status">{filtered.length.toLocaleString()} {filtered.length === 1 ? "position" : "positions"}{filtered.length > 0 && <span> · Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span>}</p>
      <div className="puzzle-grid">{filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(puzzle => {
        const attempt = attempts.get(puzzle.id);
        return <button className="card puzzle-card" key={puzzle.id} onClick={() => onTrain(puzzle)}><div className="puzzle-preview" aria-hidden="true" inert><Board fen={puzzle.fen} onMove={() => {}} disabled theme={progress.boardTheme} flipped={puzzle.fen.split(" ")[1] === "b"}/></div><div className="puzzle-card-copy"><div className="puzzle-card-tags"><span className="puzzle-pattern-tag">{puzzle.theme}</span>{saved.has(puzzle.id) && <Bookmark size={14} aria-label="Saved" fill="currentColor"/>}</div><h3>{puzzle.title}</h3><div className="puzzle-card-meta"><span>{puzzle.rating} <span className="muted">difficulty</span></span><span>{Math.ceil(puzzle.line.length / 2)} move{puzzle.line.length > 2 ? "s" : ""}</span></div><div className="puzzle-card-bottom"><span className={"puzzle-attempt " + (attempt?.correct ? "solved" : attempt ? "retry" : "fresh")}>{attempt?.correct ? <Check size={13}/> : attempt ? <RotateCcw size={12}/> : <span className="fresh-dot"/>}{attempt?.correct ? "Solved cleanly" : attempt ? "Try again" : "Unseen"}</span><ArrowRight size={16}/></div></div></button>;
      })}</div>
      {!filtered.length && <div className="card empty-puzzles"><span className="empty-puzzle-icon"><Puzzle size={28}/></span><h3>{scope === "saved" ? "Your collection starts with one puzzle." : scope === "missed" ? "Nothing to revisit here yet." : "Let’s find another challenge."}</h3><p>{scope === "saved" ? "Open a puzzle and choose Save for later to keep it here." : scope === "missed" ? "Puzzles you miss will appear here for another try. Adjust your filters or explore the full library." : "Try a different pattern, difficulty, or search."}</p><button className="secondary" onClick={reset}>Explore all puzzles <ArrowRight size={16}/></button></div>}
      {pages > 1 && <nav className="puzzle-pagination" aria-label="Puzzle library pages"><button className="secondary" disabled={page === 1} onClick={() => changePage(page - 1)}><ChevronLeft size={17}/> Previous</button><span>Page <strong>{page}</strong> of {pages}</span><button className="secondary" disabled={page === pages} onClick={() => changePage(page + 1)}>Next <ChevronRight size={17}/></button></nav>}
      <p className="library-credit">Made for thoughtful practice. Lichess puzzles use CC0 public-domain data. <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noreferrer">Source &amp; license ↗</a></p>
    </div>
  </section>;
}
