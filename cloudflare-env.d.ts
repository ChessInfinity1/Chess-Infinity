declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    APP_ORIGIN?: string;
    BETTER_AUTH_SECRET?: string;
    ACADEMY_OWNER_USER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
