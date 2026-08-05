/* ============================================================
   config/index.js — loader .env murni Node core (tanpa dotenv)
   ============================================================ */
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  });
}
loadEnvFile();

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }

module.exports = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",

  db: {
    client: process.env.DB_CLIENT || "sqlite",
    sqlitePath: process.env.SQLITE_PATH || "./data/bizsim.db",
    host: process.env.DB_HOST || "127.0.0.1",
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "bizsim",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "bizsim",
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || "dev_insecure_secret_change_me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
    saltBytes: num(process.env.PASSWORD_SALT_BYTES, 16),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    max: num(process.env.RATE_LIMIT_MAX, 100),
    loginMax: num(process.env.LOGIN_RATE_LIMIT_MAX, 8),
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || "admin@bizsim.local",
    password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
  },
};
