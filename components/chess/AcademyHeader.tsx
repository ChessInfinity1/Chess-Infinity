"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Cloud, CloudOff, Download, EllipsisVertical, Flame, Infinity as InfinityIcon, Moon, Settings, Sun, Zap } from "lucide-react";
import ScreenMode from "./ScreenMode";

type Props = {
  title: string;
  sidebarOpen: boolean;
  onOpenNavigation: () => void;
  theme: string;
  onToggleTheme: () => void;
  streak: number;
  xp: number;
  saveStatus: string;
  onNavigate: (page: string) => void;
};

export default function AcademyHeader({ title, sidebarOpen, onOpenNavigation, theme, onToggleTheme, streak, xp, saveStatus, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const actions = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [title, sidebarOpen]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function outside(event: PointerEvent) {
      if (!actions.current?.contains(event.target as Node)) setOpen(false);
    }
    function keys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    function focus(event: FocusEvent) {
      if (!actions.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keys);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keys);
      document.removeEventListener("focusin", focus);
    };
  }, [open]);

  function navigate(page: string) {
    setOpen(false);
    trigger.current?.focus();
    onNavigate(page);
  }

  return (
    <header className="academy-topbar">
      <div className="academy-header-leading">
        <button className="academy-header-circle academy-header-menu" aria-label="Open navigation" aria-controls="academy-navigation" aria-expanded={sidebarOpen} aria-haspopup="dialog" onClick={onOpenNavigation}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14M5 15h9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
        <button className="academy-header-circle academy-header-home" aria-label="Go to academy home" onClick={() => onNavigate("dashboard")}><InfinityIcon size={24} /></button>
      </div>
      <div className="academy-header-title" title={title}>{title}</div>
      <div className="academy-header-actions" ref={actions}>
        <div className="academy-action-capsule">
          <button aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={onToggleTheme}>
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <button ref={trigger} aria-label="Academy actions" aria-expanded={open} aria-controls={panelId} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}><EllipsisVertical /></button>
        </div>
        {open && (
          <div className="academy-actions-panel" id={panelId} ref={panel} role="dialog" aria-label="Academy actions">
            <div className="academy-actions-heading">Your momentum</div>
            <div className="academy-header-stats">
              <div><Flame /><strong>{streak}</strong><span>day streak</span></div>
              <div><Zap /><strong>{xp.toLocaleString()}</strong><span>training XP</span></div>
            </div>
            <div className="academy-header-save">{saveStatus.includes("Offline") || saveStatus.includes("Guest") ? <CloudOff /> : <Cloud />}<span>{saveStatus}</span></div>
            <div className="academy-header-links">
              <ScreenMode label />
              <button onClick={() => navigate("install")}><Download /><span>Install & offline</span></button>
              <button onClick={() => navigate("settings")}><Settings /><span>Preferences</span></button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
