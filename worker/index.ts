import handler from "vinext/server/fetch-handler";
import { sendDueReminders } from "../lib/push-reminders";
export default {
  async scheduled(controller: ScheduledController, env: Cloudflare.Env) {
    await sendDueReminders(env, controller.scheduledTime);
  },
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const headers = new Headers(request.headers);
    for (const key of [...headers.keys()]) if (key.startsWith("oai-authenticated-user-")) headers.delete(key);
    const response = await handler.fetch(new Request(request, { headers }), env, ctx);
    const result = new Response(response.body, response);
    result.headers.set("X-Content-Type-Options", "nosniff");
    result.headers.set("X-Frame-Options", "DENY");
    result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (new URL(request.url).protocol === "https:") result.headers.set("Strict-Transport-Security", "max-age=31536000");
    if (new URL(request.url).pathname.startsWith("/api/") || result.headers.get("content-type")?.includes("text/html")) result.headers.set("Cache-Control", "private, no-store");
    return result;
  },
};
