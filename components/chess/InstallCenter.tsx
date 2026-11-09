"use client";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  WifiOff,
  ShieldCheck,
  Share2,
  Copy,
  RefreshCw,
  BookOpen,
  Puzzle,
  Gamepad2,
  Trash2,
  CloudDownload,
  CloudUpload,
  X,
} from "lucide-react";
import {
  type InstallPromptEvent,
  type PackStatus,
  browserPlatform,
  isEmbeddedBrowser,
  offlineWorkerMessage,
} from "../../lib/pwa";
import {
  OFFLINE_PROGRESS_KEY,
  parseOfflinePractice,
} from "../../lib/chess/offline-progress";
import { puzzles, lessons } from "../../lib/chess/content";
export function useAppInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const fullscreen = window.matchMedia("(display-mode: fullscreen)");
    const check = () =>
      setInstalled(
        media.matches ||
          (fullscreen.matches && !document.fullscreenElement) ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    check();
    const before = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", complete);
    media.addEventListener("change", check);
    fullscreen.addEventListener("change", check);
    document.addEventListener("fullscreenchange", check);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", complete);
      media.removeEventListener("change", check);
      fullscreen.removeEventListener("change", check);
      document.removeEventListener("fullscreenchange", check);
    };
  }, []);
  return {
    prompt,
    installed,
    request: async () => {
      if (!prompt) return "unavailable";
      const event = prompt;
      setPrompt(null);
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome;
    },
  };
}
export default function InstallCenter({
  install,
  onImportOffline,
}: {
  install: ReturnType<typeof useAppInstall>;
  onImportOffline: () => void;
}) {
  const [platform, setPlatform] = useState("android");
  const [embedded, setEmbedded] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<PackStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [download, setDownload] = useState({ done: 0, total: 4 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [online, setOnline] = useState(true);
  const mounted = useRef(true);
  const preparing = useRef(false);
  async function worker() {
    if (!("serviceWorker" in navigator))
      throw new Error(
        "This browser cannot prepare offline practice. Open the app in Chrome, Edge, or Safari.",
      );
    const existing = await navigator.serviceWorker.getRegistration();
    if (!navigator.onLine && existing?.active) return existing.active;
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    await registration.update();
    const pending = registration.installing || registration.waiting;
    if (pending && pending.state !== "activated") {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.removeEventListener("statechange", change);
          reject(
            new Error(
              "Offline setup is taking longer than expected. Reload once and try again.",
            ),
          );
        }, 15000);
        function change() {
          if (pending!.state === "activated") {
            clearTimeout(timer);
            pending!.removeEventListener("statechange", change);
            resolve();
          } else if (pending!.state === "redundant") {
            clearTimeout(timer);
            pending!.removeEventListener("statechange", change);
            reject(
              new Error(
                "Offline setup could not finish. Reconnect and reload the app.",
              ),
            );
          }
        }
        pending.addEventListener("statechange", change);
        change();
      });
    }
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Offline setup is not ready yet. Reload once and try again.",
              ),
            ),
          15000,
        ),
      ),
    ]);
    const active = registration.active || ready.active;
    if (!active)
      throw new Error("Reload the app once to finish offline setup.");
    return active;
  }

  async function refresh() {
    if (preparing.current) return;
    try {
      const active = await worker();
      const s = await offlineWorkerMessage<PackStatus>(active, "PACK_STATUS");
      if (mounted.current) setStatus(s);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
    try {
      const p = parseOfflinePractice(
        JSON.parse(localStorage.getItem(OFFLINE_PROGRESS_KEY) || "null"),
      );
      setOfflineCount(
        p.completed.length + p.puzzles.length + p.arcade.history.length,
      );
    } catch {
      setOfflineCount(0);
    }
  }
  useEffect(() => {
    mounted.current = true;
    setPlatform(browserPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setEmbedded(isEmbeddedBrowser(navigator.userAgent));
    setUrl(location.origin + "/");
    setOnline(navigator.onLine);
    void refresh();
    const network = () => {
      setOnline(navigator.onLine);
      void refresh();
    };
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("focus", network);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("focus", network);
    };
  }, []);
  async function prepare() {
    if (preparing.current) return;
    preparing.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setDownload({ done: 0, total: 4 });
    try {
      if (!navigator.onLine)
        throw new Error(
          "Reconnect before downloading the offline training pack.",
        );
      const active = await worker();
      const s = await offlineWorkerMessage<PackStatus>(
        active,
        "DOWNLOAD_OFFLINE_PACK",
        (done, total) => setDownload({ done, total }),
      );
      setStatus(s);
      setMessage("Offline practice is downloaded and ready on this device.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      preparing.current = false;
      setBusy(false);
    }
  }
  async function installApp() {
    setError("");
    setMessage("");
    if (!install.prompt) {
      setShowGuide(true);
      return;
    }
    try {
      const result = await install.request();
      setMessage(
        result === "accepted"
          ? "Installation accepted. Your browser will confirm when it finishes."
          : "You can install later using your browser’s menu.",
      );
      if (result !== "accepted") setShowGuide(true);
    } catch {
      setShowGuide(true);
      setError(
        "The browser did not open its install prompt. Follow the steps below.",
      );
    }
  }
  const chromeIntent = url
    ? `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
    : "";
  const guides: Record<string, { title: string; steps: string[] }> = {
    android: {
      title: "Install on Android",
      steps: [
        "Open Chess Infinity in Chrome or Samsung Internet. Sign in to this private app if asked.",
        "Open the browser menu (⋮), then choose “Add to Home screen” or “Install app.”",
        "Confirm Install. Launch Chess Infinity from the icon on your phone.",
      ],
    },
    ios: {
      title: "Install on iPhone or iPad",
      steps: [
        "Open Chess Infinity in Safari and sign in if asked.",
        "Tap Share, then choose “Add to Home Screen.”",
        "Enable “Open as Web App” if shown, then tap Add.",
      ],
    },
    desktop: {
      title: "Install on your computer",
      steps: [
        "Open Chess Infinity in Chrome, Edge, or Safari and sign in if asked.",
        "Use the install icon in the address bar or the browser’s app-install menu. In Safari, use File → Add to Dock.",
        "Confirm the browser prompt. Launch Chess Infinity from your apps.",
      ],
    },
  };
  return (
    <div className="install-center">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR ACADEMY, ONE TAP AWAY.</span>
          <h1>A home for your next move.</h1>
          <p>
            Install Chess Infinity on your phone or computer. Download a
            training pack for the moments without Wi-Fi.
          </p>
        </div>
        <span className="pill lavender">
          {online ? "Connected" : "Offline"}
        </span>
      </div>
      <section className="install-hero card">
        <span className="install-app-icon">
          <img src="/icon-192.png" alt="Chess Infinity app icon" />
        </span>
        <div>
          <span className="eyebrow">CHESS INFINITY</span>
          <h2>Your chess. Your pocket.</h2>
          <p>
            A dedicated app window, your own home-screen icon, and a faster way
            back to practice.
          </p>
          <div className="install-hero-actions">
            {install.installed ? (
              <span className="connected-state">
                <CheckCircle2 size={18} />
                Installed on this device
              </span>
            ) : (
              <button className="primary" onClick={() => void installApp()}>
                <Download size={17} />
                {install.prompt
                  ? "Install Chess Infinity"
                  : "How to install the app"}
              </button>
            )}
            <button
              className="text-btn"
              onClick={() => setShowGuide(!showGuide)}
            >
              Installation steps <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <span className="install-orbit" aria-hidden="true">
          ♞
        </span>
      </section>
      {embedded && !install.installed && (
        <div className="info-banner">
          <Smartphone size={23} />
          <p>
            <strong>You’re using an in-app browser.</strong> The ChatGPT browser
            may not offer app installation. Open this page in Chrome or Safari,
            then install it there.
          </p>
          {platform === "android" && chromeIntent && (
            <a className="secondary" href={chromeIntent}>
              Open Chrome <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      )}
      {(showGuide || !install.prompt) && !install.installed && (
        <section className="card install-guide">
          <div
            className="install-platform-tabs"
            aria-label="Installation platform"
          >
            {[
              { id: "android", name: "Android", icon: Smartphone },
              { id: "ios", name: "iPhone / iPad", icon: Share2 },
              { id: "desktop", name: "Computer", icon: Monitor },
            ].map((p) => (
              <button
                key={p.id}
                className={platform === p.id ? "active" : ""}
                aria-pressed={platform === p.id}
                onClick={() => setPlatform(p.id)}
              >
                <p.icon size={17} />
                {p.name}
              </button>
            ))}
          </div>
          <h2>{guides[platform].title}</h2>
          <ol>
            {guides[platform].steps.map((s, i) => (
              <li key={s}>
                <span>0{i + 1}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
          <button
            className="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setMessage("App link copied. Paste it into your browser.");
              } catch {
                setMessage("Open this address in your browser: " + url);
              }
            }}
          >
            <Copy size={15} />
            Copy app link
          </button>
          <p className="install-note">
            For a cleaner screen, use the full-screen button in the academy
            header. Installed-app launch mode updates may require closing and
            reopening the app, or reinstalling the home-screen shortcut.
            Installation is handled by your browser. A download is confirmed
            only after the browser reports it; this is an installable web app,
            not an APK or an App Store package.
          </p>
        </section>
      )}
      <div className="install-detail-grid">
        <section className="card offline-download-card">
          <span className="icon-box">
            <WifiOff size={25} />
          </span>
          <h2>A good move, even offline.</h2>
          <p>
            Keep {lessons.length} interactive lessons,{" "}
            {puzzles.length.toLocaleString()} puzzles, and all three arcade
            modes on this device. Offline records can be imported into your
            academy when you reconnect.
          </p>
          <div className="offline-includes">
            <span>
              <BookOpen size={16} />
              Lessons
            </span>
            <span>
              <Puzzle size={16} />
              Puzzles
            </span>
            <span>
              <Gamepad2 size={16} />
              Arcade
            </span>
          </div>
          {status?.ready ? (
            <div className="connected-state">
              <CheckCircle2 size={17} />
              Offline pack ready
            </div>
          ) : status?.available ? (
            <div className="feedback">
              An older pack is ready. Download the current version when
              connected.
            </div>
          ) : (
            <small className="muted">
              No training pack downloaded on this device yet.
            </small>
          )}
          {busy && (
            <div className="offline-download-progress" role="status">
              <div>
                <i
                  style={{
                    width: (download.done / download.total) * 100 + "%",
                  }}
                />
              </div>
              <span>
                {download.done} of {download.total} files downloaded
              </span>
            </div>
          )}
          <div className="install-download-actions">
            <button
              className="primary"
              disabled={busy || !online || !!status?.ready}
              onClick={() => void prepare()}
            >
              <CloudDownload size={17} />
              {busy
                ? "Downloading…"
                : status?.ready
                  ? "Downloaded"
                  : status?.available
                    ? "Update offline pack"
                    : "Download offline training"}
            </button>
            {status?.available && (
              <a className="secondary" href="/offline/">
                Open offline practice <ArrowUpRight size={15} />
              </a>
            )}
          </div>
          {status?.available && (
            <button
              className="text-btn remove-offline"
              disabled={busy}
              onClick={async () => {
                setError("");
                try {
                  const active = await worker();
                  const s = await offlineWorkerMessage<PackStatus>(
                    active,
                    "REMOVE_OFFLINE_PACK",
                  );
                  setStatus(s);
                  setMessage(
                    "Download removed. Your offline training records are still saved on this device.",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Trash2 size={14} />
              Remove downloaded files
            </button>
          )}
          <p className="install-note">
            Account syncing, cloud saves, and full Stockfish review need a
            connection. The offline pack contains public training material;
            account pages and tokens are never cached.
          </p>
        </section>
        <section className="card offline-import-card">
          <span className="icon-box">
            <CloudUpload size={25} />
          </span>
          <h2>Bring your practice back.</h2>
          <p>
            Finished a lesson or set a new arcade best while offline? Import
            those device-local records into your signed-in academy. Duplicate
            records earn no extra XP.
          </p>
          <div className="offline-record-count">
            <strong>{offlineCount}</strong>
            <span>offline records waiting</span>
          </div>
          <button
            className="secondary full"
            disabled={!offlineCount || busy}
            onClick={() => {
              onImportOffline();
              void refresh();
            }}
          >
            <CloudUpload size={17} />
            Import offline progress
          </button>
          <div className="lesson-note">
            <strong>One app. Honest progress.</strong>
            <p>
              Training XP and arcade scores stay separate from your official
              Chess.com and Lichess ratings.
            </p>
          </div>
        </section>
      </div>
      {message && (
        <div className="notice install-feedback-toast" role="status">
          <CheckCircle2 size={17} />
          <span>{message}</span>
          <button
            aria-label="Dismiss installation message"
            className="icon-btn"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="feedback error install-feedback-toast" role="alert">
          <span>{error}</span>
          <div className="inline-actions">
            <button
              className="text-btn"
              disabled={busy || !online}
              onClick={() => void prepare()}
            >
              Retry download
            </button>
            <button className="text-btn" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="info-banner">
        <ShieldCheck size={22} />
        <p>
          <strong>Your private account stays private.</strong> App installation
          does not change who can access your academy. Offline practice stores
          training records on this device and never stores chess passwords.
        </p>
      </div>
    </div>
  );
}
