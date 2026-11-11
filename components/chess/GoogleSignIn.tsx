"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { accountReturnPath, googleAuthorizationUrl, googleAuthError } from "../../lib/google-auth";
import "./google-sign-in.css";

export function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

export async function startGoogleSignIn(link = false) {
  const callbackURL = link ? "/?screen=settings" : accountReturnPath(new URLSearchParams(location.search).get("return_to"), location.origin);
  const errorCallbackURL = link ? "/?screen=settings" : "/login?return_to=" + encodeURIComponent(callbackURL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/auth/${link ? "link-social" : "sign-in/social"}`, {
      method: "POST", credentials: "same-origin", signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", callbackURL, errorCallbackURL, disableRedirect: true }),
    });
    const result: unknown = await response.json().catch(() => null);
    const data = result && typeof result === "object" ? result as Record<string, unknown> : {};
    if (!response.ok) throw new Error(response.status === 429 ? "Too many sign-in attempts. Wait a minute and try again." : googleAuthError(typeof data.code === "string" ? data.code : "unavailable"));
    location.assign(googleAuthorizationUrl(data.url));
  } catch (error) {
    if ((error as Error).name === "AbortError") throw new Error("Google sign-in took too long to start. Check your connection and try again.");
    throw error;
  } finally { clearTimeout(timer); }
}

export default function GoogleAccountSettings() {
  const [status, setStatus] = useState<{ google: boolean; googleLinked: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setError(googleAuthError(new URLSearchParams(location.search).get("error")));
    fetch("/api/sign-in-options", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Sign-in options could not be loaded. Refresh to try again.");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("google" in data) || !("googleLinked" in data) || typeof data.google !== "boolean" || (typeof data.googleLinked !== "boolean" && data.googleLinked !== null)) throw new Error("Sign-in options could not be read. Refresh to try again.");
        if (data.googleLinked === null) throw new Error("Sign in to your Academy account before linking Google.");
        if (alive) setStatus({ google: data.google, googleLinked: data.googleLinked });
      }).catch(error => { if (alive) setError(error.name === "AbortError" ? "Sign-in options took too long to load. Refresh to try again." : error.message); })
      .finally(() => clearTimeout(timer));
    const restore = () => setBusy(false);
    window.addEventListener("pageshow", restore);
    return () => { alive = false; controller.abort(); clearTimeout(timer); window.removeEventListener("pageshow", restore); };
  }, []);
  return <div className="google-account-settings">
    <strong>Google sign-in</strong>
    {!status && !error && <p role="status">Checking sign-in options…</p>}
    {status?.googleLinked ? <p className="google-linked"><CheckCircle2 size={16}/>{status.google ? "Google is linked. Use Continue with Google to return to this account." : "Google is linked, but Google sign-in is temporarily unavailable."}</p> : status?.google ? <><p>Link the Google account with the same email address. Your lessons, games, and progress stay on this Academy account.</p><button className="secondary full" disabled={busy} onClick={async () => { if(busy)return;setBusy(true);setError("");try{await startGoogleSignIn(true);}catch(error){setError((error as Error).message);setBusy(false);} }}>{busy ? <LoaderCircle size={18} className="google-spinner"/> : <GoogleMark/>}{busy ? "Opening Google…" : "Link Google account"}</button></> : status && <p>Google sign-in has not been enabled yet. Your Academy email and password still work.</p>}
    {error && <p role="alert" className="google-sign-in-error">{error}</p>}
  </div>;
}
