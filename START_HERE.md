# Chess Infinity Academy — complete source export

This archive contains the source snapshot used by the published Chess Infinity Academy app, plus this setup guide and an export manifest. Exporting it does not change, redeploy, or unpublish the existing website.

## Quick start on your computer

1. Install Node.js 24 LTS and npm. The project's minimum Node version is 22.13.0. Windows, macOS, and Linux are supported by the portable scripts.
2. Extract the ZIP. Open a terminal inside the `Chess-Infinity-Academy` folder containing `package.json`.
3. Install the exact locked dependencies:

   ```sh
   npm run install:ci
   ```

4. Start the development app:

   ```sh
   npm run dev
   ```

5. Open the local address printed in the terminal, normally `http://localhost:5173`.
6. Use guest mode for device-local progress, lessons, puzzles, and local chess training. Stop the server with Ctrl+C.

The installer downloads dependencies, so an internet connection is needed for initial setup. Stockfish's JavaScript and WebAssembly engine files, puzzle content, icons, and the offline training bundle are included in this ZIP. A clean extracted copy defaults to the portable execution profile; no ChatGPT workspace helper is required to run these commands.

## Local database and simulated sign-in

Guest progress is kept in the browser. To test account-based saving locally, first build and initialize the emulated D1 database:

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tearful_gunslinger.sql
npm run dev
```

Apply that migration once to a fresh local database. Do not repeatedly apply the initial migration to an existing database.

In the development server on localhost, open `/signin-with-chatgpt?return_to=/` to use the included **simulated local development identity**. It is not a real ChatGPT login. The mock identity is only supported on loopback development requests; it is not included in production builds. Local database files stay in `.wrangler/state` and are separate from the live app's database.

The existing app's real production account authentication is provided by ChatGPT Sites. Moving the app to a different host requires configuring equivalent secure authentication and a D1 database; copying the source does not transfer hosted identity or cloud records. Do not trust user-supplied identity headers on an unprotected production server.

## Build and verification

```sh
npm run typecheck
npm test
npm run build
```

To preview the built Cloudflare Worker locally:

```sh
npm start
```

Use the URL printed by Wrangler. The built preview does not simulate sign-in; use the development server for the local mock-login flow. `npm run build` generates `dist/` and rebuilds the independent offline training pack. None of these commands publishes changes to the live website.

## What is included

- `app/`, `components/`, `hooks/`, `lib/`: application source, UI, chess rules integration, curriculum, bots, review, progress, and account import logic.
- `public/`: bundled Stockfish JS/WASM, icons, manifest, service worker, offline training assets, and license notices.
- `data/`, `offline/`: puzzle source/provenance data and offline app source.
- `db/`, `drizzle/`, `drizzle.config.ts`: database schema, migrations, and migration configuration.
- `worker/`, `scripts/`, `vendor/`: server entrypoint, development/build scripts, vendored integrations, and notices.
- `tests/`, `.github/workflows/`: automated checks and CI configuration.
- `docs/`, `README.md`: implementation notes, feature limitations, licensing, and existing QA records. Older README sections describe previous releases; the files in this export are the current snapshot.
- `package.json`, `package-lock.json`, TypeScript/Vite/Next/PostCSS configuration, `.npmrc`, `.gitignore`, and `.openai/hosting.json`.
- `EXPORT_MANIFEST.json`: source revision and export details.
- `SOURCE_CHECKSUMS.sha256`: SHA-256 hashes for every file in the original source snapshot.

The existing hosting manifest is preserved for reference. Its project ID identifies the existing app; it is not a password. Do not reuse it to publish a separate copy. Follow the host's setup workflow to create a new project if you later choose to deploy elsewhere.

## External connections and limitations

- **Chess.com:** uses its public profile/game APIs; no Chess.com password or OAuth secret is included. Live imports need network access and remain subject to provider availability and limits.
- **Lichess:** uses OAuth authorization-code PKCE and secure server cookies. Actual authorization requires the supported HTTPS hosting/authentication setup. Localhost development does not reproduce all hosted cookie and authorization behavior.
- **Cloud progress:** the production D1 database, signed-in user records, imported personal game collections, and authentication cookies are not part of a source export. The app's Preferences page provides a separate progress/game export for an authorized user.
- **Offline mode:** included training assets work through the app's offline pack. Provider sync, cloud saving, and online endgame/opening services still need connectivity.
- **Hosting:** this is a full-stack Worker application, not a static GitHub Pages website. A static host alone cannot run the API routes, database, or authentication.

No live secrets, OAuth tokens, cookies, local environment files, database backups, dependency installations, Git credentials/history, or machine-specific runtime caches are included. `node_modules/` and generated `dist/` output are recreated by the installation/build commands above.

## Licenses

Keep the included notices when sharing or deploying this code. Stockfish is GPLv3; its license and upstream source/build pointers are in `public/engine/`. chess.js is BSD-2-Clause. The selected Lichess puzzle data includes its CC0/provenance notices. Original curriculum and vector pieces are included with the app. Third-party npm packages retain their upstream licenses, which are installed with the dependencies.

For more detailed platform behavior, read `docs/PLATFORM.md`. For the most recent review implementation, read `docs/game-review-update.md`.
