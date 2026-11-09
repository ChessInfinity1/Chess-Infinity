import { env } from "cloudflare:workers";
import { isOwnerId } from "./developer-service";
export function isAcademyOwner(user: { userId: string } | null) {
  return isOwnerId(user?.userId, env.ACADEMY_OWNER_USER_ID);
}
