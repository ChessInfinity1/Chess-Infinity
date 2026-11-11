import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { createAuth } from "./auth-config";
export function getAuth() {
  if (!env.BETTER_AUTH_SECRET || !env.APP_ORIGIN) throw new Error("Authentication is not configured.");
  return createAuth(getDb(), env.BETTER_AUTH_SECRET, env.APP_ORIGIN, env);
}
