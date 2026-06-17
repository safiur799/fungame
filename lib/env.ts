export const env = {
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbDb: process.env.MONGODB_DB || "daily_number_draw",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "",
  cronSecret: process.env.CRON_SECRET || "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  drawTimezone: process.env.DRAW_TIMEZONE || "Asia/Kolkata"
};

export function assertServerEnv() {
  const missing = [];
  if (!env.mongodbUri) missing.push("MONGODB_URI");
  if (!env.adminPassword) missing.push("ADMIN_PASSWORD");
  if (!env.adminSessionSecret) missing.push("ADMIN_SESSION_SECRET or ADMIN_PASSWORD");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
