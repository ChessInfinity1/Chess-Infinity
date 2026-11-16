"use client";
import { Chess } from "chess.js";
import { Check, Palette, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { boardPalettes, colorThemes, pieceStyles, normalizeAppearance } from "../../lib/chess/appearance";
import type { Progress } from "../../lib/chess/content";
import Board from "./Board";
import { Piece } from "./Piece";

export type AppearanceChange = Partial<Pick<Progress,"theme"|"colorTheme"|"boardTheme"|"pieceStyle"|"dockStyle"|"explainMoves">>;
export default function AppearanceChoices({progress,onChange}:{progress:Progress;onChange:(change:AppearanceChange)=>void}) {
  const selected=normalizeAppearance(progress);
  const pieces=["k","q","r","b","n","p"];
  return <>
    <fieldset className="preference-field"><legend>Color theme</legend><p>Six looks, each with a light and a dark mode. Mix them with any board and piece set.</p>
      <div className="appearance-theme-grid">{colorThemes.map(theme=><label className="appearance-theme-choice" key={theme.id} style={{"--look-accent":theme.accent,"--look-bg":selected.theme==="dark"?theme.dark:theme.light} as CSSProperties}>
        <input type="radio" name="academy-color-theme" aria-label={theme.name+" color theme"} checked={selected.colorTheme===theme.id} onChange={()=>onChange({colorTheme:theme.id})}/>
        <span className="appearance-theme-scene" aria-hidden="true"><i/><span><b/><b/><b/></span><em/></span>
        <span className="appearance-choice-label"><span><strong>{theme.name}</strong><small>{theme.description}</small></span><span className="choice-check"><Check size={13}/></span></span>
      </label>)}</div>
    </fieldset>
    <div className="appearance-lab"><div className="appearance-options">
      <fieldset className="preference-field"><legend>Board palette</legend><p>Nine palettes for the board, independent of your app colors.</p><div className="appearance-board-grid">{boardPalettes.map(palette=><label className="board-palette-choice" key={palette.id}>
        <input type="radio" name="academy-board" aria-label={palette.name+" board"} checked={selected.boardTheme===palette.id} onChange={()=>onChange({boardTheme:palette.id})}/>
        <span className="palette-swatch" style={{background:`conic-gradient(${palette.dark} 25%, ${palette.light} 0 50%, ${palette.dark} 0 75%, ${palette.light} 0)`}} aria-hidden="true"/><span>{palette.name}</span><span className="choice-check"><Check size={13}/></span>
      </label>)}</div></fieldset>
      <fieldset className="preference-field"><legend>Chess pieces</legend><p>A different shape for every style of play. Both colors are shown below.</p><div className="appearance-piece-grid">{pieceStyles.map(style=><label className="appearance-piece-choice" key={style.id}>
        <input type="radio" name="academy-pieces" aria-label={style.name+" pieces"} checked={selected.pieceStyle===style.id} onChange={()=>onChange({pieceStyle:style.id})}/>
        <span className="appearance-piece-sample" aria-hidden="true">{pieces.map((type,i)=><span key={type}><Piece type={type} color={i%2===0?"w":"b"} style={style.id}/></span>)}</span>
        <span className="appearance-choice-label"><span><strong>{style.name}</strong><small>{style.description}</small></span><span className="choice-check"><Check size={13}/></span></span>
      </label>)}</div></fieldset>
      <fieldset className="preference-field"><legend>Mobile navigation</legend><p>The bottom dock on your phone.</p><div className="dock-choice-group">{[{value:"glass" as const,name:"Soft glass"},{value:"solid" as const,name:"High contrast"}].map(item=><label key={item.value}><input type="radio" name="academy-dock" checked={(progress.dockStyle||"glass")===item.value} onChange={()=>onChange({dockStyle:item.value})}/><span>{item.name}</span></label>)}</div></fieldset>
      <button className="text-btn appearance-reset" onClick={()=>onChange({theme:"light",colorTheme:"violet",boardTheme:"violet",pieceStyle:"classic",dockStyle:"glass"})}><RotateCcw size={16}/>Restore the original look</button>
    </div><aside className="appearance-live-board"><div className="appearance-preview-heading"><Palette size={17}/><strong>Your next board</strong></div><div className="preference-board-preview"><div aria-hidden="true" inert><Board fen={new Chess().fen()} theme={selected.boardTheme} onMove={()=>{}} disabled/></div><span><span className="fresh-dot"/> Live preview</span></div><p>{boardPalettes.find(item=>item.id===selected.boardTheme)!.name} · {pieceStyles.find(item=>item.id===selected.pieceStyle)!.name} pieces</p><small>Applies to play, lessons, puzzles, review, and promotion choices. Your selections save automatically.</small></aside></div>
  </>;
}
