"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, MailCheck, RefreshCw, ShieldCheck, X } from "lucide-react";

type Props = {
  email: string;
  sentAt: number | null;
  resendAt: number;
  sending: boolean;
  verifying: boolean;
  error: string;
  onResend: () => void;
  onVerify: (code: string) => void;
  onClose: () => void;
};
export default function EmailCodeDialog({ email, sentAt, resendAt, sending, verifying, error, onResend, onVerify, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(Date.now());
  const busy = sending || verifying;
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(interval); document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    setCode("");
    if (sentAt) input.current?.focus({ preventScroll: true });
  }, [sentAt]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy && sentAt && /^\d{6}$/.test(code)) onVerify(code);
  }
  return <dialog ref={dialog} className="access-code-dialog" aria-labelledby="access-code-title" aria-describedby="access-code-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <button type="button" className="access-code-close" aria-label="Close email verification" disabled={busy} onClick={onClose}><X size={19}/></button>
    <span className="access-code-symbol" aria-hidden="true">{sending ? <LoaderCircle size={28} className="access-spinner"/> : <MailCheck size={29}/>}</span>
    <span className="access-form-eyebrow">ONE LAST MOVE</span>
    <h2 id="access-code-title">{sending ? "Sending your code…" : sentAt ? "Check your inbox." : "Let’s try that again."}</h2>
    <p id="access-code-description">{sending ? "We’re preparing your verification email for" : sentAt ? "A six-digit verification code has been sent to" : "Your code couldn’t be sent to"}<strong>{email}</strong></p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="access-email-code">Six-digit verification code</label>
      <input ref={input} id="access-email-code" className="access-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={!sentAt || busy} required aria-describedby="access-code-help"/>
      <p id="access-code-help">Codes expire after 10 minutes. Use the most recent code.</p>
      {error && <p className="access-code-error" role="alert">{error}</p>}
      <button type="submit" className="access-submit" disabled={!sentAt || code.length !== 6 || busy}>{verifying ? <><LoaderCircle size={18} className="access-spinner"/>Verifying…</> : <>Verify & continue<ArrowRight size={18}/></>}</button>
    </form>
    <div className="access-code-resend"><span>Didn’t get the email? Check your spam folder.</span><button type="button" onClick={onResend} disabled={busy || remaining > 0}><RefreshCw size={14}/>{remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}</button></div>
    <button type="button" className="access-code-change" disabled={busy} onClick={onClose}>Use a different email</button>
    <p className="access-code-safety"><ShieldCheck size={14}/>We’ll never ask you to share this code.</p>
  </dialog>;
}
