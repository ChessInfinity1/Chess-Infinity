import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP } from "better-auth/plugins/email-otp";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { eq } from "drizzle-orm";
import * as authSchema from "../db/auth-schema.ts";
import type { getDb } from "../db/index";
import type { VerificationEmail } from "./verification-email.ts";

export type AuthEmailOptions = {
  verificationEnabled?: boolean;
  sendVerificationCode?: (data: VerificationEmail) => Promise<void>;
};

// Construct inside the request: D1 bindings must never escape their request context.
export function createAuth(db: ReturnType<typeof getDb>, secret: string, origin: string, email: AuthEmailOptions = {}) {
  if (secret.length < 32) throw new Error("Set a strong BETTER_AUTH_SECRET server secret.");
  const baseURL = new URL(origin).origin;
  return betterAuth({
    appName: "Chess Infinity Academy", baseURL, secret,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema, transaction: false }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, autoSignIn: !email.verificationEnabled },
    user: { additionalFields: { requiresEmailVerification: { type: "boolean", defaultValue: false, input: false, returned: false } } },
    emailVerification: { autoSignInAfterVerification: false },
    plugins: [emailOTP({ otpLength: 6, expiresIn: 600, allowedAttempts: 5, storeOTP: "hashed", disableSignUp: true,
      sendVerificationOnSignUp: false, changeEmail: { enabled: false },
      async sendVerificationOTP(data) {
        if (data.type !== "email-verification") throw new APIError("BAD_REQUEST", { code: "OTP_TYPE_DISABLED", message: "Only email verification codes are supported." });
        if (!email.sendVerificationCode) throw new APIError("SERVICE_UNAVAILABLE", { code: "EMAIL_DELIVERY_UNAVAILABLE", message: "Email verification is being set up. Please try again later." });
        try { await email.sendVerificationCode({ email: data.email, otp: data.otp }); }
        catch { throw new APIError("SERVICE_UNAVAILABLE", { code: "EMAIL_DELIVERY_FAILED", message: "We couldn’t send your verification code. Please try again shortly." }); }
      },
    })],
    disabledPaths: ["/sign-in/email-otp", "/email-otp/check-verification-otp", "/email-otp/request-password-reset", "/forget-password/email-otp", "/email-otp/reset-password", "/email-otp/request-email-change", "/email-otp/change-email"],
    hooks: { before: createAuthMiddleware(async ctx => {
      // OTP endpoints also accept unauthenticated requests. Require our own
      // browser origin even when there is no session cookie to trigger CSRF checks.
      if (ctx.request?.method === "POST" && ctx.path.startsWith("/email-otp/") && ctx.request.headers.get("origin") !== baseURL)
        throw new APIError("FORBIDDEN", { code: "INVALID_ORIGIN", message: "Open Chess Infinity to verify your email." });
      if (ctx.path === "/sign-up/email" && email.verificationEnabled && !email.sendVerificationCode)
        throw new APIError("SERVICE_UNAVAILABLE", { code: "EMAIL_DELIVERY_UNAVAILABLE", message: "Email verification is temporarily unavailable. Existing accounts can still sign in." });
      if (ctx.path === "/email-otp/send-verification-otp" && ctx.body?.type !== "email-verification")
        throw new APIError("BAD_REQUEST", { code: "OTP_TYPE_DISABLED", message: "Only email verification codes are supported." });
      // Better Auth's default background helper catches delivery errors. This
      // request must await acceptance and propagate failure before saying sent.
      if (ctx.path === "/email-otp/send-verification-otp")
        ctx.context.runInBackgroundOrAwait = async promise => { await promise; };
    }) },
    databaseHooks: {
      user: { create: { before: async user => ({ data: { ...user, requiresEmailVerification: !!email.verificationEnabled } }) } },
      session: { create: { before: async session => {
        const [user] = await db.select({ required: authSchema.user.requiresEmailVerification, verified: authSchema.user.emailVerified }).from(authSchema.user).where(eq(authSchema.user.id, session.userId)).limit(1);
        if (user?.required && !user.verified) throw new APIError("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Verify your email with the code before signing in." });
      } } },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 6 }, "/sign-up/email": { window: 60, max: 4 }, "/email-otp/send-verification-otp": { window: 60, max: 3 }, "/email-otp/verify-email": { window: 60, max: 8 } } },
    advanced: { useSecureCookies: baseURL.startsWith("https:"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" } },
  });
}
