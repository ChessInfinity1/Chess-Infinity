import { env } from "cloudflare:workers";
export async function GET() {
 try {
  if (!env.DB || !env.BETTER_AUTH_SECRET || !env.APP_ORIGIN) throw new Error();
  await env.DB.prepare("SELECT id FROM auth_user LIMIT 1").first();
  await env.DB.prepare("SELECT user_id FROM progress LIMIT 1").first();
  return Response.json({ status: "ok", storage: "d1", authentication: "configured" }, { headers: {"Cache-Control":"no-store"} });
 } catch {return Response.json({status:"unavailable"},{status:503});}
}
