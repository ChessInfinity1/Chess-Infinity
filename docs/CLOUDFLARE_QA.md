# Cloudflare deployment validation — 2026-11-09 UTC

Deployment address: https://chess-infinity-academy.chessinfinity1.workers.dev

Worker version: `b82bb577-0a22-4f43-a913-7574d8fd78c0`.

## Automated checks

TypeScript passed, production build passed, and **103 automated tests passed**. Coverage includes 2,506 legal puzzle solutions, lesson lines, legal moves and special moves, eleven bot policies, bot clocks, game review perspective/history/mate handling, provider failures, full archive pagination, optimistic saves, account isolation, offline storage, and import validation. A separate bundled test executes scrypt credential creation, login/logout, and D1 persistence inside the actual Workers emulator rather than only Node.js.

## Live Cloudflare service checks

An isolated temporary verification Worker called the deployed app through a service binding. All of these checks passed against the **real deployed Worker and D1**, with synthetic disposable accounts:

- Health endpoint confirms database tables and configured authentication.
- Anonymous progress requests return 401.
- Registration hashes a password in the deployed runtime and returns Secure/HttpOnly cookies.
- Visitor-supplied ChatGPT identity headers do not authenticate.
- An authenticated save returns version 1; a new request reads the saved XP/lesson.
- A stale version returns 409; a cross-origin save returns 403.
- A second account cannot read the first account's progress.
- Logout revokes the session, and its old cookie is rejected.
- Signing back in preserves the prior saved progress.
- Chess.com returns the real `eliamgm` public profile, avatar, and 40 recent games.

Synthetic accounts and their progress were removed by the verifier's cleanup. The temporary verification Worker and its result row are removed after collecting this report. No original Site database is accessed.

## Live browser checks

- The application opens directly at the workers.dev URL without a Sites redirect.
- First-use onboarding renders and can be skipped.
- A promotion puzzle opens a real promotion selector; `g8=Q#` is accepted as checkmate. The board-based explanation quiz and save action work.
- Luna (Stockfish) responds legally to `e4`. Its clock falls from `10:00.0` to `9:58.9` and control returns to the player.
- A completed `1. f3 e5 2. g4 Qh4#` PGN loads and runs all four half-moves through Stockfish. Review marks `g4` a blunder and `Qh4#` best, with perspective-correct explanations and legal comparison lines.
- Review findings save to the game library.
- After a page reload the guest's 20 training XP, one puzzle attempt, and one saved game remain.
- Login/registration and backup import controls render on the independent domain.

## Boundaries

A production credential account was exercised through server-side service requests; the browser test does not use or request a real user's password. Lichess's final consent/token exchange requires the owner of a Lichess account and was not completed as that user. Tests cover its existing request/callback logic and provider error handling, but do not claim a newly authorized external account. No email verification/recovery service is configured. No physical mobile device or large-traffic load test was performed during deployment. Existing responsive layouts and offline behavior retain automated regression coverage; local preview infrastructure could not start, so browser checks used the new public deployment.

The original website and its user records remain unchanged. Old identities, tokens, browser storage, and installed offline packs do not transfer automatically; use the migration procedure in CLOUDFLARE.md.
