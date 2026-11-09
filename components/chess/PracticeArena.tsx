"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BrainCircuit, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, LoaderCircle, Play, RotateCcw, Settings2, Swords, Upload, X } from "lucide-react";
import Board, { Piece } from "./Board";
import BotPicker, { BotAvatar } from "./BotPicker";
import type { TrainingBot } from "../../lib/chess/bots";
import { formatClock, type ChessClock } from "../../lib/chess/clock";
type Props = {
  bot: TrainingBot; onBot: (id: string) => void;
  fen: string; startFen: string; theme: string; flip: boolean; blind: boolean; skill: number; seconds: number;
  started: boolean; working: boolean; finished: boolean; status: string; error: string;
  clock: ChessClock; moves: string[]; index: number; saved: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
  onStart: () => void; onReset: () => void; onTakeback: () => void;
  onColor: (black: boolean) => void; onSkill: (value: number) => void;
  onTime: (value: number) => void; onBlind: (value: boolean) => void;
  onIndex: (index: number) => void; onPgn: (value: string) => void;
  onFen: (value: string) => void; onSave: () => void; onExport: (type: "pgn" | "fen") => void;
  onClose: () => void; onGuided?: () => void;
};
export default function PracticeArena(p: Props) {
  const [tab, setTab] = useState("game");
  const [showBots, setShowBots] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [pgn, setPgn] = useState("");
  const [fen, setFen] = useState("");
  const [fileError, setFileError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [showBots]);
  useEffect(() => {
    const media = matchMedia("(max-width: 1000px)");
    const resize = () => { setMobile(media.matches); if (!media.matches) setOpen(false); };
    resize(); media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!open || !mobile) { dialog.current?.close(); return; }
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      dialog.current?.close(); document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, mobile]);
  const player = p.flip ? "b" : "w";
  const bot = p.flip ? "w" : "b";
  const atEnd = p.index === p.moves.length;
  const canTakeback = !p.working && !p.clock.flagged && p.moves.length >= (p.flip ? 2 : 1);
  const running = !!p.clock.active;
  const sheet = p.startFen.split(" ")[1] === "b" ? [-1, ...p.moves.map((_, i) => i)] : p.moves.map((_, i) => i);
  const firstMoveNumber = Number(p.startFen.split(" ")[5]) || 1;
  const level = p.skill <= 4 ? "Starter" : p.skill <= 10 ? "Club" : p.skill <= 16 ? "Advanced" : "Expert";
  const phase = p.finished ? p.status : p.working ? p.bot.name + " is thinking" : !atEnd ? "Viewing an earlier position" : p.started ? (p.status.includes("Check") ? "Your turn · Check" : "Your turn") : "Ready when you are";
  function start() { p.onStart(); setOpen(false); }
  function settings() {
    setTab("game");
    if (mobile) setOpen(true);
    else { panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); panel.current?.querySelector<HTMLButtonElement>("button")?.focus(); }
  }
  const controls = <>
    <div className="arena-panel-tabs" role="tablist" aria-label="Practice tools">
      {[["game","Game setup"],["moves","Moves"],["position","Position"]].map(([id,label]) => <button key={id} id={`arena-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="arena-tool-content" onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <div id="arena-tool-content" role="tabpanel" aria-labelledby={`arena-tab-${tab}`} className="arena-tool-content">
      {tab === "game" && <>
        <div className="arena-panel-heading"><span className="arena-kicker">YOUR NEXT CHALLENGE</span><h2>Make it your game.</h2><p>Choose a side, set the pace, and play.</p></div>
        <div className="arena-selected-bot"><BotAvatar bot={p.bot}/><div><strong>{p.bot.name}</strong><small>{p.bot.id === "custom" ? "Adjustable engine" : p.bot.style + " · " + p.bot.tier}</small></div><button disabled={p.started || p.working} onClick={() => {setOpen(false);setShowBots(true);}}>Change</button></div>
        <fieldset disabled={p.started} className="arena-choice-field"><legend>Play as</legend><div className="arena-color-choice">{[false,true].map(black => <button key={String(black)} aria-pressed={p.flip === black} onClick={() => p.onColor(black)}><span className={black ? "black" : "white"}/>{black ? "Black" : "White"}{p.flip === black && <Check size={14}/>}</button>)}</div></fieldset>
        {p.bot.id === "custom" ? <>
        <fieldset disabled={p.started} className="arena-choice-field"><legend>Opponent strength <strong>{p.skill}<span> / 20</span></strong></legend>
          <div className="arena-skill-presets">{[["Starter",3],["Club",8],["Strong",15]].map(([label,value]) => <button key={label} aria-pressed={p.skill === value} onClick={() => p.onSkill(Number(value))}>{label}</button>)}</div>
          <input aria-label="Engine skill" type="range" min="0" max="20" value={p.skill} onChange={e => p.onSkill(+e.target.value)}/><div className="arena-range-labels"><span>Gentle practice</span><span>Full strength</span></div>
        </fieldset>
        </> : <p className="arena-bot-description">{p.bot.description}<button disabled={p.started} onClick={() => p.onBot("custom")}>Customize engine strength <ArrowRight size={13}/></button></p>}
        <fieldset disabled={p.started} className="arena-choice-field"><legend>Time per side</legend><div className="arena-time-choice">{[180,300,600].map(t => <button key={t} aria-pressed={p.seconds === t} onClick={() => p.onTime(t)}>{t / 60}<small>min</small></button>)}</div>
          <label className="arena-other-time">All time controls<select aria-label="Time per side" value={p.seconds} onChange={e => p.onTime(+e.target.value)}>{[60,180,300,600,900,1800].map(t => <option key={t} value={t}>{t / 60} {t === 60 ? "minute" : "minutes"}</option>)}</select></label>
        </fieldset>
        {(!p.started || (!running && !p.finished)) && <button className="arena-start panel-start" disabled={p.working || p.finished} onClick={start}><Play size={17}/>{p.started ? "Resume practice" : "Start practice game"}<ArrowRight size={17}/></button>}
        <label className="arena-blind"><span><strong>Blindfold practice</strong><small>Train your board visualization</small></span><input type="checkbox" checked={p.blind} onChange={e => p.onBlind(e.target.checked)}/></label>
        <p className="arena-disclaimer">{["curious","learner"].includes(p.bot.style) ? "Simple training move rules, with deliberate oversights." : "Stockfish-powered training. Search strength depends on the device."} No official Elo rating is claimed.</p>
        {p.started && !p.finished && <p className="arena-locked">Start a new game to change your side, strength, or clock.</p>}

      </>}
      {tab === "moves" && <><div className="arena-panel-heading"><span className="arena-kicker">THE GAME SO FAR</span><h2>Move by move.</h2><p>Select a move to revisit that position.</p></div>
        {!p.moves.length ? <div className="arena-empty"><Swords size={27}/><strong>Your story starts with a move.</strong><p>Play your first move to start the record.</p></div> : <div className="arena-score-sheet"><div><span>#</span><span>White</span><span>Black</span></div>{Array.from({length:Math.ceil(sheet.length/2)},(_,i) => <div key={i}><span>{firstMoveNumber+i}.</span>{[sheet[i*2] ?? -1,sheet[i*2+1] ?? -1].map((n, cell) => <button key={cell} disabled={!p.moves[n]} className={p.index === n+1 ? "selected" : ""} aria-label={`View ply ${n+1}: ${p.moves[n] || "not played"}`} onClick={() => {p.onIndex(n+1);setOpen(false);}}>{p.moves[n] || "—"}</button>)}</div>)}</div>}
        <div className="arena-panel-actions"><button disabled={!p.moves.length} onClick={p.onSave}>{p.saved ? <Check size={15}/> : <Download size={15}/>} {p.saved ? "Saved to your games" : "Save to my games"}</button><button onClick={() => p.onExport("pgn")}>Export PGN</button></div>
      </>}
      {tab === "position" && <><div className="arena-panel-heading"><span className="arena-kicker">START SOMEWHERE NEW</span><h2>Bring a position.</h2><p>Continue from a legal FEN or PGN.</p></div>
        <label className="arena-import-label">Starting FEN<textarea value={fen} onChange={e => setFen(e.target.value)} placeholder="Paste a valid FEN position" rows={3}/></label><button className="arena-outline" disabled={p.started} onClick={() => p.onFen(fen)}>Load position</button>
        <label className="arena-import-label">Game PGN<textarea value={pgn} onChange={e => setPgn(e.target.value)} placeholder="1. e4 e5 2. Nf3 Nc6" rows={4}/></label><div className="arena-panel-actions"><button disabled={p.started} onClick={() => p.onPgn(pgn)}>Load PGN</button><label className={"arena-file " + (p.started ? "disabled" : "")}><Upload size={15}/> PGN file<input aria-label="Import PGN file" type="file" disabled={p.started} accept=".pgn,.txt" onChange={async e => {const f=e.target.files?.[0]; if(!f)return; if(f.size>1000000){setFileError("Choose a PGN smaller than 1 MB.");return;}try{const value=await f.text();setPgn(value);setFileError("");p.onPgn(value);}catch{setFileError("That file could not be read. Try pasting the PGN.");}e.target.value="";}}/></label></div>
        {(fileError || p.error) && <p role="alert" className="arena-error">{fileError || p.error}</p>}
        {p.started && <p className="arena-locked">Start a new game before importing a position.</p>}
        <button className="arena-export" onClick={() => p.onExport("fen")}><Download size={15}/> Export current FEN</button>
      </>}
    </div>
  </>;
  if (showBots && !p.started) return <BotPicker selected={p.bot.id} onPick={id => {p.onBot(id);setShowBots(false);}} onClose={p.onClose} onBack={() => setShowBots(false)}/>;
  return <div className="practice-arena">
    <header className="arena-heading"><div><span className="arena-kicker"><span/>LOCAL TRAINING</span><h1>Practice arena<span>.</span></h1></div><button className="arena-exit" aria-label="Leave practice" onClick={p.onClose}><X size={18}/><span>Leave practice</span></button></header>
    <div className="arena-layout">
      <section className="arena-game" aria-label="Practice game board">
        <div className="arena-match-heading"><span><Swords size={16}/>{p.bot.id === "custom" ? level : p.bot.tier} opponent <i/> {p.seconds/60} min</span><button aria-label="Open game settings" onClick={settings}><Settings2 size={17}/><span>Game settings</span></button></div>
        <div className="arena-board-frame">
          <div className={"arena-player " + (p.clock.active === bot ? "is-playing" : "")}><BotAvatar bot={p.bot}/><span className="arena-player-name"><strong>{p.bot.name}</strong><span>{p.working ? <><LoaderCircle size={11} className="arena-spin"/>Thinking…</> : `${p.bot.id === "custom" ? "Skill " + p.skill : p.bot.style} · ${p.flip ? "White" : "Black"}`}</span></span><span className="arena-clock" aria-label="Bot remaining time"><i/>{formatClock(p.clock.remaining[p.flip ? 0 : 1])}</span></div>
          <Board fen={p.fen} onMove={p.onMove} theme={p.theme} flipped={p.flip} blind={p.blind} movableColor={player} disabled={p.working || p.finished || !atEnd || (p.fen.split(" ")[1] !== player)}/>
          <div className={"arena-player " + (p.clock.active === player ? "is-playing" : "")}><span className="arena-player-avatar"><Piece type="k" color={player}/></span><span className="arena-player-name"><strong>You</strong><span>{p.flip ? "Playing Black" : "Playing White"}</span></span><span className="arena-clock" aria-label="Your remaining time"><i/>{formatClock(p.clock.remaining[p.flip ? 1 : 0])}</span></div>
        </div>
        <div className="arena-turn"><span className={"arena-turn-dot " + (p.working ? "thinking" : "")}/><strong role="status">{phase}</strong>{!atEnd && <button onClick={() => p.onIndex(p.moves.length)}>Return to live board <ArrowRight size={14}/></button>}</div>
        {p.error && <p className="arena-error" role="alert">{p.error}</p>}
        <div className="arena-game-actions">
          {(!p.started || (!running && !p.finished)) && <button className="arena-start" disabled={p.working || p.finished} onClick={start}><Play size={17}/>{p.started ? "Resume practice" : "Start practice game"}<ArrowRight size={17}/></button>}
          {p.finished && <button className="arena-start" onClick={p.onReset}><Play size={17}/>Play again<ArrowRight size={17}/></button>}
          <div className="arena-secondary-actions"><button disabled={!canTakeback} onClick={p.onTakeback}><RotateCcw size={16}/>Take back</button><button onClick={p.onReset}><Swords size={16}/>New game</button><button onClick={() => {setTab("moves"); if(mobile)setOpen(true); else panel.current?.scrollIntoView({behavior:"smooth",block:"nearest"});}}><span className="arena-move-count">{p.moves.length}</span>Moves</button></div>
        </div>
        {!!p.moves.length && <div className="arena-replay" aria-label="Move navigation"><button aria-label="First position" disabled={!p.index} onClick={() => p.onIndex(0)}><ChevronsLeft size={17}/></button><button aria-label="Previous move" disabled={!p.index} onClick={() => p.onIndex(p.index-1)}><ChevronLeft size={17}/></button><span>{p.index} / {p.moves.length}</span><button aria-label="Next move" disabled={atEnd} onClick={() => p.onIndex(p.index+1)}><ChevronRight size={17}/></button><button aria-label="Last position" disabled={atEnd} onClick={() => p.onIndex(p.moves.length)}><ChevronsRight size={17}/></button></div>}
        <p className="arena-input-hint">Drag a piece or tap a piece and its destination.</p>
      </section>
      {!mobile && <aside ref={panel} className="arena-panel" aria-label="Practice tools">{controls}</aside>}
      <div className="arena-coach-note"><BrainCircuit size={21}/><div><strong>Build the habit of thinking ahead.</strong><p>Want a little guidance between moves?</p></div>{p.onGuided && <button onClick={p.onGuided}>Try a guided game<ArrowRight size={15}/></button>}</div>
    </div>
    {mobile && <dialog ref={dialog} className="arena-dialog" aria-labelledby="arena-dialog-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={e => {if(e.target===e.currentTarget)setOpen(false);}}><div className="arena-dialog-header"><h2 id="arena-dialog-title">Your practice game</h2><button autoFocus aria-label="Close game settings" onClick={() => setOpen(false)}><X size={19}/></button></div>{controls}</dialog>}
  </div>;
}
