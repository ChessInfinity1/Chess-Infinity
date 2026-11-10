declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    APP_ORIGIN?: string;
    BETTER_AUTH_SECRET?: string;
    ACADEMY_OWNER_USER_ID?: string;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
    BUCKET?: R2Bucket;
  }
}
