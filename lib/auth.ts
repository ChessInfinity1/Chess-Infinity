import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { createAuth } from "./auth-config";
import { createVerificationEmailSender } from "./verification-email";
export function getAuth() {
  if (!env.BETTER_AUTH_SECRET || !env.APP_ORIGIN) throw new Error("Authentication is not configured.");
  return createAuth(getDb(), env.BETTER_AUTH_SECRET, env.APP_ORIGIN, {
    verificationEnabled: env.EMAIL_VERIFICATION_ENABLED === "true",
    sendVerificationCode: createVerificationEmailSender(env),
  });
}
