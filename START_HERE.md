# Start here

The full app now runs on **Cloudflare Workers + D1**, with independent Academy accounts.

- [Open the application](https://chess-infinity-academy.chessinfinity1.workers.dev)
- [Run locally](README.md#run-locally)
- [Deploy, migrate data, and operate the service](docs/CLOUDFLARE.md)

The original ChatGPT Sites website and database are preserved. This installation does not inherit its accounts or browser storage; use the Preferences progress export/import flow. Lichess must be authorized again. This app never requests Chess.com or Lichess passwords.

For local accounts create an ignored `.dev.vars`, apply local migrations, and start the dev server as documented in README. Old documentation about simulated ChatGPT sign-in applies only to the original source snapshot, not this deployment.
