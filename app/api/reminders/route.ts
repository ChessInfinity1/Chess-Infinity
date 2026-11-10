import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { handleReminderRequest } from "../../../lib/push-reminders";
export async function GET(request: Request) { return handleReminderRequest(request, env, null); }
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  return handleReminderRequest(request, env, user?.userId ?? null);
}
