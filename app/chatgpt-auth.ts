import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "../lib/auth";
// Keep the exported names for existing API callers; identity now comes only from a verified session.
export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  if (!requestHeaders.get("cookie")) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  return { userId: session.user.id, displayName: session.user.name, email: session.user.email, fullName: session.user.name };
}
export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}
export function chatGPTSignInPath(returnTo: string): string {
  return `/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}
export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/logout?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}
export function safeRelativeReturnPath(value: string): string {
  try {
    const u = new URL(value, "https://app.local");
    if (!value.startsWith("/") || value.startsWith("//") || u.origin !== "https://app.local" || ["/login", "/logout", "/callback"].includes(u.pathname)) return "/";
    return u.pathname + u.search + u.hash;
  } catch { return "/"; }
}
