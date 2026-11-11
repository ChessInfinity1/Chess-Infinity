"use client";
import { useAnimatedPresence } from "../../hooks/use-academy-motion";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  UserRound,
  Globe,
  CalendarDays,
  Users,
  Clock,
  Swords,
  Search,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import {
  ImportedGame,
  playerResult,
  publicUrl,
  chessComUrl,
  profileCountry,
} from "../../lib/chess/imported-games";
export function ProfileAvatar({
  profile,
  size = "normal",
}: {
  profile: any;
  size?: "normal" | "large" | "small";
}) {
  const [broken, setBroken] = useState(false);
  const url = publicUrl(profile?.avatar);
  useEffect(() => setBroken(false), [url]);
  return (
    <span className={"chesscom-avatar " + size}>
      {url && !broken ? (
        <img
          src={url}
          alt={`${profile.username}'s Chess.com profile picture`}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <UserRound aria-label="No public profile picture" />
      )}
    </span>
  );
}
const controls: Record<string, string> = {
  chess_rapid: "Rapid",
  chess_blitz: "Blitz",
  chess_bullet: "Bullet",
  chess_daily: "Daily",
  chess960_daily: "Chess960 daily",
  chess960_rapid: "Chess960 rapid",
  chess960_blitz: "Chess960 blitz",
  chess960_bullet: "Chess960 bullet",
};
function date(seconds: number | undefined) {
  return seconds
    ? new Date(seconds * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not published";
}
export default function ChessComProfile({
  open,
  account,
  games,
  onClose,
  onAnalyze,
  onLoadMore,
  onSync,
  syncing,
  syncStatus,
  syncError,
  onStopSync,
}: {
  open: boolean;
  account: any;
  games: ImportedGame[];
  onClose: () => void;
  onAnalyze: (game: ImportedGame) => void;
  onLoadMore: (cursor?: string) => Promise<{
    games: ImportedGame[];
    nextCursor: string | null;
    archiveCount?: number;
  }>;
  onSync: (all?: boolean) => void;
  syncStatus: string;
  syncError: string;
  onStopSync: () => void;
  syncing: boolean;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("overview");
  const loaded = games;
  const cursor = account.nextCursor;
  const [visibleLimit, setVisibleLimit] = useState(40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (syncing) setError(""); }, [syncing]);
  const [query, setQuery] = useState("");
  const [speed, setSpeed] = useState("all");
  const [result, setResult] = useState("all");
  const profile = account.profile || {};
  const stats = account.stats || {};
  const username = profile.username || "";
  const ratingEntries = Object.entries(stats)
    .filter(
      ([key, value]: any) =>
        /^chess(?:_|960_)/.test(key) && value?.last?.rating,
    )
    .map(([key, value]: any) => ({
      key,
      label: controls[key] || key.replace(/^chess_/, "").replaceAll("_", " "),
      ...value,
    })).sort((a, b) => {
      const order = ["chess_rapid", "chess_blitz", "chess_bullet", "chess_daily"];
      return (order.indexOf(a.key) < 0 ? 99 : order.indexOf(a.key)) - (order.indexOf(b.key) < 0 ? 99 : order.indexOf(b.key));
    });
  useEffect(() => {
    setError("");
    setQuery("");
    setSpeed("all");
    setResult("all");
    setTab("overview");
  }, [username]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const elements = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,select,[tabindex="0"]',
          ) || [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keys);
      if (previous?.isConnected && !previous.closest("[inert]") && getComputedStyle(previous).visibility !== "hidden") {
        previous.focus({ preventScroll: true });
      } else {
        const fallback = Array.from(document.querySelectorAll<HTMLButtonElement>(".modern-profile-dot,.academy-header-menu")).find(button => !button.closest("[inert]") && button.getClientRects().length && getComputedStyle(button).visibility !== "hidden");
        fallback?.focus({ preventScroll: true });
      }
    };
  }, [open, onClose]);
  async function loadMore() {
    if (loading || cursor === null) return;
    setLoading(true);
    setError("");
    try {
      await onLoadMore(cursor);
      setVisibleLimit((value) => value + 40);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (open)
      dialog.current?.querySelector(".profile-scroll")?.scrollTo({ top: 0 });
  }, [tab, open]);
  useEffect(() => setVisibleLimit(40), [query, speed, result, username]);
  const presence = useAnimatedPresence(open);
  if (!presence.mounted) return null;
  const country = profileCountry(profile.country);
  const href =
    chessComUrl(profile.url) ||
    `https://www.chess.com/member/${encodeURIComponent(username)}`;
  const totalRecord = ratingEntries.reduce(
    (a, r) => ({
      win: a.win + (r.record?.win || 0),
      loss: a.loss + (r.record?.loss || 0),
      draw: a.draw + (r.record?.draw || 0),
    }),
    { win: 0, loss: 0, draw: 0 },
  );
  const total = totalRecord.win + totalRecord.loss + totalRecord.draw;
  const filtered = loaded.filter(
    (g) =>
      (speed === "all" || g.timeClass === speed) &&
      (result === "all" || playerResult(g, username) === result) &&
      (g.white + " " + g.black).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="profile-backdrop"
      data-motion-open={presence.visible}
      inert={!open}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="profile-dialog profile-refined"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chesscom-profile-heading"
        tabIndex={-1}
      >
        <header className="profile-sheet-top">
          <span>
            <ShieldCheck size={17} /> Chess.com profile
          </span>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close Chess.com profile"
          >
            <X size={21} />
          </button>
        </header>
        <div className="profile-scroll">
          <section className="profile-banner">
            <div className="profile-identity">
              <ProfileAvatar profile={profile} size="large" />
              <div>
                <span className="profile-handle">
                  {profile.title && <b>{profile.title}</b>} @{username}
                </span>
                <h2 id="chesscom-profile-heading">
                  {profile.name || username}
                </h2>
                <div className="profile-meta">
                  {(profile.location || country) && (
                    <span>
                      <Globe size={13} />
                      {[profile.location, country].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span>
                    <CheckCircle2 size={13} /> Public profile linked
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-header-actions">
              <a
                className="secondary"
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                View profile <ArrowUpRight size={15} />
              </a>
              <button
                className="profile-sync text-btn"
                disabled={syncing || loading}
                onClick={() => onSync(false)}
              >
                <RefreshCw size={14} />
                {syncing ? "Syncing…" : "Refresh latest"}
              </button>
            </div>
          </section>
          <nav className="profile-tabs" aria-label="Chess.com profile sections">
            {["overview", "games", "statistics"].map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t === "games"
                  ? `Games · ${loaded.length.toLocaleString()}`
                  : t === "overview"
                    ? "Overview"
                    : "Ratings"}
              </button>
            ))}
          </nav>
          <div className="profile-content">
            <section className="profile-library-sync" aria-label="Game library sync">
              <div className="profile-library-total">
                <span><Swords size={18} /></span>
                <div><strong>{loaded.length.toLocaleString()} <span>imported games</span></strong><small>{cursor === null ? "Available history imported" : "More history is available"}</small></div>
              </div>
              <button className="secondary" disabled={loading || syncing} onClick={() => onSync(true)}>
                <RefreshCw size={15} /> {syncing ? "Syncing…" : "Sync all games"}
              </button>
              {syncing && <button className="profile-sync-stop" onClick={onStopSync}>Pause sync</button>}
              {syncStatus && <p className="profile-sync-status" role="status" aria-live="polite">{syncing && <RefreshCw size={13} className="profile-sync-spinner" />}{syncStatus}</p>}
              {syncError && <p className="profile-sync-error" role="alert">{syncError}</p>}
            </section>
            {tab === "overview" && (
              <>
                <div className="profile-section-heading">
                  <div>
                    <span className="eyebrow">
                      PUBLIC RATINGS
                    </span>
                    <h3>Your ratings</h3>
                  </div>
                  <Trophy size={20} />
                </div>
                <div className="public-rating-grid">
                  {ratingEntries.length ? (
                    ratingEntries.map((r) => (
                      <button key={r.key} onClick={() => setTab("statistics")}>
                        <span>{r.label}</span>
                        <strong>{r.last.rating.toLocaleString()}</strong>
                        <small>
                          Best{" "}
                          {r.best?.rating?.toLocaleString() || "not published"}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>No public rated-game statistics are available yet.</p>
                  )}
                </div>
                <div className="profile-record">
                  <div>
                    <span className="eyebrow">PUBLISHED RATED RECORD</span>
                    <strong>
                      {total.toLocaleString()}
                      <small> games across available time controls</small>
                    </strong>
                  </div>
                  <div className="record-values">
                    <span className="win">
                      {totalRecord.win.toLocaleString()}
                      <small>Wins</small>
                    </span>
                    <span className="draw">
                      {totalRecord.draw.toLocaleString()}
                      <small>Draws</small>
                    </span>
                    <span className="loss">
                      {totalRecord.loss.toLocaleString()}
                      <small>Losses</small>
                    </span>
                  </div>
                  {total > 0 && (
                    <div
                      className="record-bar"
                      role="img"
                      aria-label={`${totalRecord.win} wins, ${totalRecord.draw} draws, ${totalRecord.loss} losses`}
                    >
                      <i
                        className="win"
                        style={{ width: (totalRecord.win / total) * 100 + "%" }}
                      />
                      <i
                        className="draw"
                        style={{
                          width: (totalRecord.draw / total) * 100 + "%",
                        }}
                      />
                      <i
                        className="loss"
                        style={{
                          width: (totalRecord.loss / total) * 100 + "%",
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="profile-detail-grid">
                  <div>
                    <CalendarDays size={17} />
                    <span>
                      Member since<strong>{date(profile.joined)}</strong>
                    </span>
                  </div>
                  <div>
                    <Clock size={17} />
                    <span>
                      Last seen<strong>{date(profile.last_online)}</strong>
                    </span>
                  </div>
                  {typeof profile.followers === "number" && (
                    <div>
                      <Users size={17} />
                      <span>
                        Followers
                        <strong>{profile.followers.toLocaleString()}</strong>
                      </span>
                    </div>
                  )}
                  {profile.status && (
                    <div>
                      <UserRound size={17} />
                      <span>
                        Account status
                        <strong>
                          {String(profile.status).replaceAll("_", " ")}
                        </strong>
                      </span>
                    </div>
                  )}
                  {profile.league && (
                    <div>
                      <Trophy size={17} />
                      <span>
                        League<strong>{profile.league}</strong>
                      </span>
                    </div>
                  )}
                  {typeof stats.fide === "number" && stats.fide > 0 && (
                    <div>
                      <Trophy size={17} />
                      <span>
                        Published FIDE rating<strong>{stats.fide}</strong>
                      </span>
                    </div>
                  )}
                </div>
                {publicUrl(profile.twitch_url) && (
                  <a
                    className="text-btn"
                    href={publicUrl(profile.twitch_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public Twitch channel <ArrowUpRight size={15} />
                  </a>
                )}
                <div className="profile-section-heading">
                  <div>
                    <span className="eyebrow">
                      RECENTLY IMPORTED
                    </span>
                    <h3>Your latest games</h3>
                  </div>
                  <button className="text-btn" onClick={() => setTab("games")}>
                    See games <ArrowRight size={15} />
                  </button>
                </div>
                <div className="profile-recent-games">
                  {loaded.slice(0, 3).map((g) => {
                    const outcome = playerResult(g, username);
                    const opponent =
                      g.white.toLowerCase() === username.toLowerCase()
                        ? g.black
                        : g.white;
                    return (
                      <button key={g.id} onClick={() => onAnalyze(g)}>
                        <span className={"game-outcome " + outcome}>
                          {outcome === "win"
                            ? "W"
                            : outcome === "loss"
                              ? "L"
                              : outcome === "draw"
                                ? "D"
                                : "·"}
                        </span>
                        <span>
                          <strong>vs. {opponent}</strong>
                          <small>
                            {g.timeClass && g.timeClass !== "unknown"
                              ? g.timeClass + " · "
                              : ""}
                            {new Date(g.date).toLocaleDateString()}
                          </small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                    );
                  })}
                  {!loaded.length && (
                    <p>
                      No completed standard games were returned. Try loading
                      older archives.
                    </p>
                  )}
                </div>
                <button
                  className="secondary full"
                  onClick={() => setTab("games")}
                >
                  Open your game collection <Swords size={16} />
                </button>
              </>
            )}
            {tab === "games" && (
              <>
                <div className="profile-section-heading">
                  <div>
                    <span className="eyebrow">
                      YOUR COMPLETED STANDARD GAMES
                    </span>
                    <h3>Your game library</h3>
                  </div>
                </div>
                <p className="profile-explainer">
                  {loaded.length} games loaded
                  {account.archiveCount
                    ? ` · ${account.archiveCount} monthly archives available`
                    : ""}
                  . Open any game for Stockfish review. Load older games to keep
                  exploring your available history.
                </p>
                <div className="profile-game-filters">
                  <div className="search-field">
                    <Search size={16} />
                    <input
                      aria-label="Search imported opponents"
                      placeholder="Search an opponent…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <select
                    aria-label="Filter games by time control"
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                  >
                    <option value="all">All time controls</option>
                    {[
                      ...new Set(
                        loaded
                          .map((g) => g.timeClass)
                          .filter((t) => t && t !== "unknown"),
                      ),
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter games by result"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                  >
                    <option value="all">All results</option>
                    <option value="win">Wins</option>
                    <option value="draw">Draws</option>
                    <option value="loss">Losses</option>
                  </select>
                </div>
                <div className="profile-games">
                  {filtered.slice(0, visibleLimit).map((g) => {
                    const outcome = playerResult(g, username);
                    return (
                      <article key={g.id}>
                        <div className="profile-game-top">
                          <span className={"game-outcome " + outcome}>
                            {outcome === "win"
                              ? "W"
                              : outcome === "loss"
                                ? "L"
                                : outcome === "draw"
                                  ? "D"
                                  : "·"}
                          </span>
                          <div>
                            <strong>
                              {g.white}
                              <small>
                                {g.whiteRating ? ` (${g.whiteRating})` : ""}
                              </small>
                            </strong>
                            <strong>
                              {g.black}
                              <small>
                                {g.blackRating ? ` (${g.blackRating})` : ""}
                              </small>
                            </strong>
                          </div>
                          <b>{g.result}</b>
                        </div>
                        <div className="profile-game-bottom">
                          <span>
                            {g.timeClass && g.timeClass !== "unknown"
                              ? g.timeClass + " · "
                              : ""}
                            {new Date(g.date).toLocaleDateString()}
                          </span>
                          <div>
                            {chessComUrl(g.url) && (
                              <a
                                className="icon-btn"
                                href={chessComUrl(g.url)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`View ${g.white} versus ${g.black} on Chess.com`}
                              >
                                <ArrowUpRight size={16} />
                              </a>
                            )}
                            <button
                              className="secondary"
                              onClick={() => onAnalyze(g)}
                            >
                              Analyze <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {filtered.length > visibleLimit && (
                  <button className="secondary full" onClick={() => setVisibleLimit((value) => value + 40)}>
                    Show more imported games · {Math.min(visibleLimit, filtered.length)} of {filtered.length}
                    <ChevronDown size={16} />
                  </button>
                )}
                {!filtered.length && (
                  <div className="profile-empty">
                    <Search size={25} />
                    <strong>No matching games</strong>
                    <p>Try another opponent, time control, or result filter.</p>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setQuery("");
                        setSpeed("all");
                        setResult("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                {error && (
                  <div className="feedback error" role="alert">
                    {error}
                  </div>
                )}
                {cursor !== null ? (
                  <button
                    className="secondary full load-history"
                    disabled={loading || syncing}
                    onClick={() => void loadMore()}
                  >
                    {loading
                      ? "Loading the next archive page…"
                      : "Load older games"}
                    <ChevronDown size={16} />
                  </button>
                ) : (
                  <p className="archive-complete">
                    <CheckCircle2 size={15} />
                    You’ve reached the end of the available standard-game
                    archives.
                  </p>
                )}
              </>
            )}
            {tab === "statistics" && (
              <>
                <div className="profile-section-heading">
                  <div>
                    <span className="eyebrow">OFFICIAL PUBLIC STATISTICS</span>
                    <h3>Ratings & records</h3>
                  </div>
                </div>
                <div className="profile-statistics">
                  {ratingEntries.map((r) => {
                    const n =
                      (r.record?.win || 0) +
                      (r.record?.draw || 0) +
                      (r.record?.loss || 0);
                    return (
                      <section key={r.key}>
                        <div>
                          <span>{r.label}</span>
                          <strong>{r.last.rating.toLocaleString()}</strong>
                        </div>
                        <dl>
                          <div>
                            <dt>Best rating</dt>
                            <dd>
                              {r.best?.rating?.toLocaleString() ||
                                "Not published"}
                            </dd>
                          </div>
                          <div>
                            <dt>Best-rating date</dt>
                            <dd>{date(r.best?.date)}</dd>
                          </div>
                          <div>
                            <dt>Rated record</dt>
                            <dd>
                              {r.record?.win ?? 0} W · {r.record?.draw ?? 0} D ·{" "}
                              {r.record?.loss ?? 0} L
                            </dd>
                          </div>
                          <div>
                            <dt>Win rate</dt>
                            <dd>
                              {n
                                ? Math.round(((r.record?.win || 0) / n) * 100) +
                                  "%"
                                : "No rated games"}
                            </dd>
                          </div>
                          {typeof r.last.rd === "number" && (
                            <div>
                              <dt>Rating deviation</dt>
                              <dd>{r.last.rd}</dd>
                            </div>
                          )}
                          {typeof r.record?.timeout_percent === "number" && (
                            <div>
                              <dt>Timeout rate</dt>
                              <dd>{r.record.timeout_percent}%</dd>
                            </div>
                          )}
                        </dl>
                        {chessComUrl(r.best?.game) && (
                          <a
                            className="text-btn"
                            href={chessComUrl(r.best.game)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Game at best rating <ArrowUpRight size={14} />
                          </a>
                        )}
                      </section>
                    );
                  })}
                </div>
                <div className="extra-public-stats">
                  {stats.tactics?.highest && (
                    <section>
                      <span>Tactics · highest published</span>
                      <strong>{stats.tactics.highest.rating}</strong>
                      <small>{date(stats.tactics.highest.date)}</small>
                    </section>
                  )}
                  {stats.puzzle_rush?.best && (
                    <section>
                      <span>Puzzle Rush · personal best</span>
                      <strong>{stats.puzzle_rush.best.score}</strong>
                      <small>
                        {stats.puzzle_rush.best.total_attempts} total attempts
                        in that run
                      </small>
                    </section>
                  )}
                </div>
                {!ratingEntries.length &&
                  !stats.tactics &&
                  !stats.puzzle_rush && (
                    <div className="profile-empty">
                      <Trophy size={25} />
                      <strong>No public statistics yet</strong>
                      <p>
                        Your profile may not have any rated games or published
                        puzzle records.
                      </p>
                    </div>
                  )}
              </>
            )}
            <footer className="profile-data-note">
              <ShieldCheck size={14} />
              <p>
                Chess Infinity is independent and is not affiliated with Chess.com. Only publicly available data is shown. Private
                information, live games, and account access are never requested.
                Last sync{" "}
                {account.syncedAt
                  ? new Date(account.syncedAt).toLocaleString()
                  : "not recorded"}
                .
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
