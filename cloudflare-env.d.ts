declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    APP_ORIGIN?: string;
    BETTER_AUTH_SECRET?: string;
    ACADEMY_OWNER_USER_ID?: string;
    EMAIL_PROVIDER?: string;
    EMAIL_API_KEY?: string;
    EMAIL_FROM?: string;
    EMAIL_VERIFICATION_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
