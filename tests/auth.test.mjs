import { test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { drizzle } from "drizzle-orm/d1";
import { readFile } from "node:fs/promises";
import { createAuth } from "../lib/auth-config.ts";
import { readProgress, writeProgress } from "../lib/progress-store.ts";
const origin = "https://academy.example";
test("real D1 authentication: signup, signed cookies, password checks, isolation, CSRF, logout and rate limits", async () => {
 const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', d1Databases: ["DB"], compatibilityDate: "2026-05-15" });
 try {
  const binding = await mf.getD1Database("DB");
  for (const name of ["0000_tearful_gunslinger.sql", "0001_overrated_the_anarchist.sql"]) {
   const raw = await readFile(new URL("../drizzle/" + name, import.meta.url), "utf8");
   for (const statement of raw.split("--> statement-breakpoint").filter(s=>s.trim())) await binding.prepare(statement).run();
  }
  const db = drizzle(binding);
  const auth = () => createAuth(db, "test-only-secret-with-at-least-thirty-two-characters", origin);
  const request = (path, body, extra = {}) => auth().handler(new Request(origin + "/api/auth/" + path, { method: body ? "POST" : "GET", headers: { origin, "content-type": "application/json", "cf-connecting-ip": "192.0.2.1", ...extra }, ...(body ? {body:JSON.stringify(body)} : {}) }));
  const payload = { name: "Alice", email: "alice@example.com", password: "A-unique-long-password-42" };
  let response = await request("sign-up/email", payload);
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = response.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /Secure/i);
  const alice = (await response.json()).user;
  const session = await request("get-session", null, {cookie});
  assert.equal((await session.json()).user.id, alice.id);
  const saved = { completed: ["l1"], xp: 50 };
  await writeProgress(db, alice.id, saved, 0);
  assert.deepEqual((await readProgress(db, alice.id)).data, saved);
  const bob = await request("sign-up/email", {...payload, email:"bob@example.com", name:"Bob"}, {"cf-connecting-ip":"192.0.2.2"});
  assert.equal(bob.status, 200, await bob.clone().text());
  assert.equal((await readProgress(db, (await bob.json()).user.id)).data, null);
  const wrong = await request("sign-in/email", {...payload,password:"wrong-password"}); assert.equal(wrong.status,401);
  const csrf = await request("sign-out", {}, {cookie,origin:"https://evil.example"}); assert.equal(csrf.status,403);
  const forged = await request("get-session",null,{"oai-authenticated-user-id":alice.id,"oai-authenticated-user-email":payload.email}); assert.equal(await forged.json(),null);
  const login = await request("sign-in/email", payload); assert.equal(login.status,200);
  await request("sign-out", {}, {cookie});
  assert.equal(await (await request("get-session",null,{cookie})).json(),null);
  let limited;
  for(let n=0;n<8;n++) limited = await request("sign-in/email", {...payload,password:"wrong-password"}, {"cf-connecting-ip":"192.0.2.3"});
  assert.equal(limited.status,429);
  const rows = await binding.prepare("SELECT password FROM auth_account WHERE user_id=?").bind(alice.id).all();
  assert.notEqual(rows.results[0].password,payload.password);
  assert.match(rows.results[0].password,/^[a-f0-9]+:[a-f0-9]+$/);
 } finally {await mf.dispose();}
});
