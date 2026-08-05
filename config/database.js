/* ============================================================
   config/database.js
   Adapter database. Default: SQLite (native node:sqlite, tanpa
   dependency npm). Struktur disiapkan agar bisa diganti ke
   MySQL/PostgreSQL cukup dengan mengganti DB_CLIENT + memasang
   driver (mysql2 / pg) — lihat backend/README.md.
   ============================================================ */
const path = require("path");
const fs = require("fs");
const config = require("./index");

let db; // instance konkret sesuai client

function initSqlite() {
  const { DatabaseSync } = require("node:sqlite");
  const dbPath = path.isAbsolute(config.db.sqlitePath)
    ? config.db.sqlitePath
    : path.join(__dirname, "..", config.db.sqlitePath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const conn = new DatabaseSync(dbPath);
  conn.exec("PRAGMA foreign_keys = ON;");

  return {
    client: "sqlite",
    // run: INSERT/UPDATE/DELETE — mengembalikan {lastInsertRowid, changes}
    run(sql, params = []) {
      const stmt = conn.prepare(sql);
      const info = stmt.run(...params);
      return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
    },
    // get: 1 baris atau undefined
    get(sql, params = []) {
      const stmt = conn.prepare(sql);
      return stmt.get(...params);
    },
    // all: banyak baris
    all(sql, params = []) {
      const stmt = conn.prepare(sql);
      return stmt.all(...params);
    },
    exec(sql) { conn.exec(sql); },
    raw: conn,
  };
}

function initUnsupported(client) {
  // Placeholder adapter yang jujur: memberi tahu developer persis apa
  // yang perlu dipasang, alih-alih pura-pura berjalan.
  const msg = `DB_CLIENT="${client}" memerlukan driver tambahan yang tidak ter-install ` +
    `di lingkungan ini (npm install ${client === "mysql" ? "mysql2" : "pg"}). ` +
    `Implementasikan adapter di config/database.js mengikuti kontrak { run(sql,params), get(sql,params), all(sql,params), exec(sql) } ` +
    `lalu gunakan file database/schema.${client === "mysql" ? "mysql" : "postgres"}.sql sebagai skema awal.`;
  return {
    client,
    run() { throw new Error(msg); },
    get() { throw new Error(msg); },
    all() { throw new Error(msg); },
    exec() { throw new Error(msg); },
  };
}

function getDb() {
  if (db) return db;
  if (config.db.client === "sqlite") db = initSqlite();
  else db = initUnsupported(config.db.client);
  return db;
}

module.exports = { getDb };
