# Independent Cloudflare deployment

## Resources and boundaries

- Application: `https://chess-infinity-academy.chessinfinity1.workers.dev`
- Worker: `chess-infinity-academy`
- D1: `chess-infinity-academy`, binding `DB`
- D1 ID: `34c90791-5167-4210-88a1-6ff117005332`
- Server entry: `worker/index.ts`; built entry: `dist/server/index.js`
- Configuration: `wrangler.jsonc`; generated deployment configuration: `dist/server/wrangler.json`
- Secret: `BETTER_AUTH_SECRET`, stored as a Cloudflare Worker secret, never a Vite public variable.
- Public variable: `APP_ORIGIN`, exact HTTPS origin, used for auth callback and origin validation.

The original ChatGPT Sites deployment, data, and identity provider are not modified. The `.openai/hosting.json` identity remains historical source provenance; it is not used to publish this deployment.

No paid Cloudflare upgrade is enabled by this setup. Usage is subject to the account plan and Cloudflare's current quotas. Stockfish and bot calculation run in browser workers, rather than consuming server CPU. Static assets use Cloudflare's asset hosting. Watch real traffic and D1 storage usage in the Cloudflare dashboard before opening a large public campaign.

## Authentication

Better Auth uses D1-backed users, credential accounts, sessions, and rate limits. Passwords are scrypt hashes with random salts; HTTPS session cookies are Secure, HttpOnly, and SameSite=Lax. Session lookup verifies the signed cookie against D1, and logout revokes it. Visitor-supplied `oai-authenticated-user-*` headers are stripped and never authenticate a user. Cross-origin authentication mutations are rejected. Login and registration have stricter rate limits keyed from Cloudflare's connecting IP header.

Accounts are separate from ChatGPT, Chess.com and Lichess. Email delivery is **not configured**: email verification and forgotten-password recovery are not enabled or falsely represented as working. The registration form discloses this; use a password manager. Configure and test a transactional email provider before enabling email verification/recovery. Never grant identity or merge accounts merely because two unverified email addresses match.

## Database and deployment

Install dependencies with Node 24 and `npm run install:ci`. Use the pinned Wrangler and Vite plugin versions together.

1. Authenticate with Wrangler on the target Cloudflare account.
2. If deploying to another account, create a **new** D1 database and change its ID, account ID, and origin in `wrangler.jsonc`. Do not use the original Sites database.
3. Generate a strong random secret and set it with `npx wrangler secret put BETTER_AUTH_SECRET --config wrangler.jsonc`.
4. Run `npm run deploy:cloudflare`. This applies pending SQL migrations before deploying the tested build.
5. Check `/api/health`, sign up a test account, solve a puzzle, save a game, refresh, sign out and in, and verify the same saved progress.

The D1 migration journal prevents duplicate applications. `0000` creates progress storage; `0001` adds independent authentication. Existing progress rows are not dropped. Optimistic version checks reject conflicting device saves instead of silently overwriting them. Failed saves keep a local pending backup and can be retried from Preferences.

Deploys through GitHub need a separately configured scoped Cloudflare API token and an explicit deployment workflow or Cloudflare Git integration. Current GitHub CI only validates. Do not upload Wrangler's OAuth access/refresh tokens to the repository or reuse an interactive login token as a CI secret.

## Data migration

Migration is **per user, explicit, and file based**. The old database cannot be accessed from this Worker and no privileged bulk export is available here. Users retain the original website and their existing data.

1. Open the original website on the browser/account where the data is stored.
2. Preferences → **Export my progress & games**. Keep the JSON in a safe place.
3. Open the new website, register a new Academy account, then Preferences → **Import progress from the original site / JSON backup**.
4. Review the displayed lesson, puzzle, and game counts. Confirmation replaces progress on the current new account, after downloading a backup of its previous state.
5. Wait for **All changes saved**. Refresh and check the records.

Supported data includes lesson completions and dates, puzzle attempts/rating, training XP/streak dates, saved games and analyses, opening repertoires and review dates, public connected profile metadata, preferences, training plans, arcade history, assessments, guided sessions, and mistake-practice records. The importer accepts plain progress JSON and the device backup's `{data,version,pending}` envelope. It checks record shapes and replays each imported game with chess.js; malformed files leave current progress unchanged. Remote version and user identity values in the old file are never copied to the new database identity.

Limits and nonportable data:

- ChatGPT accounts, passwords, login sessions, and old user IDs cannot migrate. Create a new Academy account.
- Browser localStorage, installed PWA state, service-worker caches, and downloaded offline packs are scoped to the old origin. Export/import progress; install and download offline practice again on the new origin.
- Lichess OAuth cookies/tokens cannot migrate. Reauthorize Lichess after signing in. Imported PGNs/profile metadata remain usable without transferring a token.
- A Chess.com linked public username is not proof of account ownership; it can be imported or linked again without an external password.
- Notification permission and external calendar reminders must be renewed/updated on the new domain. Calendar files exported on the old domain still contain the old URL.
- The import limit is 1.8 MB and cloud progress requests are capped below D1's single-row limit. Very large collections need individual PGN exports or a future normalized game table; do not delete the original data when a file exceeds the limit.
- This deployment preserves existing feature limits. The coach provides engine-supported facts and rule-based plans; no conversational language-model service or email service is connected. Lichess studies/unlimited imports are not newly invented by this migration.

## Operations and rollback

`/api/health` checks D1 tables and required auth configuration, and returns no user data. Authentication/progress responses and HTML are private/no-store. APIs preserve upstream Chess.com/Lichess failures rather than inventing results. The original website remains available throughout failures or rollback.

Use Cloudflare's Worker versions for code rollback. Do not reverse or drop database migrations containing user data; take a D1 export before schema changes. Keep the authentication secret stable across deploys; changing it invalidates sessions. GitHub contains source, configuration, and migrations only—not production user records or secrets.
