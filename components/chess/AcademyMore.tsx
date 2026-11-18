"use client";

import { ChartNoAxesCombined, Cloud, Flame, Moon, ShieldCheck, Sparkles, Sun, UserRound, Zap } from "lucide-react";
import { exploreRoutes, moreRoutes, profileRoutes } from "./AcademySidebar";
import { ProfileAvatar } from "./ChessComProfile";

type Props = {
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

const featured = [
  { id: "review", label: "Game review", detail: "Analyze your games", icon: ChartNoAxesCombined },
  { id: "studio", label: "Training Studio", detail: "Build a practice session", icon: Sparkles },
];
const practice = exploreRoutes.filter(({ id }) => id !== "studio" && id !== "saved" && id !== "weekly").concat(moreRoutes);
const progressTools = exploreRoutes.filter(({ id }) => id === "weekly" || id === "saved").reverse();

export default function AcademyMore({ profile, userName, guestSignIn, isOwner, xp, streak, saveStatus, theme, onToggleTheme, onNavigate, onProfile }: Props) {
  const linked = Boolean(profile?.username);
  const name = (linked && (profile?.name?.trim() || profile?.username)) || userName || "Guest player";
  const level = Math.floor(xp / 250) + 1;
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  function route({ id, label, icon: Icon }: typeof practice[number]) {
    return (
      <button className="more-tool" key={id} onClick={() => onNavigate(id)}>
        <span className="more-tool-icon"><Icon size={19} aria-hidden="true" /></span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <section className="academy-more" aria-labelledby="academy-more-title">
      <h1 id="academy-more-title">More</h1>
      <section className="more-profile" aria-label="Your academy profile">
        <div className="more-profile-heading">
          <span className="more-avatar" aria-hidden="true">
            {linked ? <ProfileAvatar profile={profile} /> : userName?.trim().slice(0, 1).toUpperCase() || <UserRound size={24} />}
          </span>
          <div className="more-identity">
            <strong>{name}</strong>
            <span><Cloud size={14} aria-hidden="true" />{saveStatus}</span>
          </div>
        </div>
        <dl className="more-stats">
          <div><dt>Level</dt><dd>{level}</dd></div>
          <div><dt><Flame size={14} aria-hidden="true" /> Streak</dt><dd>{streak} {streak === 1 ? "day" : "days"}</dd></div>
          <div><dt><Zap size={14} aria-hidden="true" /> XP</dt><dd>{xp.toLocaleString()}</dd></div>
        </dl>
        {linked && <button className="more-profile-link" onClick={onProfile}>View Chess.com profile</button>}
        {guestSignIn && <a className="more-profile-link" href={guestSignIn.href} target="_top">{guestSignIn.label}</a>}
      </section>

      <nav className="more-feature-grid" aria-label="Featured tools">
        {featured.map(({ id, label, detail, icon: Icon }) => (
          <button className="more-feature" key={id} onClick={() => onNavigate(id)}>
            <span className="more-tool-icon"><Icon size={21} aria-hidden="true" /></span>
            <strong>{label}</strong>
            <span>{detail}</span>
          </button>
        ))}
      </nav>

      <section aria-labelledby="more-practice-title">
        <h2 id="more-practice-title">Practice tools</h2>
        <div className="more-tool-grid">{practice.map(route)}</div>
      </section>

      <section aria-labelledby="more-progress-title">
        <h2 id="more-progress-title">Your progress</h2>
        <div className="more-tool-grid">{progressTools.map(route)}</div>
      </section>

      <section aria-labelledby="more-settings-title">
        <h2 id="more-settings-title">Account &amp; app</h2>
        <div className="more-tool-grid">
          {profileRoutes.map(route)}
          <button className="more-tool" onClick={onToggleTheme}>
            <span className="more-tool-icon"><ThemeIcon size={19} aria-hidden="true" /></span>
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          {isOwner && <a className="more-tool" href="/developer">
            <span className="more-tool-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
            <span>Developer panel</span>
          </a>}
        </div>
      </section>
    </section>
  );
}
