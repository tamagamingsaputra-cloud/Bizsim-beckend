/* ============================================================
   server.js — entry point backend BizSim (Node core http only)
   ============================================================ */
const http = require("http");
const config = require("./config");
const router = require("./routes/index");
const { getDb } = require("./config/database");

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0"); // header lama, proteksi XSS asli ada di sanitasi input/output
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
}

function setCors(req, res) {
  const origin = config.corsOrigin === "*" ? (req.headers.origin || "*") : config.corsOrigin;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
}

// pastikan DB & tabel siap sebelum server menerima request
try {
  getDb();
  const fs = require("fs"), path = require("path");
  if (config.db.client === "sqlite") {
    const schema = fs.readFileSync(path.join(__dirname, "database", "schema.sqlite.sql"), "utf8");
    getDb().exec(schema); // idempotent: semua statement pakai IF NOT EXISTS
  }
} catch (e) {
  console.error("Gagal inisialisasi database:", e.message);
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  setSecurityHeaders(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  await router.handle(req, res);
});

server.listen(config.port, () => {
  console.log(`\n🚀 BizSim backend berjalan di http://localhost:${config.port}`);
  console.log(`   DB client: ${config.db.client}`);
  console.log(`   CORS origin: ${config.corsOrigin}`);
  console.log(`   Coba: curl http://localhost:${config.port}/api/health\n`);
});
