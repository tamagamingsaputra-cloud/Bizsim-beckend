/* ============================================================
   utils/validate.js — validasi input & sanitasi dasar (XSS/format)
   ============================================================ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(v) { return typeof v === "string" && EMAIL_RE.test(v) && v.length <= 254; }
function isValidPassword(v) { return typeof v === "string" && v.length >= 8 && v.length <= 128; }

// Escape karakter berbahaya agar teks bebas (nama, notifikasi, dsb) aman
// disimpan/ditampilkan lagi tanpa memicu stored-XSS.
function sanitizeText(v, maxLen = 500) {
  if (typeof v !== "string") return "";
  return v
    .slice(0, maxLen)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isNonEmptyString(v, maxLen = 255) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

function isFiniteNumber(v) { return typeof v === "number" && Number.isFinite(v); }

module.exports = { isValidEmail, isValidPassword, sanitizeText, isNonEmptyString, isFiniteNumber };
