"use client";
import type { CSSProperties } from "react";
import { BookOpen, LayoutDashboard, Network, Puzzle, Swords } from "lucide-react";
const tabs = [
  { id: "dashboard", label: "Home", Icon: LayoutDashboard },
  { id: "learn", label: "Learn", Icon: BookOpen },
  { id: "puzzles", label: "Puzzles", Icon: Puzzle },
  { id: "openings", label: "Openings", Icon: Network },
  { id: "play", label: "Play", Icon: Swords },
];
export default function MobileDock({ page, keyboardOpen, solid, onNavigate }: {
  page: string; keyboardOpen: boolean; solid: boolean; onNavigate: (page: string) => void;
}) {
  const active = tabs.findIndex((t) => t.id === page);
  return <>
    <nav className={"liquid-dock " + (keyboardOpen ? "keyboard-open " : "") + (solid ? "solid " : "") + (active < 0 ? "no-selection" : "")}
      aria-label="Main mobile navigation" style={{ "--dock-index": Math.max(0, active) } as CSSProperties}>
      <span className="liquid-dock-highlight" aria-hidden="true" />
      {tabs.map((t, i) => <button key={t.id} className={active === i ? "active" : ""} aria-current={page === t.id ? "page" : undefined} onClick={() => onNavigate(t.id)}>
        <t.Icon size={23} strokeWidth={active === i ? 2.3 : 1.9} /><span>{t.label}</span>
      </button>)}
    </nav>
  </>;
}
