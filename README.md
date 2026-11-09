# Chess Infinity Academy

A full-stack chess training application running on Cloudflare Workers and D1. React, TypeScript, Vinext, chess.js, Stockfish, and Better Auth power interactive lessons, validated puzzles, eleven configurable opponents, game review, real game imports, and saved progress.

**[Open the academy](https://chess-infinity-academy.chessinfinity1.workers.dev)**

The application runs directly on this address. It does not redirect to ChatGPT Sites. The original ChatGPT Sites deployment and its database remain independent and unchanged.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm run install:ci
```

Create an ignored `.dev.vars` file with a strong random development secret and the exact local origin:

```dotenv
BETTER_AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters
APP_ORIGIN=http://localhost:5173
```

```sh
npm run db:migrate:local
npm run dev
```

Open `http://localhost:5173`. Sign up using the real local account flow. Local development uses an emulated D1 database; it does not use the production database or simulate ChatGPT sign-in.

```sh
npm run typecheck
npm test
npm run build
npm start
```

For `npm start` set `.dev.vars` `APP_ORIGIN` to the exact URL printed by Wrangler. Keep `wrangler` pinned to the version used by the Vite integration; upgrading it independently can change local database formats and emitted configuration compatibility.

## Deploy

See [Cloudflare deployment and data migration](docs/CLOUDFLARE.md). The checked-in `wrangler.jsonc` points at the new, separate Academy D1 database. Database IDs and account IDs are identifiers, not credentials. No secrets or database contents are committed.

```sh
npx wrangler login
# For a different account, create its D1 database and update wrangler.jsonc first.
npx wrangler secret put BETTER_AUTH_SECRET --config wrangler.jsonc
npm run deploy:cloudflare
```

Generate a strong random secret and paste it at Wrangler's hidden prompt. Set `APP_ORIGIN` to the exact HTTPS address in `wrangler.jsonc` before building. The deploy command checks types, runs tests, builds both the client and server, applies tracked D1 migrations, and deploys the generated Worker configuration. GitHub Actions validates changes; pushing source alone does not deploy Cloudflare.

## Bring your progress over

On the original website, open **Preferences → Export my progress & games**. On the new website, create an Academy account and open **Preferences → Import progress from the original site / JSON backup**. Review the counts, confirm replacement, and wait for **All changes saved**. Import supports the plain export and the device-backup envelope; it downloads a copy of current progress before replacement. Do not delete the original export.

ChatGPT identities and login sessions cannot transfer to this independent host. Lichess authorization and installed offline packs must be set up again on the new domain. Chess.com uses linked public profiles, never Chess.com passwords or an invented OAuth login. See migration limits in [the deployment guide](docs/CLOUDFLARE.md).

## Source layout

| Folder | Contents |
| --- | --- |
| `app/`, `components/`, `hooks/` | React UI, login pages, API routes |
| `lib/chess/` | Lessons, puzzles, bots, analysis, imports, training |
| `lib/auth*`, `db/auth-schema.ts` | Better Auth sessions and credential storage |
| `public/`, `offline/`, `data/` | Stockfish WASM, icons, installable/offline app, puzzle provenance |
| `db/`, `drizzle/` | D1 schema and versioned migrations |
| `worker/`, `scripts/`, `vendor/` | Worker entry, build tooling, vendored packages |
| `tests/`, `.github/workflows/` | Automated checks and CI |
| `docs/` | Deployment, migration, QA, and historical design notes |

The root `index.html` is a static GitHub Pages launch page with a link to the independent application. The `.openai/` files and imported source notes describe the original export; Cloudflare deployment uses `wrangler.jsonc`, not the Sites publishing tools. Do not redeploy the original Site while maintaining this independent installation.

## Licenses

Retain third-party notices. Stockfish is GPLv3; chess.js is BSD-2-Clause; the included Lichess puzzle selection has CC0/provenance notices. See `public/engine/`, `public/puzzles-LICENSE.txt`, `public/chess-js-LICENSE.txt`, and `vendor/`. No paid courses or external player statistics are fabricated.
