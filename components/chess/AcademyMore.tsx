"use client";

import { useEffect, useRef } from "react";
import { ChartNoAxesCombined, Moon, ShieldCheck, Sun, UserRound, X } from "lucide-react";
import { exploreRoutes, moreRoutes, profileRoutes } from "./AcademySidebar";
import { ProfileAvatar } from "./ChessComProfile";

type Props = {
  open: boolean;
  onClose: () => void;
  profile?: { username?: string; name?: string; avatar?: string };
  userName?: string;
  guestSignIn?: { href: string; label: string };
  isOwner?: boolean;
  xp: number;
  streak: number;
  saveStatus: string;
  theme: string;
  onToggleTheme: () => void;
  onNavigate: (page: string) => void;
  onProfile: () => void;
};

const practice = [
  { id: "review", label: "Game review", icon: ChartNoAxesCombined },
  ...exploreRoutes.filter(({ id }) => id !== "saved" && id !== "weekly"),
  ...moreRoutes,
];
const progressTools = exploreRoutes.filter(({ id }) => id === "weekly" || id === "saved").reverse();

export default function AcademyMore({
  open, onClose, profile, userName, guestSignIn, isOwner, xp, streak, saveStatus, theme, onToggleTheme, onNavigate, onProfile,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const linked = Boolean(profile?.username);
  const name = (linked && (profile?.name?.trim() || profile?.username)) || userName || "Guest player";
  const level = Math.floor(xp / 250) + 1;
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  useEffect(() => {
    const sheet = dialog.current;
    if (!sheet) return;
    if (open && !sheet.open) sheet.showModal();
    if (!open && sheet.open) sheet.close();
  }, [open]);

  function route({ id, label, icon: Icon }: typeof practice[number]) {
    return (
      <button className="more-tool" key={id} onClick={() => onNavigate(id)}>
        <span className="more-tool-icon"><Icon size={21} aria-hidden="true" /></span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <dialog
      ref={dialog}
      id="academy-more"
      className="academy-more"
      aria-labelledby="academy-more-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="more-sheet">
        <header className="more-sheet-header">
          <h2 id="academy-more-title">More</h2>
          <button autoFocus className="more-close" aria-label="Close More" onClick={onClose}><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="more-sheet-scroll">
          <section aria-labelledby="more-practice-title">
            <h3 id="more-practice-title">Training</h3>
            <div className="more-tool-grid">{practice.map(route)}</div>
          </section>

          <section aria-labelledby="more-settings-title">
            <h3 id="more-settings-title">Progress &amp; settings</h3>
            <div className="more-tool-grid">
              {progressTools.map(route)}
              {profileRoutes.map(route)}
              <button className="more-tool" onClick={onToggleTheme}>
                <span className="more-tool-icon"><ThemeIcon size={21} aria-hidden="true" /></span>
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
              {isOwner && <a className="more-tool" href="/developer">
                <span className="more-tool-icon"><ShieldCheck size={21} aria-hidden="true" /></span>
                <span>Developer panel</span>
              </a>}
            </div>
          </section>

          <section className="more-profile" aria-label="Your academy profile">
            <span className="more-avatar" aria-hidden="true">
              {linked ? <ProfileAvatar profile={profile} /> : userName?.trim().slice(0, 1).toUpperCase() || <UserRound size={22} />}
            </span>
            <div className="more-identity">
              <strong>{name}</strong>
              <span>Level {level} · {xp.toLocaleString()} XP · {streak}-day streak</span>
              <span>{saveStatus}</span>
            </div>
            {linked && <button className="more-profile-link" onClick={onProfile}>View Chess.com profile</button>}
            {guestSignIn && <a className="more-profile-link" href={guestSignIn.href} target="_top">{guestSignIn.label}</a>}
          </section>
        </div>
      </div>
    </dialog>
  );
}
