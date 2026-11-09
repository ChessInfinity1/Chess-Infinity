"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import "./account-access.css";
export default function AccountAccess({ logout = false }: { logout?: boolean }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      if (register && form.get("password") !== form.get("confirm")) throw new Error("Passwords do not match.");
      const response = await fetch(`/api/auth/${logout ? "sign-out" : register ? "sign-up/email" : "sign-in/email"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logout ? {} : { name: String(form.get("name") || "Chess player").trim(), email: String(form.get("email")).trim(), password: form.get("password") }),
      });
      const body: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 429 ? "Too many attempts. Please wait one minute." : body.message || "Unable to sign in. Please try again.");
      setSuccess(true);
      // Guests keep their device backup; import it explicitly after signing in.
      const value = new URLSearchParams(location.search).get("return_to") || "/";
      const next = new URL(value, location.origin);
      location.assign(next.origin === location.origin && !["/login", "/logout"].includes(next.pathname) ? next.href : "/");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="account-access"><section className="account-card">
    <a href="/" className="account-brand">∞ <span>chess infinity</span></a>
    <p className="account-eyebrow">YOUR PERSONAL ACADEMY</p>
    <h1>{logout ? "Ready to sign out?" : register ? "Your next chapter starts here." : "Welcome back."}</h1>
    <p>{logout ? "Your saved cloud progress will be here when you return." : "Save your lessons, games, and training across devices."}</p>
    <form onSubmit={submit}>
      {!logout && <>
        {register && <label>Your name<input name="name" autoComplete="name" required maxLength={80} /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} /></label>
        {register && <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>}
        {register && <small>Use at least 12 characters. Store your password safely: email recovery is not available yet. This creates a separate Academy account; your Chess.com password is never requested.</small>}
      </>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {success && <p role="status">{logout ? "Signed out." : "Signed in. Opening your academy…"}</p>}
      <button className="account-submit" disabled={busy || success}>{busy ? "Please wait…" : logout ? "Sign out" : register ? "Create account" : "Sign in"}</button>
    </form>
    {!logout && <button className="account-switch" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Already learning with us? Sign in" : "New here? Create an account"}</button>}
    <a className="account-guest" href="/">{logout ? "Return to your academy" : "Continue practicing as a guest"}</a>
    {!logout && <p className="account-migration">Moving from the original website? Export your progress there, then import the JSON file in Preferences here. Your original account and data stay intact.</p>}
  </section></main>;
}
