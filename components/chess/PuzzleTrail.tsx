"use client";
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Crosshair, Eye, Flag, GitFork, Heart, Library, Map as MapIcon, Puzzle, Sparkles, Timer, Trophy } from "lucide-react";
import { trailStops, type TrailStop } from "../../lib/chess/puzzle-trail";
import "./puzzle-trail.css";

const chapters = ["Knightfall Valley", "The Violet Citadel"];
const icons = { tactics: Puzzle, forks: GitFork, sprint: Timer, daily: CalendarDays, mate: Crosshair, vision: Eye, endgame: Flag, survival: Heart };

export default function PuzzleTrail({ stamps = [], rating, onStart, library, setLibrary, selectedChapter, onChapter }: {
  stamps?: string[]; rating: number; onStart: (stop: TrailStop) => void;
  selectedChapter: number | null; onChapter: (chapter: number) => void;
  library: boolean; setLibrary: (show: boolean) => void;
}) {
  const next = trailStops.findIndex(stop => !stamps.includes(stop.id));
  const chapter = selectedChapter ?? (next < 0 ? 0 : Math.floor(next / 4));
  const stops = trailStops.slice(chapter * 4, chapter * 4 + 4);
  const featured = stops.find(stop => !stamps.includes(stop.id)) || stops[0];
  const count = trailStops.filter(stop => stamps.includes(stop.id)).length;

  return <div className="ptrail">
    <header className="ptrail-heading">
      <h1>Puzzle trail</h1>
      <div className="ptrail-switch" aria-label="Puzzle view">
        <button aria-pressed={!library} onClick={() => setLibrary(false)}><MapIcon size={16}/> Trail</button>
        <button aria-pressed={library} onClick={() => setLibrary(true)}><Library size={16}/> Library</button>
      </div>
    </header>
    {!library && <>
      <section className={'ptrail-land chapter-' + chapter} aria-label={chapters[chapter]}>
        <div className="ptrail-chapter">
          <div><span>Chapter 0{chapter + 1} / 02</span><h2>{chapters[chapter]}</h2></div>
          <div className="ptrail-arrows">
            <button aria-label="Previous chapter" disabled={chapter === 0} onClick={() => onChapter(0)}><ChevronLeft/></button>
            <button aria-label="Next chapter" disabled={chapter === 1} onClick={() => onChapter(1)}><ChevronRight/></button>
          </div>
        </div>
        <div className="ptrail-map">
          <svg className="ptrail-line wide" viewBox="0 0 1000 300" preserveAspectRatio="none" focusable="false" aria-hidden="true"><path d="M120 174 C215 174 245 78 365 78 S536 177 625 177 S784 66 870 66"/></svg>
          <svg className="ptrail-line narrow" viewBox="0 0 300 340" preserveAspectRatio="none" focusable="false" aria-hidden="true"><path d="M66 75 C110 75 147 48 216 48 S274 151 210 170 S62 151 66 224 S151 262 216 241"/></svg>
          <ol className="ptrail-stops">{stops.map((stop, index) => {
            const Icon = icons[stop.id], earned = stamps.includes(stop.id);
            return <li key={stop.id} className={'node-' + index}>
              <button onClick={() => onStart(stop)} className={'ptrail-stop ' + (earned ? "earned" : stop.id === featured.id ? "current" : "")}
                aria-label={stop.title + (earned ? ", cleared. Play again" : ". Play checkpoint")}>
                <span className="ptrail-disc"><Icon size={25}/><small>{earned ? <Check size={12}/> : chapter * 4 + index + 1}</small></span>
                <strong>{stop.title}</strong>
              </button>
            </li>;
          })}</ol>
        </div>
      </section>
      <div className="ptrail-bottom">
        <section className="ptrail-next"><span className="ptrail-symbol"><Sparkles/></span><div><small>{stops.every(s => stamps.includes(s.id)) ? "Play again" : "Next checkpoint"}</small><h3>{featured.title}</h3><p>{featured.detail}</p></div>
          <button className="primary" onClick={() => onStart(featured)}>Play <ArrowRight size={16}/></button></section>
        <section className="ptrail-progress"><div><Trophy size={17}/> Trail progress <strong>{count} / {trailStops.length}</strong></div><progress aria-label="Cleared checkpoints" value={count} max={trailStops.length}/><p>Earn a checkpoint with one clean solve or one clean arcade point.</p><small>Puzzle rating <b>{rating.toLocaleString()}</b></small></section>
      </div>
    </>}
  </div>;
}
