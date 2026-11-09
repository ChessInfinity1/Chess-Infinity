"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  Infinity as InfinityIcon, X, ChevronRight, BookOpen,
  LayoutDashboard, Puzzle, Network, Swords, ChartNoAxesCombined, Sparkles,
  RefreshCw, BrainCircuit, Link2, Download, Settings, Compass, CalendarDays,
  Bookmark, Bell, ArrowUpRight, UserRound, Check, ShieldCheck,
} from "lucide-react";
import { ProfileAvatar } from "./ChessComProfile";

const mainRoutes = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "learn", label: "Learning path", icon: BookOpen },
  { id: "puzzles", label: "Puzzles", icon: Puzzle },
  { id: "play", label: "Play a bot", icon: Swords },
  { id: "review", label: "Game review", icon: ChartNoAxesCombined },
];
const exploreRoutes = [
  { id: "openings", label: "Openings", icon: Network },
  { id: "coach", label: "Training plan", icon: BrainCircuit },
  { id: "weekly", label: "Weekly report", icon: CalendarDays },
  { id: "saved", label: "Saved practice", icon: Bookmark },
];
const moreRoutes = [
  { id: "guided", label: "Guided game", icon: BrainCircuit },
  { id: "arcade", label: "Training arcade", icon: Sparkles },
  { id: "revenge", label: "Mistake Revenge", icon: RefreshCw },
  { id: "assessment", label: "Starting skill check", icon: Compass },
];
const profileRoutes = [
  { id: "connections", label: "Connected accounts", icon: Link2 },
  { id: "reminders", label: "Practice reminders", icon: Bell },
  { id: "install", label: "Install & offline", icon: Download },
  { id: "settings", label: "Preferences", icon: Settings },
];
const drawerQuery = "(max-width:760px), (max-width:1100px) and (max-height:500px) and (pointer:coarse)";

type Props = {
  sidebarRef?: RefObject<HTMLElement | null>;
  open: boolean;
  page: string;
  onClose: () => void;
  onNavigate: (page: string) => void;
  onProfile: () => void;
  profile?: { username?: string; name?: string; avatar?: string };
  userName?: string;
  xp: number;
  completed: number;
  lessonCount: number;
  isOwner?: boolean;
};

export default function AcademySidebar({ sidebarRef, open, page, onClose, onNavigate, onProfile, profile, userName, xp, completed, lessonCount, isOwner = false }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const profileId = useId();
  const profileZone = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const profilePanel = useRef<HTMLDivElement>(null);
  const linked = !!profile?.username;
  const name = (linked && (profile.name?.trim() || profile.username)) || userName || "Guest player";
  const level = Math.floor(xp / 250) + 1;
  const remaining = Math.max(0, lessonCount - completed);

  useEffect(() => {
    const media = matchMedia(drawerQuery);
    const change = () => setDrawer(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => { setProfileOpen(false); }, [open, page, drawer]);
  useEffect(() => {
    if (!profileOpen) return;
    profilePanel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!profileZone.current?.contains(event.target as Node)) {
        setProfileOpen(false);
        if (profilePanel.current?.contains(document.activeElement)) profileButton.current?.focus({ preventScroll: true });
      }
    };
    const focus = (event: FocusEvent) => {
      if (!profileZone.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setProfileOpen(false);
      profileButton.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("keydown", escape, true);
    };
  }, [profileOpen]);

  function closeProfile() {
    setProfileOpen(false);
    profileButton.current?.focus({ preventScroll: true });
  }
  function navigate(target: string) {
    setProfileOpen(false);
    onNavigate(target);
  }
  function route(item: typeof mainRoutes[number], index: number) {
    return <button key={item.id} className={"modern-nav-link " + (page === item.id ? "is-current" : "")} style={{ "--nav-order": index } as CSSProperties} aria-current={page === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>
      <item.icon size={19} aria-hidden="true" />
      <span>{item.label}</span>
      {item.id === "learn" && <small className="modern-lesson-count" aria-label={`${remaining} lessons remaining`}>{remaining}</small>}
      {page === item.id && item.id !== "learn" && <span className="modern-current-dot" aria-hidden="true" />}
    </button>;
  }

  return <aside ref={sidebarRef} id="academy-navigation" role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Academy navigation" inert={drawer && !open} className={"sidebar modern-sidebar " + (open ? "open" : "")}>
    <header className="modern-side-header">
      <button className="modern-brand" aria-label="Chess Infinity home" onClick={() => navigate("dashboard")}><span><InfinityIcon size={27} /></span><span>chess<span>infinity</span><small>YOUR CHESS, FORWARD.</small></span></button>
      <button className="mobile-close icon-btn modern-close" aria-label="Close navigation" onClick={onClose}><X size={20}/></button>
    </header>
    <div className="modern-side-scroll">
      <nav className="modern-nav-group" aria-label="Your academy"><h2>Your academy</h2>{mainRoutes.map(route)}</nav>
      <nav className="modern-nav-group" aria-label="Explore"><h2>Explore</h2>{exploreRoutes.map(route)}</nav>
      <details className="modern-more-training" open={moreRoutes.some(item => item.id === page) || undefined}>
        <summary><Sparkles size={18}/><span>More training</span><ChevronRight size={16}/></summary>
        <nav aria-label="More training">{moreRoutes.map(route)}</nav>
      </details>
      <button className="modern-reminder-link" onClick={() => navigate("reminders")}><Bell size={17}/><span>A little practice, regularly.</span><ArrowUpRight size={14}/></button>
      {isOwner && <a className="modern-nav-link" href="/developer"><ShieldCheck size={19}/><span>Developer panel</span><ArrowUpRight size={14}/></a>}
    </div>
    <footer className="modern-side-footer">
      <div className="modern-profile-zone" ref={profileZone} onKeyDown={event => {
        if (event.key === "Escape" && profileOpen) { event.preventDefault(); event.stopPropagation(); closeProfile(); }
      }}>
        <button ref={profileButton} className="modern-profile-dot" aria-label={`Open your profile${linked ? `: ${name}` : ""}`} title="Your profile" aria-haspopup="dialog" aria-expanded={profileOpen} aria-controls={profileId} onClick={() => setProfileOpen(value => !value)}>
          {linked ? <ProfileAvatar profile={profile} /> : <span className="modern-guest-avatar">{userName?.slice(0,1).toUpperCase() || <UserRound size={21}/>}</span>}
          {linked && <i aria-hidden="true" />}
        </button>
        <div ref={profilePanel} id={profileId} role="dialog" aria-label="Your profile" aria-hidden={!profileOpen} inert={!profileOpen} className={"modern-profile-popup " + (profileOpen ? "is-open" : "")}>
          <div className="modern-popup-top"><span>Your space</span><button className="icon-btn" aria-label="Close your profile" onClick={closeProfile}><X size={17}/></button></div>
          <div className="modern-popup-identity">{linked ? <ProfileAvatar profile={profile} /> : <span className="modern-guest-avatar"><UserRound size={22}/></span>}<div><strong>{name}</strong><small>{linked ? `@${profile.username}` : "Your personal academy"}</small></div></div>
          {linked && <span className="modern-popup-linked"><Check size={13}/> Chess.com public profile</span>}
          <div className="modern-popup-stats"><div><strong>{level}</strong><small>Training level</small></div><div><strong>{xp.toLocaleString()}</strong><small>Training XP</small></div></div>
          <div className="modern-popup-progress"><span>{completed} of {lessonCount} lessons completed</span><div role="progressbar" aria-label="Completed lessons" aria-valuemin={0} aria-valuemax={lessonCount} aria-valuenow={Math.min(completed,lessonCount)}><i style={{width:`${lessonCount ? Math.min(100,completed/lessonCount*100) : 0}%`}}/></div></div>
          {linked && <button className="modern-view-profile" onClick={() => { setProfileOpen(false); onProfile(); }}>View chess profile<ArrowUpRight size={15}/></button>}
          <div className="modern-popup-links">{profileRoutes.map(item => <button key={item.id} onClick={() => navigate(item.id)}><item.icon size={17}/><span>{item.label}</span><ChevronRight size={13}/></button>)}</div>
        </div>
      </div>
      <div className="modern-footer-progress"><div><strong>Level {level}</strong><span>{xp.toLocaleString()} XP</span></div><div role="progressbar" aria-label="Progress to next training level" aria-valuemin={0} aria-valuemax={250} aria-valuenow={xp % 250}><i style={{width:`${(xp % 250)/2.5}%`}}/></div></div>
      <button className="modern-footer-settings icon-btn" aria-label="Open preferences" onClick={() => navigate("settings")}><Settings size={19}/></button>
    </footer>
  </aside>;
}
