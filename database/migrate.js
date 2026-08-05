/* ============================================================
   database/migrate.js
   Jalankan: npm run migrate
   Membuat seluruh tabel (schema.sqlite.sql) + seed data awal:
   akun admin, katalog online assets, katalog event.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { getDb } = require("../config/database");
const { hashPassword } = require("../utils/hash");

function run() {
  if (config.db.client !== "sqlite") {
    console.log(`DB_CLIENT="${config.db.client}" — jalankan skema secara manual:`);
    console.log(`  database/schema.${config.db.client === "mysql" ? "mysql" : "postgres"}.sql`);
    return;
  }

  const db = getDb();
  const schemaPath = path.join(__dirname, "schema.sqlite.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
  console.log("✔ Skema SQLite berhasil dibuat/diperbarui.");

  // seed akun admin (hanya jika belum ada user sama sekali)
  const userCount = db.get("SELECT COUNT(*) as c FROM users").c;
  if (userCount === 0) {
    const hash = hashPassword(config.seedAdmin.password);
    const info = db.run(
      `INSERT INTO users (email, password_hash, auth_provider, role) VALUES (?, ?, 'local', 'superadmin')`,
      [config.seedAdmin.email, hash]
    );
    db.run(`INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)`, [info.lastInsertRowid, "Super Admin"]);
    console.log(`✔ Akun superadmin dibuat: ${config.seedAdmin.email} / ${config.seedAdmin.password}`);
    console.log("  ⚠ Segera login dan ganti password ini di lingkungan produksi.");
  } else {
    console.log("• Akun sudah ada, lewati seed admin.");
  }

  // seed katalog online assets (harga dasar acuan; harga live tetap disimulasikan di frontend)
  const assets = [
    ["BTC", "Bitcoin", "BTC/IDR", "crypto", 1150000000, 0.028, "Very High"],
    ["ETH", "Ethereum", "ETH/IDR", "crypto", 48000000, 0.032, "Very High"],
    ["BBRI", "Bank Rakyat Indonesia", "BBRI", "stock", 4850, 0.012, "High"],
    ["TLKM", "Telkom Indonesia", "TLKM", "stock", 3120, 0.010, "High"],
    ["IHSG", "Indeks Saham Gabungan", "IHSG", "index", 7250, 0.008, "High"],
  ];
  assets.forEach(a => {
    db.run(
      `INSERT OR IGNORE INTO online_assets (id, name, symbol, type, base_price, volatility, liquidity) VALUES (?,?,?,?,?,?,?)`,
      a
    );
  });
  console.log(`✔ ${assets.length} online assets di-seed.`);

  // seed katalog event dunia/ekonomi (subset — daftar lengkap tetap didefinisikan di frontend js/events.js)
  const events = [
    ["war", "Konflik Antar Negara", "Dua negara mitra dagang memasuki konflik terbuka.", "danger", 21],
    ["recession", "Resesi Ekonomi", "Pertumbuhan ekonomi melambat tajam.", "danger", 30],
    ["boom", "Booming Ekonomi", "Konsumsi dan investasi meningkat pesat.", "success", 30],
    ["crash", "Market Crash", "Aksi jual masif melanda pasar saham dan kripto global.", "danger", 10],
  ];
  events.forEach(e => {
    db.run(
      `INSERT OR IGNORE INTO events (id, title, description, tone, duration_days, impact_json) VALUES (?,?,?,?,?,?)`,
      [...e, "{}"]
    );
  });
  console.log(`✔ ${events.length} event katalog di-seed.`);

  console.log("\nMigrasi selesai. Jalankan server dengan: npm start");
}

run();
