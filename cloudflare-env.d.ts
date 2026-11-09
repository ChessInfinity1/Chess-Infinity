declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    APP_ORIGIN?: string;
    BETTER_AUTH_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
