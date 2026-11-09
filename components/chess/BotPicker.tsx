"use client";
import { useState } from "react";
import { ArrowRight, Swords, X } from "lucide-react";
import { trainingBots, type TrainingBot } from "../../lib/chess/bots";
import { Piece } from "./Board";
export function BotAvatar({bot}:{bot:TrainingBot}) {
  return <span className={"bot-avatar " + bot.color} aria-hidden="true"><Piece type={bot.piece} color="b"/></span>;
}
export default function BotPicker({selected,onPick,onClose,onBack}:{selected:string;onPick:(id:string)=>void;onClose:()=>void;onBack?:()=>void}) {
  const [filter,setFilter]=useState("All");
  const found=trainingBots.filter(b=>filter==="All" || b.tier===filter);
  return <div className="practice-arena bot-lobby">
    <header className="arena-heading"><div><span className="arena-kicker"><span/>YOUR PRACTICE PARTNERS</span><h1>Choose your opponent<span>.</span></h1></div><button className="arena-exit" aria-label="Back to academy" onClick={onClose}><X size={18}/><span>Back to academy</span></button></header>
    <p className="bot-lobby-intro">A gentle first game. An attacking challenge. A rival that makes you think.</p>
    <div className="bot-filters" aria-label="Filter bots by difficulty">{["All","Learning","Club","Challenge"].map(t=><button key={t} aria-pressed={filter===t} onClick={()=>setFilter(t)}>{t}</button>)}{onBack && <button className="bot-return" onClick={onBack}>Return to board<ArrowRight size={14}/></button>}</div>
    <div className="bot-roster">{found.map(b=><button className={"bot-card " + (selected===b.id?"selected":"")} key={b.id} aria-label={`Play ${b.name}`} onClick={()=>onPick(b.id)}>
      <div className="bot-card-top"><BotAvatar bot={b}/><span className="bot-tier">{b.id==="custom"?"Adjustable":b.tier}</span></div>
      <h2>{b.name}</h2><strong>{b.tagline}</strong><p>{b.description}</p><span className="bot-card-action"><Swords size={15}/>Play {b.name}<ArrowRight size={15}/></span>
    </button>)}</div>
    <p className="bot-roster-note">Original training opponents. Pip and Moss use simple move rules; the others use Stockfish. Difficulty labels are relative, not official ratings. Style preferences apply when the engine finds similarly evaluated moves.</p>
  </div>;
}
