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
function applicationKey(value: string) { return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)); }
export async function enableDeviceReminder(publicKey: string, schedule: ReminderSchedule) {
  const unsupported = notificationSupport(); if (unsupported) throw new Error(unsupported);
  // Called directly from the learner's button press. Never ask on mount or after a fetch.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "Notifications are blocked. Allow notifications for this website in your browser’s site settings, then try again." : "Notifications were not enabled. Tap Enable device notifications when you are ready.");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error("The app is still updating. Reload and try again.")), 15000))]);
  let subscription = await registration.pushManager.getSubscription();
  const key = applicationKey(publicKey);
  if (subscription) {
    await reminderApi("remove", subscription); await subscription.unsubscribe(); subscription = null;
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
