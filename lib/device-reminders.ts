import type { ReminderSchedule } from "./reminder-schedule";
export type DeviceReminderStatus = { enabled: boolean; schedule?: ReminderSchedule | null; nextAt?: number | null; lastError?: string | null };
export function notificationSupport() {
  if (!window.isSecureContext) return "Open the secure HTTPS website to enable notifications.";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia("(display-mode: standalone)").matches && !(navigator as Navigator & { standalone?: boolean }).standalone) return "On iPhone or iPad, add Chess Infinity to your Home Screen, open the installed app, then enable notifications here.";
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) return "This browser does not support device notifications. Open Chess Infinity in Chrome, Edge, Firefox or an installed Safari app, or use a calendar alert below.";
  return "";
}
export async function reminderApi<T>(action: string, subscription: PushSubscription, schedule?: ReminderSchedule): Promise<T> {
  const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, subscription: action === "save" ? subscription.toJSON() : { endpoint: subscription.endpoint }, schedule }), signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) {
    if (action === "test" && [404, 410].includes(response.status)) await subscription.unsubscribe().catch(() => false);
    throw Object.assign(new Error(typeof data?.error === "string" ? data.error : "Reminders could not be saved. Check your connection and retry."), { status: response.status });
  }
  return data as T;
}
export async function deviceSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration("/"))?.pushManager?.getSubscription() ?? null;
}
function applicationKey(value: string) {
  try {
    const key = Uint8Array.from(atob(value.trim().replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    if (key.length !== 65 || key[0] !== 4) throw new Error();
    return key;
  } catch { throw new Error("The notification server key is invalid. Please contact the academy owner."); }
}
export function notificationError(error: unknown) {
  const e = error as Error;
  if (e?.name === "NotAllowedError") return "Notifications are blocked. Allow alerts in this browser’s site settings and in your phone’s notification settings, then try again.";
  if (e?.name === "InvalidStateError") return "The browser’s notification registration needs repair. Tap Repair device notifications, then retry.";
  if (e?.name === "AbortError" || e?.name === "TimeoutError") return "The notification connection took too long. Check your internet connection and try again. On Android, open the academy directly in Chrome.";
  return e?.message || "Notifications could not be enabled. Please try again.";
}
async function readyRegistration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Use the active registration returned by ready, not a newly installing registration.
    return await Promise.race([navigator.serviceWorker.ready, new Promise<ServiceWorkerRegistration>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("The app is still updating. Reload and try again.")), 15000);
    })]);
  } finally { clearTimeout(timeout); }
}
async function requestNotificationPermission() {
  const unsupported = notificationSupport(); if (unsupported) throw new Error(unsupported);
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "Notifications are blocked. Allow notifications for this website in your browser’s site settings, then try again." : "Notifications were not enabled. Tap Enable device notifications when you are ready.");
}
export async function showDeviceNotificationTest() {
  await requestNotificationPermission();
  const registration = await readyRegistration();
  await registration.showNotification("Your Chess Infinity device alert", { body: "If you can see this, device alerts work. Use Send push test to check delivery from the academy.", icon: "/icon-192.png", tag: "chess-infinity-device-test", data: { url: "/?screen=reminders" } });
}
export async function enableDeviceReminder(publicKey: string, schedule: ReminderSchedule, repair = false) {
  // Called directly from the learner's button press. Never ask on mount or after a fetch.
  await requestNotificationPermission();
  const registration = await readyRegistration();
  let subscription = await registration.pushManager.getSubscription();
  const key = applicationKey(publicKey);
  const existing = subscription?.options?.applicationServerKey;
  const matches = !!existing && new Uint8Array(existing).length === key.length && new Uint8Array(existing).every((b, i) => b === key[i]);
  if (subscription && (repair || !matches)) {
    // Never delete a working server schedule just because a browser subscription was reused.
    const old = subscription;
    if (!await old.unsubscribe()) throw new Error("The old browser subscription could not be replaced. Reload the academy and try again.");
    await reminderApi("remove", old);
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const status = await reminderApi<DeviceReminderStatus>("save", subscription, schedule);
  return { subscription, status };
}
export async function disableDeviceReminder() {
  const subscription = await deviceSubscription();
  if (!subscription) return;
  await reminderApi("remove", subscription);
  await subscription.unsubscribe();
}
