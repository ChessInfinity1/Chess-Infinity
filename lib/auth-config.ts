import { betterAuth } from "better-auth/minimal";
import { verifyGoogleIdToken, type GoogleProfile } from "better-auth/social-providers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as authSchema from "../db/auth-schema.ts";
import type { getDb } from "../db/index";
import { googleCredentials, type GoogleAuthSecrets } from "./google-auth.ts";

// Construct inside the request: D1 bindings must never escape their request context.
export function createAuth(db: ReturnType<typeof getDb>, secret: string, origin: string, googleSecrets: GoogleAuthSecrets = {}) {
  if (secret.length < 32) throw new Error("Set a strong BETTER_AUTH_SECRET server secret.");
  const baseURL = new URL(origin).origin;
  const google = googleCredentials(googleSecrets);
  return betterAuth({
    appName: "Chess Infinity Academy", baseURL, secret,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema, transaction: false }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    socialProviders: google ? { google: {
      ...google, prompt: "select_account", accessType: "online", includeGrantedScopes: false,
      disableDefaultScope: true, scope: ["openid", "email", "profile"],
      disableIdTokenSignIn: true,
      // Validate Google's fresh signed claims, rather than gating a legitimate
      // linked account on a legacy local email-verification flag.
      getUserInfo: async tokens => {
        if (!tokens.idToken) return null;
        const claims = await verifyGoogleIdToken({ token: tokens.idToken, audience: google.clientId });
        if (!claims || claims.email_verified !== true || typeof claims.email !== "string" || typeof claims.sub !== "string") return null;
        return { user: { email: claims.email, emailVerified: true,
          name: typeof claims.name === "string" ? claims.name : "Chess player",
          image: typeof claims.picture === "string" ? claims.picture : undefined }, data: claims as unknown as GoogleProfile };
      },
    } } : {},
    account: { encryptOAuthTokens: true, storeAccountCookie: false,
      accountLinking: { enabled: true, requireLocalEmailVerified: true, allowDifferentEmails: false, allowUnlinkingAll: false } },
    onAPIError: { errorURL: baseURL + "/login" },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 6 }, "/sign-up/email": { window: 60, max: 4 }, "/sign-in/social": { window: 60, max: 10 }, "/link-social": { window: 60, max: 6 } } },
    advanced: { useSecureCookies: baseURL.startsWith("https:"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" } },
  });
}
