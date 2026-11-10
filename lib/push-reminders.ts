import { buildPushPayload } from "@block65/webcrypto-web-push";
import { nextReminderAt, parseReminderSchedule, reminderDayAt, type ReminderSchedule } from "./reminder-schedule.ts";

export type ReminderEnv = { DB?: D1Database; APP_ORIGIN?: string; VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string };
type Subscription = { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } };
type Row = { id: string; user_id: string; subscription: string; schedule: string; next_send_at: number; last_local_day: string | null; lease_until: number | null; failures: number; last_error: string | null; last_test_at: number | null; updated_at: number };
export function pushConfigured(env: ReminderEnv) { return !!(env.DB && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT); }
export function validPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const u = new URL(value), h = u.hostname;
    return u.protocol === "https:" && !u.username && !u.password && !u.hash && (!u.port || u.port === "443") && (
      h === "fcm.googleapis.com" || h === "updates.push.services.mozilla.com" || h === "push.services.mozilla.com" || h === "web.push.apple.com" || h.endsWith(".notify.windows.com")
    );
  } catch { return false; }
}
function keyBytes(s: unknown, length: number) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]+$/.test(s)) return false;
  try { return atob(s.replace(/-/g, "+").replace(/_/g, "/")).length === length; } catch { return false; }
}
function parseSubscription(value: unknown): Subscription {
  const s = value as Subscription | null;
  if (!s || !validPushEndpoint(s.endpoint) || !keyBytes(s.keys?.auth, 16) || !keyBytes(s.keys?.p256dh, 65) || atob(s.keys.p256dh.replace(/-/g, "+").replace(/_/g, "/")).charCodeAt(0) !== 4) throw new Error("This browser returned an invalid notification subscription. Disable notifications, then enable them again.");
  return { endpoint: s.endpoint, expirationTime: null, keys: { auth: s.keys.auth, p256dh: s.keys.p256dh } };
}
async function subscriptionId(endpoint: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint)))).map(b => b.toString(16).padStart(2, "0")).join(""); }
function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } }); }
async function deliver(env: ReminderEnv, subscription: Subscription, test: boolean, now: number, send: typeof fetch) {
  const payload = await buildPushPayload({ data: { title: test ? "Your practice reminders are ready" : "A little chess. A stronger next move.", body: test ? "This is your Chess Infinity test notification." : "Your practice time is here. Start a lesson or solve a puzzle.", url: "/?screen=learn", tag: test ? "chess-infinity-test" : "chess-infinity-practice", sentAt: now }, options: { ttl: test ? 300 : 3600, urgency: "normal", topic: test ? "practice-test" : "practice-reminder" } }, subscription, { subject: env.VAPID_SUBJECT!, publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY! });
  return send(subscription.endpoint, { ...payload, redirect: "error", signal: AbortSignal.timeout(10000) });
}
export async function handleReminderRequest(request: Request, env: ReminderEnv, userId: string | null, now = Date.now(), send: typeof fetch = fetch): Promise<Response> {
  if (request.method === "GET") return json({ configured: pushConfigured(env), publicKey: pushConfigured(env) ? env.VAPID_PUBLIC_KEY : null });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!userId) return json({ error: "Sign in to enable notifications on this device." }, 401);
  if (!env.APP_ORIGIN || request.headers.get("origin") !== env.APP_ORIGIN || new URL(request.url).origin !== env.APP_ORIGIN) return json({ error: "Request origin not allowed." }, 403);
  if (!env.DB) return json({ error: "Reminder storage is unavailable. Please try again." }, 503);
  let body;
  try { const raw = await request.text(); if (raw.length > 8192) return json({ error: "Request is too large." }, 413); body = JSON.parse(raw); } catch { return json({ error: "Invalid reminder request." }, 400); }
  if (!body || !["status", "save", "remove", "test"].includes(body.action) || !validPushEndpoint(body.subscription?.endpoint)) return json({ error: "Invalid reminder request." }, 400);
  const id = await subscriptionId(body.subscription.endpoint), db = env.DB;
  if (body.action === "remove") { await db.prepare("DELETE FROM practice_push WHERE id = ? AND user_id = ?").bind(id, userId).run(); return json({ enabled: false }); }
  if (body.action === "status") {
    const row = await db.prepare("SELECT schedule, next_send_at, last_error FROM practice_push WHERE id = ? AND user_id = ?").bind(id, userId).first<Pick<Row, "schedule" | "next_send_at" | "last_error">>();
    return json({ enabled: !!row, schedule: row ? JSON.parse(row.schedule) : null, nextAt: row?.next_send_at ?? null, lastError: row?.last_error ?? null });
  }
  if (!pushConfigured(env)) return json({ error: "Device notifications are not configured on the server yet. In-app and calendar reminders are still available." }, 503);
  if (body.action === "save") {
    let subscription: Subscription, schedule: ReminderSchedule;
    try { subscription = parseSubscription(body.subscription); schedule = parseReminderSchedule(body.schedule); } catch (e) { return json({ error: (e as Error).message }, 400); }
    // Retain today's delivery marker when editing the same device's schedule.
    const old = await db.prepare("SELECT last_local_day FROM practice_push WHERE id = ? AND user_id = ?").bind(id, userId).first<{ last_local_day: string | null }>();
    const nextAt = nextReminderAt(schedule, now, old?.last_local_day ?? undefined);
    const saved = await db.prepare("INSERT INTO practice_push (id, user_id, subscription, schedule, next_send_at, last_local_day, updated_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM practice_push WHERE user_id = ? AND id != ?) < 5 ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, subscription=excluded.subscription, schedule=excluded.schedule, next_send_at=excluded.next_send_at, last_local_day=excluded.last_local_day, lease_until=NULL, failures=0, last_error=NULL, updated_at=excluded.updated_at RETURNING id").bind(id, userId, JSON.stringify(subscription), JSON.stringify(schedule), nextAt, old?.last_local_day ?? null, now, userId, id).first();
    if (!saved) return json({ error: "Notifications are already enabled on five devices. Disable one before adding another." }, 409);
    return json({ enabled: true, schedule, nextAt });
  }
  // A conditional update rate-limits tests atomically, including concurrent requests.
  const row = await db.prepare("UPDATE practice_push SET last_test_at = ? WHERE id = ? AND user_id = ? AND (last_test_at IS NULL OR last_test_at <= ?) RETURNING subscription").bind(now, id, userId, now - 60000).first<{ subscription: string }>();
  if (!row) {
    const exists = await db.prepare("SELECT id FROM practice_push WHERE id = ? AND user_id = ?").bind(id, userId).first();
    return json({ error: exists ? "Wait a minute before sending another test." : "Enable notifications on this device first." }, exists ? 429 : 404);
  }
  try {
    const result = await deliver(env, JSON.parse(row.subscription), true, now, send);
    if ([404, 410].includes(result.status)) { await db.prepare("DELETE FROM practice_push WHERE id = ? AND user_id = ?").bind(id, userId).run(); return json({ error: "This device subscription expired. Enable notifications again." }, 410); }
    if (!result.ok) return json({ error: "The push service did not accept the test. Please try again later." }, 502);
    return json({ accepted: true });
  } catch { return json({ error: "The notification could not be sent. Check your connection and retry." }, 502); }
}

export async function sendDueReminders(env: ReminderEnv, now = Date.now(), send: typeof fetch = fetch) {
  if (!pushConfigured(env)) return { configured: false, sent: 0 };
  const db = env.DB!;
  const due = await db.prepare("SELECT * FROM practice_push WHERE next_send_at <= ? AND (lease_until IS NULL OR lease_until < ?) ORDER BY next_send_at LIMIT 10").bind(now, now).all<Row>();
  let sent = 0;
  for (const row of due.results) {
    const lease = now + 5 * 60000;
    const claimed = await db.prepare("UPDATE practice_push SET lease_until = ? WHERE id = ? AND next_send_at = ? AND (lease_until IS NULL OR lease_until < ?) RETURNING id").bind(lease, row.id, row.next_send_at, now).first();
    if (!claimed) continue;
    const schedule = parseReminderSchedule(JSON.parse(row.schedule)), day = reminderDayAt(now, schedule.timeZone);
    const progress = await db.prepare("SELECT data, updated_at FROM progress WHERE user_id = ?").bind(row.user_id).first<{ data: string; updated_at: string }>();
    let skip = now - row.next_send_at > 2 * 3600000 || row.last_local_day === day;
    if (progress) {
      const p = JSON.parse(progress.data), r = p.practiceReminder;
      // Explicitly turning the routine off on another device stops queued alerts.
      if (r?.enabled === false && Date.parse(progress.updated_at) >= row.updated_at) { await db.prepare("DELETE FROM practice_push WHERE id = ? AND lease_until = ?").bind(row.id, lease).run(); continue; }
      skip ||= Array.isArray(p.days) && p.days.includes(day) || r?.dismissedDay === day;
      if (!skip && typeof r?.snoozeUntil === "string" && Date.parse(r.snoozeUntil) > now) {
        await db.prepare("UPDATE practice_push SET next_send_at = ?, lease_until = NULL WHERE id = ? AND lease_until = ?").bind(Date.parse(r.snoozeUntil), row.id, lease).run(); continue;
      }
    }
    if (skip) { await db.prepare("UPDATE practice_push SET next_send_at = ?, lease_until = NULL, failures = 0 WHERE id = ? AND lease_until = ?").bind(nextReminderAt(schedule, now, day), row.id, lease).run(); continue; }
    let response: Response | undefined;
    try { response = await deliver(env, parseSubscription(JSON.parse(row.subscription)), false, now, send); } catch { /* Only a safe error code is stored below. */ }
    if (response?.ok) {
      sent++;
      await db.prepare("UPDATE practice_push SET next_send_at = ?, last_local_day = ?, lease_until = NULL, failures = 0, last_error = NULL WHERE id = ? AND lease_until = ?").bind(nextReminderAt(schedule, now, day), day, row.id, lease).run();
    } else if (response && [404, 410].includes(response.status)) {
      await db.prepare("DELETE FROM practice_push WHERE id = ? AND lease_until = ?").bind(row.id, lease).run();
    } else {
      const failures = row.failures + 1, next = failures >= 5 ? nextReminderAt(schedule, now, day) : now + Math.min(60, 2 ** failures) * 60000;
      await db.prepare("UPDATE practice_push SET next_send_at = ?, lease_until = NULL, failures = ?, last_error = ? WHERE id = ? AND lease_until = ?").bind(next, failures >= 5 ? 0 : failures, response && [401, 403].includes(response.status) ? "configuration" : "delivery", row.id, lease).run();
    }
  }
  return { configured: true, sent };
}
