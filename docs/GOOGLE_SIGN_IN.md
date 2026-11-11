# Google sign-in

The Academy uses Better Auth's Google authorization-code flow, PKCE, signed state cookies, D1 state storage, and secure HTTP-only sessions. Its server verifies Google's ID-token signature, issuer, audience, expiry, and verified-email claim before accepting an identity. Only `openid`, `email`, and `profile` are requested. Google API access and refresh tokens are encrypted in D1; credentials remain Worker secrets. No database migration is required.

## One-time Google setup

1. Open [Google Cloud Console](https://console.cloud.google.com/). Select a project owned by the Academy operator, or create a project for Chess Infinity Academy. Use separate projects/clients for production and local testing.
2. Open **Google Auth Platform**. Configure the real app name, support email, developer contact details, and an **External** audience for a public academy. Supply accurate homepage and privacy information when Google requires it; do not enter nonexistent policy URLs. Review Google's publishing and verification requirements shown for the project before opening sign-in to everyone.
3. Under **Clients**, create an OAuth client of type **Web application**, named **Chess Infinity Academy web**.
4. Set the production authorized JavaScript origin to:

   ```text
   https://chess-infinity-academy.chessinfinity1.workers.dev
   ```

5. Set the authorized redirect URI to this exact value, including the path:

   ```text
   https://chess-infinity-academy.chessinfinity1.workers.dev/api/auth/callback/google
   ```

6. Copy the issued Client ID and Client Secret into the Cloudflare Worker's secrets. Do not commit them or paste the client secret into a chat, public issue, client code, or build output.

## Cloudflare configuration

In **Workers & Pages → chess-infinity-academy → Settings → Variables and Secrets**, add both values with type **Secret**:

| Secret | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | The Google web client's issued ID, ending in `.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | That same client's issued secret |

Alternatively, use Wrangler's hidden prompts:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
```

Deploy the tested source with the repository's normal Cloudflare command. Keep `APP_ORIGIN` set to the existing production origin. Preserve `BETTER_AUTH_SECRET`: it protects the existing sessions and OAuth token encryption. Google sign-in appears only when both credentials are configured; email/password sign-in remains available while setup is incomplete. `/api/sign-in-options` exposes only availability and, for an authenticated user, whether their own account is linked. It never returns credentials or provider tokens.

For a separate local test client, authorize `http://localhost:5173` and `http://localhost:5173/api/auth/callback/google`, then put its issued values in ignored `.dev.vars`. Never use production credentials in committed test fixtures.

## Existing accounts and progress

Google-only new accounts can use **Continue with Google** on either sign-in or create-account mode. Returning Google users resolve to the same immutable Academy user ID and existing progress.

An older email/password account may have an unverified local email. It cannot be silently claimed by a Google login with the same address. The learner signs in using their existing Academy password, opens **Preferences → Your data & account**, and uses **Link Google account** with the same email. Linking checks the live authenticated session and matching verified Google email. Existing lessons, imports, preferences, XP, and the password credential stay on that same Academy ID. Already-verified existing local accounts can link automatically under Better Auth's verified-email rules.

Google-only accounts do not receive a fabricated password. There is no new unlink button that could accidentally remove a learner's only sign-in method. Chess.com and Lichess connections are independent.

## Validation

Automated tests exercise the real Better Auth handlers and D1 with isolated Google token/JWKS responses signed by test keys. They cover new Google sign-in, returning to saved progress, safe explicit linking, rejected unverified identities, incorrect token audiences, missing state, cross-origin callback URLs, constrained redirects, and encrypted access/refresh-token storage. The authorization URL also runs in the actual Cloudflare Workers test runtime.

Before calling production Google sign-in ready, use real issued credentials and complete a real Google consent round trip. Check:

1. New Google account → Academy → complete a lesson → refresh.
2. Sign out → Continue with Google → the same account and progress return.
3. Existing password account → Preferences → link Google → sign out → Google sign-in retains progress.
4. Cancel Google, return using Back, and retry; controls recover and no success is invented.
5. A different Google email cannot be linked to a signed-in account. Test the installed mobile app and a normal mobile browser.

References: [Better Auth Google](https://better-auth.com/docs/authentication/google), [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), and [Google production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).
