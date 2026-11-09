# Export verification

- Published source: version 20, commit `a1d3d5ab693c99ae0987f20011f9a6c40b71b63f`.
- All 244 original source files match the published Git snapshot byte for byte.
- A clean portable copy installed successfully from `package-lock.json`.
- `npm run typecheck`: passed.
- `npm test`: 99 passed, 0 failed.
- `npm run build`: passed and generated the Worker and client assets.
- ZIP extraction and every original source checksum were verified.
- No source push, deployment, access-policy change, production database change, or live website modification was performed for this export.

Dependencies, runtime caches, the generated build, live credentials, and production user records are excluded. Recreate dependencies and build output using START_HERE.md. Authentication, external-provider authorization, and production deployment were not exercised by this source-export verification.
