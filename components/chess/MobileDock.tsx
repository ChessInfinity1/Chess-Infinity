"use client";
import {useEffect,useId,useRef,useState,type CSSProperties,type PointerEvent} from "react";
import { BookOpen, House, Grid2X2, Puzzle, Swords } from "lucide-react";
import {dockIndex,dockPosition,mobileRoutes} from "../../lib/mobile-navigation";
const tabs = [
  { id: "dashboard", label: "Home", Icon: House },
  { id: "learn", label: "Learn", Icon: BookOpen },
  { id: "puzzles", label: "Puzzles", Icon: Puzzle },
  { id: "play", label: "Play", Icon: Swords },
  { id: "more", label: "More", Icon: Grid2X2 },
];
export default function MobileDock({ page, keyboardOpen, solid, moreOpen = false, onOpenMore, onNavigate }: {
  page: string; keyboardOpen: boolean; solid: boolean; moreOpen?: boolean; onOpenMore: () => void; onNavigate: (page: string) => void;
}) {
  const nav=useRef<HTMLElement>(null),gesture=useRef<{id:number;x:number;y:number;dragging:boolean}|null>(null),suppress=useRef(false),clickTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [draft,setDraft]=useState<number|null>(null);
  const active = tabs.findIndex((tab) => tab.id === (moreOpen ? "more" : page));
  function navigate(target: string) {
    if (target === "more") onOpenMore();
    else onNavigate(target);
  }
  const lens=draft??Math.max(0,active),filterId="dock-glass-"+useId().replace(/[^a-z0-9]/gi,"");
  useEffect(()=>{gesture.current=null;setDraft(null);},[page,keyboardOpen]);
  useEffect(()=>()=>{if(clickTimer.current)clearTimeout(clickTimer.current);},[]);
  function down(event:PointerEvent<HTMLElement>){if(event.button!==0||!event.isPrimary||keyboardOpen)return;suppress.current=false;gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,dragging:false};}
  function move(event:PointerEvent<HTMLElement>){const current=gesture.current;if(!current||current.id!==event.pointerId)return;const dx=event.clientX-current.x,dy=event.clientY-current.y;if(!current.dragging){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>9){gesture.current=null;return;}if(Math.abs(dx)<9)return;current.dragging=true;event.currentTarget.setPointerCapture(event.pointerId);}event.preventDefault();const box=event.currentTarget.getBoundingClientRect();setDraft(dockPosition(event.clientX,box.left+7,box.width-14));event.currentTarget.style.setProperty("--glass-x",`${Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100))}%`);}
  function up(event:PointerEvent<HTMLElement>){const current=gesture.current;if(!current||current.id!==event.pointerId)return;gesture.current=null;setDraft(null);if(!current.dragging)return;event.preventDefault();suppress.current=true;if(clickTimer.current)clearTimeout(clickTimer.current);clickTimer.current=setTimeout(()=>{suppress.current=false;},160);const box=event.currentTarget.getBoundingClientRect();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);navigate(mobileRoutes[dockIndex(event.clientX,box.left+7,box.width-14)]);}
  return <>
    <svg width="0" height="0" className="glass-filter-defs" aria-hidden="true" focusable="false"><defs><filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="1" seed="8" result="ripple"/><feDisplacementMap in="SourceGraphic" in2="ripple" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>
    <nav ref={nav} className={"liquid-dock liquid-v2 " + (keyboardOpen ? "keyboard-open " : "") + (solid ? "solid " : "") + (active < 0 && draft===null ? "no-selection " : "")+(draft!==null?"scrubbing":"")}
      aria-label="Main mobile navigation" aria-hidden={keyboardOpen||undefined} inert={keyboardOpen} style={{ "--dock-index":lens,"--glass-filter":`url("#${filterId}")` } as CSSProperties}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{gesture.current=null;setDraft(null);}} onLostPointerCapture={()=>{gesture.current=null;setDraft(null);}}>
      <span className="liquid-dock-optics" aria-hidden="true"/>
      <span className="liquid-dock-highlight" aria-hidden="true" />
      {tabs.map((t, i) => <button key={t.id} className={(draft===null?active===i:Math.round(draft)===i) ? "active" : ""} aria-current={t.id !== "more" && page === t.id ? "page" : undefined} aria-label={t.label} aria-haspopup={t.id === "more" ? "dialog" : undefined} aria-expanded={t.id === "more" ? moreOpen : undefined} aria-controls={t.id === "more" ? "academy-more" : undefined} onClick={event => {if(suppress.current){event.preventDefault();return;}navigate(t.id);}}>
        <t.Icon size={23} strokeWidth={active === i ? 2.3 : 1.9} /><span>{t.label}</span>
      </button>)}
    </nav>
  </>;
}
