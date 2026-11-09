"use client";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Eye, EyeOff, Infinity as InfinityIcon, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Sparkles, Swords, UserRound } from "lucide-react";
import "./account-access.css";
import EmailCodeDialog from "./EmailCodeDialog";

class AuthRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly retryAfter: number) { super(message); }
}
async function authRequest(path: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/auth/${path}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body: unknown = await response.json().catch(() => null);
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (!response.ok) throw new AuthRequestError(response.status === 429 ? "Please wait a minute before trying again." : typeof data.message === "string" ? data.message : "We couldn’t complete that request. Please try again.", typeof data.code === "string" ? data.code : "", response.status, Math.max(1, Number(response.headers.get("retry-after")) || 60));
  return data;
}

function AcademyArtwork() {
  return <div className="access-artwork" aria-hidden="true">
    <div className="access-orbit access-orbit-one" /><div className="access-orbit access-orbit-two" />
    <svg className="access-board-art" viewBox="0 0 520 380" fill="none">
      <defs>
        <linearGradient id="access-board-edge" x1="80" y1="180" x2="440" y2="360" gradientUnits="userSpaceOnUse"><stop stopColor="#6f58a8" /><stop offset="1" stopColor="#33273f" /></linearGradient>
        <linearGradient id="access-board-face" x1="140" y1="65" x2="360" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#b6a2df" /><stop offset="1" stopColor="#766196" /></linearGradient>
        <linearGradient id="access-knight" x1="225" y1="75" x2="310" y2="270" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset=".46" stopColor="#f0e9fc" /><stop offset="1" stopColor="#c8b5eb" /></linearGradient>
        <filter id="access-art-shadow"><feGaussianBlur stdDeviation="12" /></filter>
      </defs>
      <ellipse cx="260" cy="320" rx="192" ry="30" fill="#0d0918" opacity=".35" filter="url(#access-art-shadow)" />
      <path d="M58 218 255 109 467 220V237L271 350 58 235Z" fill="url(#access-board-edge)" />
      <path d="M58 218 255 105 467 218 271 331Z" fill="url(#access-board-face)" />
      <g opacity=".52" fill="#e4d9f5">
        <path d="m58 218 49-28 53 28-49 28zM156 162l49-28 53 28-49 28zM160 218l49-28 53 28-49 28zM258 162l49-28 53 28-49 28zM164 274l49-28 53 28-49 28zM262 218l49-28 53 28-49 28zM266 274l49-28 53 28-49 28zM364 218l49-28 54 28-50 28z" />
      </g>
      <path d="M58 218 271 331 467 218" stroke="#e5d4ff" strokeOpacity=".4" strokeWidth="2" />
      <ellipse cx="280" cy="249" rx="58" ry="19" fill="#372449" opacity=".4" filter="url(#access-art-shadow)" />
      <g className="access-knight-art">
        <path d="m220 229 6-41 33-29-25-6-23 19-14-18 29-41 24-3 18-21 5 29c39 14 49 56 36 111Z" fill="url(#access-knight)" stroke="#c7b5e5" strokeWidth="2" strokeLinejoin="round" />
        <path d="M268 144c28 21 30 43 17 74" stroke="#9a83bc" strokeWidth="4" strokeLinecap="round" />
        <circle cx="244" cy="141" r="4" fill="#6e568f" />
        <path d="m218 230 88 0 9 21H210Z" fill="#e8def5" stroke="#b7a1d3" strokeWidth="2" strokeLinejoin="round" />
        <path d="M211 253h103v12H211Z" fill="#c5b0e0" stroke="#a890c6" strokeWidth="2" strokeLinejoin="round" />
        <path d="M214 254h96" stroke="#fff" strokeOpacity=".5" />
      </g>
      <g opacity=".8"><path d="M121 139v18M112 148h18" stroke="#d0baff" strokeWidth="2" strokeLinecap="round" /><circle cx="397" cy="144" r="3" fill="#b29bd9" /><circle cx="163" cy="297" r="2" fill="#c9b5ed" /></g>
    </svg>
    <div className="access-art-note"><span className="access-note-icon"><Check size={14} strokeWidth={3} /></span><span>One good move at a time.</span></div>
  </div>;
}

export default function AccountAccess({ logout = false }: { logout?: boolean }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [codeBusy, setCodeBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [codeError, setCodeError] = useState("");
  const pendingPassword = useRef<string | null>(null);
  const id = useId();
  const recoveryId = id + "-recovery";
  const passwordHelpId = id + "-password-help";

  function switchMode(value: boolean) {
    setRegister(value); setError(""); setNotice(""); setShowPassword(false); setShowConfirm(false); setPassword(""); setConfirm("");
  }
  function openAcademy() {
    setSuccess(true);
    const value = new URLSearchParams(location.search).get("return_to") || "/";
    const next = new URL(value, location.origin);
    location.assign(next.origin === location.origin && !["/login", "/logout"].includes(next.pathname) ? next.href : "/");
  }
  async function sendCode(address: string) {
    setCodeBusy(true); setCodeError(""); setCodeSentAt(null);
    try {
      await authRequest("email-otp/send-verification-otp", { email: address, type: "email-verification" });
      setCodeSentAt(Date.now()); setResendAt(Date.now() + 60000);
    } catch (cause) {
      setCodeError(cause instanceof Error ? cause.message : "We couldn’t send your code. Please try again.");
      if (cause instanceof AuthRequestError && cause.status === 429) setResendAt(Date.now() + cause.retryAfter * 1000);
    } finally { setCodeBusy(false); }
  }
  async function startVerification(address: string, value: string) {
    pendingPassword.current = value;
    setPendingEmail(address); setCodeSentAt(null); setResendAt(0); setCodeError("");
    await sendCode(address);
  }
  function closeVerification() {
    if (codeBusy || verifyBusy) return;
    pendingPassword.current = null;
    setPendingEmail(null); setCodeSentAt(null); setCodeError("");
  }
  async function verifyCode(code: string) {
    if (!pendingEmail || codeBusy || verifyBusy) return;
    setVerifyBusy(true); setCodeError("");
    let verified = false;
    try {
      await authRequest("email-otp/verify-email", { email: pendingEmail, otp: code });
      verified = true;
      const value = pendingPassword.current;
      pendingPassword.current = null;
      if (!value) throw new Error("Sign in to continue.");
      await authRequest("sign-in/email", { email: pendingEmail, password: value });
      openAcademy();
    } catch (cause) {
      if (verified) {
        pendingPassword.current = null; setPendingEmail(null); switchMode(false);
        setNotice("Your email is verified. Sign in with your account’s password to continue.");
      } else {
        const code = cause instanceof AuthRequestError ? cause.code : "";
        setCodeError(code === "INVALID_OTP" ? "That code didn’t match. Try again or request a new one." : code === "OTP_EXPIRED" ? "Your code has expired. Request a new code below." : code === "TOO_MANY_ATTEMPTS" ? "Too many incorrect attempts. Request a new code below." : cause instanceof Error ? cause.message : "Please try again.");
      }
    } finally { setVerifyBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || success) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData(event.currentTarget);
      if (register && form.get("password") !== form.get("confirm")) throw new Error("Your passwords don’t match. Check them and try again.");
      const address = String(form.get("email") || "").trim().toLowerCase();
      const value = String(form.get("password") || "");
      let result;
      try {
        result = await authRequest(logout ? "sign-out" : register ? "sign-up/email" : "sign-in/email", logout ? {} : { name: String(form.get("name") || "Chess player").trim(), email: address, password: value });
      } catch (cause) {
        if (!logout && cause instanceof AuthRequestError && cause.code === "EMAIL_NOT_VERIFIED") { await startVerification(address, value); return; }
        throw cause;
      }
      if (register && !result.token) { await startVerification(address, value); return; }
      openAcademy();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return <main className="account-access">
    <div className="access-shell">
      <header className="access-header">
        <a href="/" className="access-brand" aria-label="Chess Infinity home"><span className="access-brand-mark"><InfinityIcon size={30} strokeWidth={2.5} /></span><span><strong>chess<span>infinity</span></strong><small>YOUR PERSONAL ACADEMY</small></span></a>
        <a href="/" className="access-back"><ArrowLeft size={16} /><span>Back to academy</span></a>
      </header>
      <div className="access-main">
        <aside className="access-story" aria-label="Your chess journey">
          <div className="access-story-copy"><span className="access-kicker"><span />A LITTLE PRACTICE. INFINITE POSSIBILITIES.</span>
            <h2>{logout ? <>A little pause.<br /><em>A fresh perspective.</em></> : <>Your next<br /><em>good move</em><br />starts here.</>}</h2>
            <p>{logout ? "Your progress stays with you. Come back when you’re ready for your next move." : "Learn one idea. Put it on the board. Build a game that feels like yours."}</p>
          </div>
          <AcademyArtwork />
          <div className="access-story-features"><span><BookOpen size={17} />Learn with a path</span><span><Swords size={17} />Play with purpose</span></div>
        </aside>
        <section className={"access-form-panel" + (register ? " is-registering" : "") + (logout ? " is-logout" : "")} aria-labelledby={id + "-title"}>
          <div className="access-form-content">
            <div className="access-form-symbol" aria-hidden="true">{logout ? <Sparkles size={25} /> : <LockKeyhole size={24} />}</div>
            <span className="access-form-eyebrow">{logout ? "UNTIL YOUR NEXT MOVE" : register ? "A NEW CHAPTER" : "YOUR NEXT CHAPTER"}</span>
            <h1 id={id + "-title"}>{logout ? "Taking a breather?" : register ? "Make your first move." : "Welcome back."}</h1>
            <p className="access-form-intro">{logout ? "Your saved progress will be here when you return." : register ? "A little practice today. A stronger player tomorrow." : "Sign in to pick up where you left off."}</p>
            {!logout && <div className="access-mode-switch" role="group" aria-label="Account access">
              <button type="button" aria-pressed={!register} onClick={() => switchMode(false)} disabled={busy || success}>Sign in</button>
              <button type="button" aria-pressed={register} onClick={() => switchMode(true)} disabled={busy || success}>Create account</button>
            </div>}
            <form key={register ? "register" : "sign-in"} onSubmit={submit} className="access-form" aria-busy={busy}>
              {!logout && <>
                {register && <label className="access-field"><span>Your name</span><span className="access-input-wrap"><UserRound size={18} aria-hidden="true" /><input name="name" placeholder="What should we call you?" autoComplete="name" required maxLength={80} disabled={busy || success} /></span></label>}
                <label className="access-field"><span>Email address</span><span className="access-input-wrap"><Mail size={18} aria-hidden="true" /><input name="email" type="email" placeholder="you@example.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy || success} /></span></label>
                <div className="access-field"><label htmlFor={id + "-password"}>Password</label><span className="access-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input id={id + "-password"} name="password" type={showPassword ? "text" : "password"} placeholder={register ? "Create a strong password" : "Enter your password"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} defaultValue="" onChange={e => setPassword(e.target.value)} aria-describedby={register ? passwordHelpId : undefined} disabled={busy || success} /><button type="button" className="access-visibility" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} disabled={busy || success}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></div>
                {register && <div className="access-field"><label htmlFor={id + "-confirm"}>Confirm password</label><span className="access-input-wrap"><ShieldCheck size={18} aria-hidden="true" /><input id={id + "-confirm"} name="confirm" type={showConfirm ? "text" : "password"} placeholder="Enter your password again" autoComplete="new-password" required minLength={12} maxLength={128} defaultValue="" onChange={e => setConfirm(e.target.value)} disabled={busy || success} /><button type="button" className="access-visibility" aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirm} onClick={() => setShowConfirm(value => !value)} disabled={busy || success}>{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></div>}
                {register && <div className="access-password-help" id={passwordHelpId}><span className={password.length >= 12 ? "is-met" : ""}><Check size={13} />12 or more characters</span><span className={confirm && password === confirm ? "is-met" : ""}><Check size={13} />Passwords match</span></div>}
              </>}
              {error && <div className="access-error" role="alert"><ShieldCheck size={17} /><p>{error}</p></div>}
              {notice && <p className="access-success" role="status"><Check size={17}/>{notice}</p>}
              {success && <p className="access-success" role="status"><Check size={17} />{logout ? "Signed out. See you soon." : "You’re in. Opening your academy…"}</p>}
              <button type="submit" className="access-submit" disabled={busy || success}><span>{busy ? "Just a moment…" : success ? "Opening your academy…" : logout ? "Sign out" : register ? "Create my account" : "Let’s make a move"}</span>{busy ? <LoaderCircle size={19} className="access-spinner" /> : <ArrowRight size={19} />}</button>
            </form>
            {!logout && <>
              <div className="access-guest-divider"><span />or explore at your own pace<span /></div>
              <a className="access-guest" href="/">Continue as a guest<ArrowRight size={16} /></a>
              <p className="access-save-note"><ShieldCheck size={14} />Your progress. Saved across devices.</p>
              <div className="access-help-links">
                <details className="access-help"><summary>{register ? "A quick note about your account" : "Need help signing in?"}<ChevronDown size={14} /></summary><div id={recoveryId}><p>{register ? "Create an Academy password and keep it in your password manager. If email verification is required, enter the code sent to your inbox to finish signing up. Email password recovery isn’t available yet." : "Use your Academy email and password. If your signup is waiting for verification, signing in will let you request a fresh code. Accounts from the original ChatGPT website don’t carry over automatically. Email password recovery isn’t available yet."}</p><p>We never ask for your Chess.com or Lichess password.</p></div></details>
                <details className="access-help"><summary>Bringing progress from the original site?<ChevronDown size={14} /></summary><div><p>Export your progress from Preferences on the original website. Create an account here, then import that JSON file in Preferences. Your original website and data stay intact.</p></div></details>
              </div>
            </>}
            {logout && <a className="access-guest access-stay" href="/"><ArrowLeft size={16} />Stay and keep practicing</a>}
          </div>
        </section>
      </div>
      <footer className="access-footer"><span>From your first move to grandmaster.</span><span><span className="access-footer-dot" />Made for the love of the game.</span></footer>
    </div>
    {pendingEmail && <EmailCodeDialog email={pendingEmail} sentAt={codeSentAt} resendAt={resendAt} sending={codeBusy} verifying={verifyBusy} error={codeError} onResend={() => { if (!codeBusy && !verifyBusy && Date.now() >= resendAt) void sendCode(pendingEmail); }} onVerify={code => { void verifyCode(code); }} onClose={closeVerification}/>}
  </main>;
}
