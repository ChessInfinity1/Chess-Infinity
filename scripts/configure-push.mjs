// Set once, through Wrangler's stdin. Private key material is never printed or written to disk.
import { spawnSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const wrangler = new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url).pathname;
const list = spawnSync(process.execPath, [wrangler, "secret", "list", "--config", "wrangler.jsonc"], { encoding: "utf8" });
if (list.status) { console.error("Authenticate with Cloudflare using wrangler login, then run this command again."); process.exit(1); }
const names = JSON.parse(list.stdout.slice(list.stdout.indexOf("["))).map(s => s.name);
if (["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"].every(n => names.includes(n))) { console.log("Push keys already configured. Existing subscriptions were preserved."); process.exit(0); }
if (names.includes("VAPID_PRIVATE_KEY") || names.includes("VAPID_PUBLIC_KEY")) { console.error("Partial push configuration found. Restore the matching keys; do not rotate existing subscriptions automatically."); process.exit(1); }
const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
const key = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]).toString("base64url");
const secrets = { VAPID_PUBLIC_KEY: key, VAPID_PRIVATE_KEY: jwk.d, VAPID_SUBJECT: config.vars.APP_ORIGIN };
const result = spawnSync(process.execPath, [wrangler, "secret", "bulk", "--config", "wrangler.jsonc"], { input: JSON.stringify(secrets), encoding: "utf8" });
if (result.status) { console.error("Cloudflare did not save the push configuration. Check your account access and retry."); process.exit(1); }
console.log("Push configuration saved securely to the existing Cloudflare Worker.");
