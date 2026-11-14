import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { googleCredentials } from "../../../lib/google-auth";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { account } from "../../../db/auth-schema";

export async function GET() {
  const user = await getChatGPTUser();
  const linked = user ? await getDb().select({ id: account.id }).from(account)
    .where(and(eq(account.userId, user.userId), eq(account.providerId, "google"))).limit(1) : [];
  return Response.json({ google: !!googleCredentials(env), googleLinked: user ? linked.length > 0 : null },
    { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
