"use client";
import { useEffect, useState } from "react";
import { Bell, BellRing, CalendarPlus, Check, Clock, Smartphone } from "lucide-react";
import { defaultReminder, normalizeReminder, practiceCalendar, reminderDayNames, type PracticeReminder } from "../../lib/chess/reminders";
import { deviceSubscription, disableDeviceReminder, enableDeviceReminder, notificationSupport, reminderApi, type DeviceReminderStatus } from "../../lib/device-reminders";

export default function PracticeReminders({ value, minutes, signedIn = false, onSave }: { value?: PracticeReminder; minutes: number; signedIn?: boolean; onSave: (value: PracticeReminder) => void }) {
  const [draft, setDraft] = useState(() => normalizeReminder(value || defaultReminder));
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [publicKey, setPublicKey] = useState(""), [unsupported, setUnsupported] = useState("");
  const [device, setDevice] = useState<DeviceReminderStatus>({ enabled: false });
  const [zone, setZone] = useState(""), [permission, setPermission] = useState<NotificationPermission>("default");
  const valid = draft.days.length > 0 && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time);
  useEffect(() => {
    let live = true;
    const receive = (event: MessageEvent) => { if (event.data?.type === "PRACTICE_NOTIFICATION_SHOWN") { setMessage("Test notification displayed on this device. Your notification setup works."); setError(""); } };
    const refreshPermission = () => { if ("Notification" in window) setPermission(Notification.permission); };
    setUnsupported(notificationSupport()); setZone(Intl.DateTimeFormat().resolvedOptions().timeZone); refreshPermission();
    navigator.serviceWorker?.addEventListener("message", receive); window.addEventListener("focus", refreshPermission);
    (async () => {
      try {
        const response = await fetch("/api/reminders", { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error("Could not check notification settings. Reconnect and reload this page.");
        const config = await response.json() as { configured?: boolean; publicKey?: unknown };
        if (!live) return;
        setPublicKey(config.configured && typeof config.publicKey === "string" ? config.publicKey : "");
        if (!config.configured) setError("Device notifications are awaiting server setup. In-app and calendar reminders are available.");
        if (signedIn) {
          const subscription = await deviceSubscription();
          if (subscription) {
            const state = await reminderApi<DeviceReminderStatus>("status", subscription);
            if (live) setDevice(state);
          }
        }
      } catch (e) { if (live) setError((e as Error).message); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; navigator.serviceWorker?.removeEventListener("message", receive); window.removeEventListener("focus", refreshPermission); };
  }, [signedIn]);
  const schedule = () => ({ time: draft.time, days: draft.days, timeZone: zone });
  const changed = () => { setMessage(""); setError(""); };
  async function save() {
    if (!valid || busy) return; setBusy(true); changed();
    try {
      if (device.enabled) {
        if (!draft.enabled) { await disableDeviceReminder(); setDevice({ enabled: false }); }
        else {
          const subscription = await deviceSubscription();
          if (!subscription) throw new Error("The browser subscription expired. Enable device notifications again.");
          setDevice(await reminderApi<DeviceReminderStatus>("save", subscription, schedule()));
        }
      }
      onSave({ ...draft, dismissedDay: undefined, snoozeUntil: undefined });
      setMessage(draft.enabled ? "Practice schedule saved." : "Practice reminders are off.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function enable() {
    if (!valid || busy || !publicKey || !signedIn) return;
    setBusy(true); changed();
    try {
      const { status } = await enableDeviceReminder(publicKey, schedule());
      setDevice(status); setPermission(Notification.permission);
      const next = { ...draft, enabled: true, dismissedDay: undefined, snoozeUntil: undefined };
      setDraft(next); onSave(next); setMessage("Device notifications enabled. Send a test to check delivery on your phone.");
    } catch (e) { setError((e as Error).message); if ("Notification" in window) setPermission(Notification.permission); } finally { setBusy(false); }
  }
  async function disable() {
    if (busy) return; setBusy(true); changed();
    try { await disableDeviceReminder(); setDevice({ enabled: false }); setMessage("Device notifications are off. Your in-app schedule is unchanged."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function test() {
    if (busy) return; setBusy(true); changed();
    try {
      const subscription = await deviceSubscription();
      if (!subscription) { setDevice({ enabled: false }); throw new Error("This browser subscription expired. Enable device notifications again."); }
      await reminderApi("test", subscription);
      setMessage(current => current.startsWith("Test notification displayed") ? current : "Test accepted by the push service. Check this device’s notifications. Delivery can take a moment.");
    } catch (e) { if ([404, 410].includes((e as Error & { status?: number }).status || 0)) setDevice({ enabled: false }); setError((e as Error).message); } finally { setBusy(false); }
  }
  function calendar() {
    try {
      const file = practiceCalendar(draft, minutes, location.origin);
      const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = "chess-infinity-practice.ics"; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("Calendar file downloaded. Open it in your calendar and confirm the repeating event and alert."); setError("");
    } catch (e) { setError((e as Error).message); }
  }
  return <section className="card practice-reminders" aria-labelledby="practice-reminders-title" aria-busy={busy}>
    <span className="reminder-feature-icon"><Bell size={25}/></span><h2 id="practice-reminders-title">Your next good habit.</h2>
    <p>Pick your practice time, then enable notifications on this device. We’ll skip the reminder if you’ve already trained and synced your progress today.</p>
    <label className="reminder-enable"><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={e => { setDraft({ ...draft, enabled: e.target.checked }); changed(); }}/><span><strong>Practice reminders</strong><small>A nudge in the academy, plus phone alerts when you enable device notifications below.</small></span></label>
    <label className="reminder-time"><Clock size={17}/><span>Practice time</span><input aria-label="Practice time" type="time" required disabled={busy} value={draft.time} onChange={e => { setDraft({ ...draft, time: e.target.value }); changed(); }}/></label>
    <p className="reminder-time-zone">{zone ? `Timezone: ${zone.replaceAll("_", " ")}` : "Checking your timezone…"}</p>
    <fieldset className="reminder-days" disabled={busy}><legend>Practice days</legend><div>{reminderDayNames.map((day, index) => <button key={day} type="button" aria-label={day} aria-pressed={draft.days.includes(index)} onClick={() => { setDraft({ ...draft, days: draft.days.includes(index) ? draft.days.filter(d => d !== index) : [...draft.days, index].sort() }); changed(); }}>{day.slice(0, 2)}</button>)}</div></fieldset>
    {!draft.days.length && <p className="feedback error" role="alert">Choose at least one day.</p>}
    <button className="primary full" disabled={!valid || busy || loading} onClick={save}><Check size={17}/>{busy ? "Please wait…" : "Save reminder"}</button>
    <div className="reminder-device"><div className="reminder-device-heading"><Smartphone size={23}/><h3>Notifications on this device</h3><span className={device.enabled && permission === "granted" ? "is-on" : ""}>{loading ? "Checking…" : permission === "denied" ? "Blocked" : device.enabled ? "Enabled" : "Off"}</span></div>
      {!signedIn ? <p><a href="/login?return_to=%2F%3Fscreen%3Dreminders">Sign in</a> to save a device notification schedule. You can still use in-app reminders or the calendar option.</p> : unsupported ? <p>{unsupported}</p> : permission === "denied" ? <p>Notifications are blocked for this website. Open your browser’s site settings, allow notifications, then return here. Also check that your phone allows notifications from your browser or installed app.</p> : <p>Get a real notification even when the academy is closed. Your device needs an internet connection; Focus, Do Not Disturb and battery settings can delay alerts.</p>}
      {!loading && !publicKey && <p>Device notifications are awaiting server setup. Your calendar and in-app reminders still work.</p>}
      {device.enabled && device.nextAt && <p className="reminder-next">Next scheduled: {new Date(device.nextAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</p>}
      {device.lastError && <p className="feedback error">The last reminder could not be delivered. Try a test; if it fails, disable and re-enable device notifications.</p>}
      {device.enabled ? <div className="reminder-device-actions"><button className="secondary" disabled={busy || permission !== "granted"} onClick={test}><BellRing size={17}/>Send test notification</button><button className="text-btn" disabled={busy} onClick={disable}>Turn off on this device</button></div> : <button className="secondary full" disabled={busy || loading || !valid || !signedIn || !publicKey || !!unsupported || permission === "denied"} onClick={enable}><BellRing size={17}/>Enable device notifications</button>}
      <small>Enable alerts separately on each device. Schedule changes take effect after you tap Save reminder. Delivery is usually within a minute of your practice time.</small>
    </div>
    <div className="reminder-calendar"><CalendarPlus size={23}/><h3>Prefer a calendar alert?</h3><p>Add a repeating practice event to your calendar. Finish importing the file and check your calendar’s notification settings.</p><button className="secondary full" disabled={!valid || busy} onClick={calendar}>Add to my calendar <CalendarPlus size={17}/></button><small>If you change your calendar schedule, remove the old event before importing a replacement.</small></div>
    {message && <p className="feedback" role="status">{message}</p>}{error && <p className="feedback error" role="alert">{error}</p>}
  </section>;
}
