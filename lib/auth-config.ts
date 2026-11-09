import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as authSchema from "../db/auth-schema.ts";
import type { getDb } from "../db/index";

// Construct inside the request: D1 bindings must never escape their request context.
export function createAuth(db: ReturnType<typeof getDb>, secret: string, origin: string) {
  if (secret.length < 32) throw new Error("Set a strong BETTER_AUTH_SECRET server secret.");
  const baseURL = new URL(origin).origin;
  return betterAuth({
    appName: "Chess Infinity Academy", baseURL, secret,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema, transaction: false }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 6 }, "/sign-up/email": { window: 60, max: 4 } } },
    advanced: { useSecureCookies: baseURL.startsWith("https:"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" } },
  });
}
