# Practice reminder repair

The previous feature only displayed a Home-page banner while the page was open. Calendar exports required a separate import into a calendar; there was no Web Push subscription, push handler, or background delivery service.

## Behavior

- Learners sign in, choose a time and days, then explicitly tap **Enable device notifications**. No browser permission is requested on page load. The API only saves a subscription after the browser grants permission.
- Encrypted Web Push wakes the existing service worker with the app closed. A one-minute Cloudflare Cron Trigger selects indexed due records from D1. Notification taps open the learning path.
- Each device stores its selected IANA timezone and next UTC delivery time. DST transitions and offsets such as Kathmandu are handled without assuming the server's local timezone. A nonexistent spring-forward time shifts forward by the clock change; an already delivered local date is not repeated at the fall-back transition. Save again after changing the device's timezone or schedule.
- Synced practice dates, dismissals and snoozes suppress or defer due alerts. Unsynced offline training cannot suppress a server reminder until imported/synced. Turning the reminder routine off in newer cloud progress removes queued device subscriptions. Disabling only device notifications preserves the in-app schedule. Deleting Academy progress removes its push subscriptions too.
- A test uses the same encryption, push provider and service-worker path as scheduled reminders. Provider acceptance is labeled as acceptance; a worker message separately confirms when `showNotification` has completed. This cannot prove the person saw it or bypass OS notification settings.
- Expired endpoints are deleted; temporary provider/network errors retry with bounded backoff. Conditional D1 leases prevent concurrent cron invocations from claiming the same delivery. Late reminders older than two hours are skipped. Tests are rate-limited; an account may enable at most five devices, enforced atomically.
- In-app nudges also appear on other academy browsing screens. Games and exercises remain uninterrupted. Calendar export stays available, with safer mobile download handling.

## Deploy to the existing Worker

No changes to the original ChatGPT Site or authentication secrets are required. The new additive migration only creates `practice_push` and its indexes; it does not alter existing accounts or progress.

1. Authenticate Wrangler to the existing Cloudflare account. Do not change the account or D1 IDs in `wrangler.jsonc`.
2. Run `node scripts/configure-push.mjs`. It generates P-256 VAPID keys in memory, sends them through stdin to Wrangler's secret bulk command, and never writes or prints key material. It refuses to rotate existing/partially configured keys automatically. `VAPID_SUBJECT` uses the existing public application origin.
3. Run `npm run deploy:cloudflare` to check, build, apply migration `0003_nebulous_sersi.sql` and deploy the Worker with its cron trigger. Keep `BETTER_AUTH_SECRET` and `ACADEMY_OWNER_USER_ID` unchanged.
4. Confirm `/api/reminders` returns `configured: true` and only the public key. Check the Cloudflare Cron Trigger is `* * * * *`; new triggers can take up to 15 minutes to propagate.
5. Sign in on a real supported device, open Practice reminders, enable notifications, and send a test. Set the schedule a few minutes ahead, close the app, and verify a real scheduled alert. Then test skip-after-practice, disable, and notification-tap navigation. Browser/OS settings and the learner's permission cannot be verified from server tests alone.

The API requires a verified Academy session and the exact application Origin for changes; user IDs are taken from the session. Subscription endpoints are restricted to known HTTPS push-provider hosts, redirects are rejected, and network calls have deadlines. Private VAPID keys stay server-only. GET exposes no subscriptions or user data. Subscription endpoints and encryption keys must be treated as private delivery capabilities, not logged, put in URLs, or included in progress exports. The database foreign key removes subscriptions with a deleted auth account.

Android browsers/PWAs need notification permission and OS notification access. iOS/iPadOS require a supported Home Screen web app. Focus/Do Not Disturb, offline devices and battery restrictions can delay delivery; this is not an exact alarm service.

## Validation

`tests/reminder-notifications.test.mjs` covers real D1 migrations and persistence, authenticated boundary checks, cross-user denial, invalid endpoints/schedules, atomic device limits, test rate limits, AES-128-GCM payload decryption, VAPID headers, real Workers-runtime cryptography, concurrent cron claims, local practice suppression, disable/snooze, retries and expiry, DST/timezones, and safe service-worker notification taps. The complete project typecheck, tests and production build must pass before deployment.
