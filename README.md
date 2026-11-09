# Chess Infinity Academy

Complete source code for the Chess Infinity Academy app: interactive lessons, validated puzzles, legal chessboards, local bots, Stockfish reviews, Chess.com public game imports, Lichess authorization, and saved training progress.

## Open the app

- [GitHub launch link](https://chessinfinity1.github.io/Chess-Infinity/)
- [Full hosted application](https://chess-infinity-academy.martinezfamily.chatgpt.site/)

The GitHub Pages entry page opens the full hosted application. GitHub Pages serves static files; the authenticated APIs, D1 database, Lichess server cookies, and cloud progress run on the existing ChatGPT Sites host. The app is not independently running its server on GitHub Pages.

## Run locally

Use Node.js 24 LTS. From the repository root:

```sh
npm run install:ci
npm run dev
```

Open the localhost URL printed in the terminal, normally `http://localhost:5173`.

See [START_HERE.md](START_HERE.md) for database initialization, local simulated sign-in, build instructions, licenses, and hosting requirements.

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions runs these checks on pushes and pull requests. CI does not redeploy the existing production app.

## Source layout

| Folder | Contents |
| --- | --- |
| `app/`, `components/`, `hooks/` | React UI, pages, and API routes |
| `lib/chess/` | Curriculum, puzzles, bots, analysis, chess rules integration, imports |
| `public/` | Stockfish JS/WASM, icons, offline assets, service worker, notices |
| `data/`, `offline/` | Puzzle provenance and offline app source |
| `db/`, `drizzle/` | Database schema and migrations |
| `worker/`, `scripts/`, `vendor/` | Worker entrypoint, build tooling, vendored dependencies |
| `tests/`, `.github/workflows/` | Automated validation and CI |
| `docs/` | Design notes, feature limits, and QA records |

The existing root `index.html` is intentionally preserved as the GitHub Pages launch page. `.nojekyll` keeps Pages from interpreting the full app source as Jekyll templates.

## Deployment architecture

This is a full-stack Cloudflare Worker app, not a static Next.js export. Keep the existing backend or configure a compatible Worker host, D1 database, and secure authentication before migrating it. A different host does not inherit ChatGPT Sites authentication or user records. Production must not trust arbitrary visitor-supplied identity headers.

Pushing to this repository runs validation only. Backend code changes still need a separate deployment to the configured application host. No production database, OAuth tokens, passwords, or local environment files are included.

Imported app source corresponds to published version 20, commit `a1d3d5ab693c99ae0987f20011f9a6c40b71b63f`. The source-export checksums describe that original snapshot. This README, the CI workflow, and `.nojekyll` are repository-specific additions/changes. Historical app documentation is preserved in [docs/IMPORTED_SOURCE_README.md](docs/IMPORTED_SOURCE_README.md).

## Licenses

Preserve the included notices. Stockfish is GPLv3; chess.js is BSD-2-Clause; selected Lichess puzzle content carries its included CC0/provenance notices. Third-party packages retain their upstream licenses. See `public/engine/`, `public/puzzles-LICENSE.txt`, `public/chess-js-LICENSE.txt`, and `vendor/`.
