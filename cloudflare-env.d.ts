declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ACCOUNT_API_URL?: string;
    ACCOUNT_SERVICE_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
