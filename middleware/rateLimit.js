/* ============================================================
   middleware/rateLimit.js — pembatas laju sederhana in-memory.
   Cukup untuk single-instance dev/small deploy. Untuk produksi
   multi-instance, ganti store ini dengan Redis.
   ============================================================ */
const config = require("../config");
const { tooMany } = require("../utils/respond");

const buckets = new Map(); // key -> [timestamps]

function hit(key, windowMs, max) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  buckets.set(key, arr);
  return arr.length <= max;
}

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function generalLimiter() {
  return async function (req, res) {
    const ok = hit("g:" + clientIp(req), config.rateLimit.windowMs, config.rateLimit.max);
    if (!ok) { tooMany(res); return false; }
    return true;
  };
}

function loginLimiter() {
  return async function (req, res) {
    const ok = hit("login:" + clientIp(req), config.rateLimit.windowMs, config.rateLimit.loginMax);
    if (!ok) { tooMany(res, "Terlalu banyak percobaan login. Coba lagi dalam beberapa saat."); return false; }
    return true;
  };
}

// bersihkan bucket lama tiap 10 menit agar memori tidak membengkak
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of buckets) {
    const fresh = arr.filter(t => now - t < 10 * 60 * 1000);
    if (fresh.length) buckets.set(k, fresh); else buckets.delete(k);
  }
}, 10 * 60 * 1000).unref();

module.exports = { generalLimiter, loginLimiter };
