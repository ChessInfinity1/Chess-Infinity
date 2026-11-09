import { env } from "cloudflare:workers";
import { getAuth } from "../../../../lib/auth";
import { handleDeveloperRequest } from "../../../../lib/developer-service";

export const dynamic = "force-dynamic";
async function handle(request: Request) {
  if (!env.DB || !env.APP_ORIGIN || !env.BETTER_AUTH_SECRET)
    return Response.json({ error: "Service unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return handleDeveloperRequest(request, {
    db: env.DB, ownerUserId: env.ACADEMY_OWNER_USER_ID, origin: new URL(env.APP_ORIGIN).origin,
    getSession: headers => getAuth().api.getSession({ headers }),
  });
}
export const GET = handle;
export const POST = handle;
