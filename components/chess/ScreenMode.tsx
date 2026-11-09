"use client";
import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
export function useThemeChrome(theme: string) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const color = theme === "dark" ? "#181820" : "#f7f8fa";
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", color));
  }, [theme]);
}
export default function ScreenMode({ label = false }: { label?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [full, setFull] = useState(false);
  const [native, setNative] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const media = matchMedia("(display-mode: fullscreen)");
    const update = () => {
      const active = !!document.fullscreenElement;
      setSupported(!!document.fullscreenEnabled);
      setFull(active);
      setNative(media.matches && !active);
    };
    update();
    document.addEventListener("fullscreenchange", update);
    media.addEventListener("change", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      media.removeEventListener("change", update);
    };
  }, []);
  if (!supported || native) return null;
  return (
    <div className="screen-mode-control">
      <button
        className={label ? "screen-mode-labeled" : "icon-btn"}
        aria-label={full ? "Exit full screen" : "Enter full screen"}
        title={full ? "Exit full screen" : "Full screen"}
        onClick={async () => {
          setError("");
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else
              await document.documentElement.requestFullscreen({
                navigationUI: "hide",
              });
          } catch (error) {
            console.warn("Full-screen request rejected:", error);
            setError(
              "Full screen is unavailable in this browser. Open the installed app from your home screen.",
            );
          }
        }}
      >
        {full ? <Minimize size={18} /> : <Maximize size={18} />}
        {label && <span>{full ? "Exit full screen" : "Full screen"}</span>}
      </button>
      {error && (
        <div className="screen-mode-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
