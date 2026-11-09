"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, Database, Infinity as InfinityIcon, LayoutDashboard, LoaderCircle, LogOut, Puzzle, RefreshCw, Search, Server, ShieldCheck, Users, X } from "lucide-react";
import type { DeveloperAudit, DeveloperDetail, DeveloperOverview, DeveloperUser } from "../../lib/developer-types";
import "./developer.css";

type Tab = "overview" | "accounts" | "activity" | "system";
const tabs = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "accounts" as const, label: "Accounts", icon: Users },
  { id: "activity" as const, label: "Activity log", icon: Activity },
  { id: "system" as const, label: "System", icon: Server },
];
const number = (value: number) => new Intl.NumberFormat().format(value);
const date = (value: string | number | null, time = false) => value
  ? new Date(value).toLocaleString(undefined, time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }) : "Not yet saved";
const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;

class AccessError extends Error {}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/developer/${path}`, { cache: "no-store", credentials: "same-origin", ...options });
  const data: unknown = await response.json().catch(() => null);
  const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
  if (response.status === 401 || response.status === 403) throw new AccessError(message || "Your developer session has ended.");
  if (!response.ok) throw new Error(message || "Couldn’t load this information. Please retry.");
  return data as T;
}

function Avatar({ name }: { name: string }) {
  return <span className="dev-avatar" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "?"}</span>;
}

export default function DeveloperPanel({ ownerName }: { ownerName: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<DeveloperOverview | null>(null);
  const [accounts, setAccounts] = useState<{ users: DeveloperUser[]; total: number; page: number; limit: number } | null>(null);
  const [audit, setAudit] = useState<DeveloperAudit[]>([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(true);
  const [usersBusy, setUsersBusy] = useState(true);
  const [auditBusy, setAuditBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeveloperDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailBusy, setDetailBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const fail = useCallback((cause: unknown) => {
    if (cause instanceof Error && cause.name === "AbortError") return;
    if (cause instanceof AccessError) {
      setLocked(true); setOverview(null); setAccounts(null); setAudit([]); setDetail(null); setSelected(null);
    }
    setError(cause instanceof Error ? cause.message : "Please try again.");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError("");
    api<DeveloperOverview>("overview", { signal: controller.signal }).then(setOverview).catch(fail).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [refresh, fail]);
  useEffect(() => {
    const controller = new AbortController();
    setUsersBusy(true);
    api<NonNullable<typeof accounts>>(`users?page=${page}&q=${encodeURIComponent(filter)}`, { signal: controller.signal }).then(setAccounts).catch(fail).finally(() => { if (!controller.signal.aborted) setUsersBusy(false); });
    return () => controller.abort();
  }, [page, filter, refresh, fail]);
  useEffect(() => {
    if (tab !== "activity") return;
    const controller = new AbortController();
    setAuditBusy(true);
    api<{ events: DeveloperAudit[] }>("audit", { signal: controller.signal }).then(data => setAudit(data.events)).catch(fail).finally(() => { if (!controller.signal.aborted) setAuditBusy(false); });
    return () => controller.abort();
  }, [tab, refresh, fail]);
  useEffect(() => {
    if (!selected || locked) return;
    const controller = new AbortController();
    setDetail(null); setDetailError(""); setDetailBusy(true); setNotice("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    api<DeveloperDetail>(`user?id=${encodeURIComponent(selected)}`, { signal: controller.signal }).then(setDetail).catch(cause => {
      if (controller.signal.aborted) return;
      if (cause instanceof AccessError) fail(cause);
      else setDetailError(cause instanceof Error ? cause.message : "Please retry.");
    }).finally(() => { if (!controller.signal.aborted) setDetailBusy(false); });
    return () => { controller.abort(); document.body.style.overflow = previousOverflow; };
  }, [selected, locked, fail]);

  function search(event: FormEvent) { event.preventDefault(); setPage(1); setFilter(draft.trim()); }
  async function revoke() {
    if (!detail || detail.isOwner || actionBusy) return;
    if (!window.confirm(`Sign ${detail.name} out on every device? Their account and saved progress will remain. They can sign in again with their password.`)) return;
    setActionBusy(true); setDetailError(""); setNotice("");
    try {
      const result = await api<{ revoked: number }>("revoke-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: detail.id }) });
      setDetail(current => current ? { ...current, activeSessions: 0 } : null);
      setNotice(`${result.revoked} session${result.revoked === 1 ? "" : "s"} ended. Saved progress is intact.`);
      setRefresh(value => value + 1);
    } catch (cause) {
      if (cause instanceof AccessError) fail(cause);
      else setDetailError(cause instanceof Error ? cause.message : "Please retry.");
    } finally { setActionBusy(false); }
  }
  const signupDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setUTCDate(day.getUTCDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return { day: key, count: overview?.signups.find(item => item.day === key)?.count || 0 };
  });
  const maxSignups = Math.max(1, ...signupDays.map(item => item.count));

  return <main className="developer-panel">
    <div className="dev-shell">
      <header className="dev-header">
        <a href="/" className="dev-brand" aria-label="Chess Infinity home"><span><InfinityIcon size={26}/></span><strong>chess<span>infinity</span></strong></a>
        <div className="dev-header-right"><span className="dev-owner-badge"><ShieldCheck size={14}/>Owner workspace</span><a href="/" className="dev-return"><ArrowLeft size={16}/><span>Back to academy</span></a></div>
      </header>
      <section className="dev-intro"><div><span className="dev-eyebrow">BEHIND THE BOARD</span><h1>Your academy.<br className="dev-mobile-break"/> A little closer.</h1><p>Welcome, {ownerName}. See your learners, understand activity, and keep things running.</p></div><button className="dev-button" disabled={busy || usersBusy || locked} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} className={busy ? "dev-spin" : ""}/>Refresh data</button></section>
      <nav className="dev-tabs" aria-label="Developer sections">{tabs.map(item => <button key={item.id} onClick={() => { setTab(item.id); if (item.id === "overview") { setFilter(""); setDraft(""); setPage(1); } }} aria-current={tab === item.id ? "page" : undefined}><item.icon size={17}/>{item.label}{item.id === "accounts" && overview && <small>{number(overview.totalAccounts)}</small>}</button>)}</nav>
      {error && <div className="dev-alert" role="alert"><ShieldCheck size={18}/><div><strong>{locked ? "Developer access required" : "Couldn’t refresh your data"}</strong><p>{error}</p>{locked ? <a href="/login?return_to=%2Fdeveloper">Sign in again <ArrowRight size={14}/></a> : <button onClick={() => setRefresh(value => value + 1)}>Try again</button>}</div></div>}
      {!locked && <>
        {tab === "overview" && <>
          <div className="dev-stats" aria-busy={busy}>
            {[
              { title: "Academy accounts", value: overview?.totalAccounts, text: `${overview?.newAccounts7d || 0} joined in the past 7 days`, icon: Users },
              { title: "Saved in the past 7 days", value: overview?.recentSaves, text: "Accounts with a recent cloud save", icon: Activity },
              { title: "Lessons completed", value: overview?.completedLessons, text: "Across saved learner profiles", icon: BookOpen },
              { title: "Puzzle attempts", value: overview?.puzzleAttempts, text: "Recorded in saved progress", icon: Puzzle },
            ].map(item => <section className="dev-stat" key={item.title}><div><span>{item.title}</span><item.icon size={19}/></div><strong>{item.value === undefined ? "—" : number(item.value)}</strong><p>{item.text}</p></section>)}
          </div>
          <div className="dev-overview-grid">
            <section className="dev-card"><div className="dev-card-heading"><div><span className="dev-eyebrow">A GROWING COMMUNITY</span><h2>New learners</h2></div><span className="dev-subtle">Last 7 UTC days</span></div>
              {overview ? <div className="dev-chart" aria-label="New accounts by day">{signupDays.map(item => <div key={item.day}><strong>{item.count}</strong><span className="dev-bar-track"><i style={{ height: `${Math.max(2, item.count / maxSignups * 100)}%` }}/></span><small>{new Date(item.day + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}</small></div>)}</div> : <div className="dev-loading"><LoaderCircle className="dev-spin" size={20}/>Loading signups…</div>}
            </section>
            <section className="dev-card dev-health-card"><span className="dev-eyebrow">THE FOUNDATIONS</span><h2>Ready for the next move.</h2><p>Live checks and saved activity from your Academy database.</p><div className="dev-health-row"><span><Database size={17}/>D1 database</span><strong className={overview ? "dev-green" : ""}>{overview ? <><Check size={14}/>Connected</> : "Checking…"}</strong></div><div className="dev-health-row"><span><ShieldCheck size={17}/>Owner session</span><strong className={overview ? "dev-green" : ""}>{overview ? "Authenticated" : "Checking…"}</strong></div><div className="dev-health-row"><span><Activity size={17}/>Active sessions</span><strong>{overview ? number(overview.activeSessions) : "—"}</strong></div><button className="dev-text-link" onClick={() => setTab("system")}>View system details<ArrowUpRight size={16}/></button></section>
          </div>
        </>}
        {(tab === "overview" || tab === "accounts") && <section className="dev-card dev-accounts-card">
          <div className="dev-card-heading"><div><span className="dev-eyebrow">YOUR PEOPLE</span><h2>{tab === "overview" ? "Latest accounts" : "Learner accounts"}</h2></div>{tab === "overview" ? <button className="dev-text-link" onClick={() => { setTab("accounts"); setFilter(""); setDraft(""); setPage(1); }}>View all<ArrowRight size={16}/></button> : <span className="dev-subtle">{accounts ? `${number(accounts.total)} result${accounts.total === 1 ? "" : "s"}` : "Loading…"}</span>}</div>
          {tab === "accounts" && <form className="dev-search" onSubmit={search}><Search size={18}/><input aria-label="Search accounts by name or email" placeholder="Search name or email…" value={draft} onChange={event => setDraft(event.target.value)} maxLength={100}/>{(draft || filter) && <button type="button" aria-label="Clear account search" onClick={() => { setDraft(""); setFilter(""); setPage(1); }}><X size={16}/></button>}<button type="submit">Search</button></form>}
          {usersBusy ? <div className="dev-loading" role="status"><LoaderCircle size={21} className="dev-spin"/>Loading accounts…</div> : accounts?.users.length ? <div className="dev-table-wrap"><table className="dev-table"><thead><tr><th>Learner</th><th>Joined</th><th>Last cloud save</th><th>Training</th><th><span className="dev-sr-only">Details</span></th></tr></thead><tbody>{(tab === "overview" ? accounts.users.slice(0, 6) : accounts.users).map(account => <tr key={account.id}><td><button className="dev-person" onClick={() => setSelected(account.id)}><Avatar name={account.name}/><span><strong>{account.name}{account.isOwner && <small className="dev-mini-badge">Owner</small>}</strong><small>{account.email}</small></span></button></td><td>{date(account.createdAt)}</td><td>{date(account.lastSaveAt)}</td><td><strong>{number(account.xp)} XP</strong><small>{account.lessons} lessons · {account.puzzleAttempts} puzzles</small></td><td><button className="dev-row-open" aria-label={`View account for ${account.name}`} onClick={() => setSelected(account.id)}><ChevronRight size={18}/></button></td></tr>)}</tbody></table></div> : <div className="dev-empty"><Users size={28}/><h3>{filter ? "No matching accounts" : "Your learners will appear here"}</h3><p>{filter ? "Try another name or email address." : "Academy accounts appear when people register. Guest practice stays on their devices."}</p></div>}
          {tab === "accounts" && accounts && <div className="dev-pagination"><span>Page {page} of {Math.max(1, Math.ceil(accounts.total / accounts.limit))}</span><div><button className="dev-button" disabled={page <= 1 || usersBusy} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/>Previous</button><button className="dev-button" disabled={page * accounts.limit >= accounts.total || usersBusy} onClick={() => setPage(value => value + 1)}>Next<ChevronRight size={16}/></button></div></div>}
        </section>}
        {tab === "activity" && <section className="dev-card"><div className="dev-card-heading"><div><span className="dev-eyebrow">A CLEAR RECORD</span><h2>Developer activity</h2></div><span className="dev-subtle">Latest 50 actions</span></div><p className="dev-section-copy">Security actions are recorded here. Learners’ private game contents and passwords are never included.</p>{auditBusy ? <div className="dev-loading"><LoaderCircle className="dev-spin" size={20}/>Loading activity…</div> : audit.length ? <ul className="dev-audit-list">{audit.map(event => <li key={event.id}><span className="dev-audit-icon"><LogOut size={19}/></span><div><strong>Ended sessions for {event.targetName || "an account"}</strong><span>{date(event.createdAt, true)}</span></div><span className="dev-mini-badge">Recorded</span></li>)}</ul> : <div className="dev-empty"><ShieldCheck size={30}/><h3>A clean slate.</h3><p>Session sign-outs performed from this panel will appear here.</p></div>}</section>}
        {tab === "system" && <section className="dev-card"><div className="dev-card-heading"><div><span className="dev-eyebrow">UNDER THE SURFACE</span><h2>System & storage</h2></div><span className="dev-status-pill"><span/>{overview ? "Connected" : "Checking"}</span></div><div className="dev-system-grid">{[
          ["Database", overview ? "Cloudflare D1 · connected" : "Checking…"],
          ["Authentication", overview ? "Signed account sessions" : "Checking…"],
          ["Developer access", "One provisioned account ID"],
          ["Cloud profiles", overview ? number(overview.savedProfiles) : "—"],
          ["Saved game records", overview ? number(overview.savedGames) : "—"],
          ["Progress payload storage", overview ? bytes(overview.progressBytes) : "—"],
          ["Chess engine", "Stockfish in browser workers"],
          ["Last checked", overview ? date(overview.checkedAt, true) : "—"],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="dev-info"><ShieldCheck size={20}/><p>This panel shows Academy accounts and cloud-saved summaries. Guests, unsynced device activity, and original-site accounts are not included. Training XP is separate from external chess ratings.</p></div></section>}
        <footer className="dev-footer"><span><ShieldCheck size={14}/>Access checked on every request</span><span>{overview ? `Updated ${date(overview.checkedAt, true)}` : "Waiting for live data"}</span></footer>
      </>}
    </div>
    {selected && !locked && <dialog ref={dialog} className="dev-dialog" aria-labelledby="dev-account-title" onClose={() => { setSelected(null); setDetail(null); }} onClick={event => { if (event.target === event.currentTarget && !actionBusy) dialog.current?.close(); }} onCancel={event => { if (actionBusy) event.preventDefault(); }}>
      <div className="dev-dialog-heading"><span className="dev-eyebrow">ACCOUNT DETAILS</span><button className="dev-row-open" aria-label="Close account details" disabled={actionBusy} onClick={() => dialog.current?.close()}><X size={20}/></button></div>
      {!detail && <h2 id="dev-account-title" className="dev-sr-only">Account details</h2>}
      {detailBusy && <div className="dev-loading"><LoaderCircle className="dev-spin" size={22}/>Loading account…</div>}
      {detailError && <div className="dev-alert" role="alert">{detailError}</div>}
      {detail && <><div className="dev-detail-person"><Avatar name={detail.name}/><div><h2 id="dev-account-title">{detail.name}</h2><p>{detail.email}</p></div>{detail.isOwner && <span className="dev-owner-badge"><ShieldCheck size={14}/>Owner</span>}</div>
        <div className="dev-detail-stats"><div><strong>{number(detail.xp)}</strong><span>Training XP</span></div><div><strong>{number(detail.lessons)}</strong><span>Lessons</span></div><div><strong>{number(detail.puzzleAttempts)}</strong><span>Puzzle attempts</span></div></div>
        <dl className="dev-detail-list">{[
          ["Joined", date(detail.createdAt, true)], ["Last cloud save", date(detail.lastSaveAt, true)],
          ["Progress version", String(detail.saveVersion)], ["Active sessions", String(detail.activeSessions)],
          ["Puzzles correct", `${detail.correctPuzzles} / ${detail.puzzleAttempts}`], ["Training puzzle rating", String(detail.puzzleRating)],
          ["Saved games / reviews", `${detail.games} / ${detail.analyses}`], ["Goal", detail.goal || "Not set"],
          ["Chess.com public profile", detail.chesscom ? `@${detail.chesscom}` : "Not linked"], ["Lichess profile", detail.lichess ? `@${detail.lichess}` : "Not linked"],
          ["Progress payload", bytes(detail.progressBytes)], ["Email verification", detail.emailVerified ? "Verified" : "Not verified"],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {notice && <p className="dev-notice" role="status"><Check size={17}/>{notice}</p>}
        {!detail.isOwner && <section className="dev-session-action"><div><h3>Sign out all devices</h3><p>Ends this learner’s sessions. Their account and saved progress stay intact.</p></div><button className="dev-button" disabled={actionBusy || detail.activeSessions === 0} onClick={revoke}>{actionBusy ? <LoaderCircle className="dev-spin" size={16}/> : <LogOut size={16}/>}Sign out sessions</button></section>}
      </>}
    </dialog>}
  </main>;
}
