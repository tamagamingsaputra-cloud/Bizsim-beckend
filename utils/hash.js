/* ============================================================
   utils/hash.js — hashing password pakai crypto.scrypt (built-in).
   Format tersimpan: scrypt$<saltHex>$<hashHex>
   Tidak pernah menyimpan password plaintext.
   ============================================================ */
const crypto = require("crypto");
const config = require("../config");

const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(config.auth.saltBytes).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const [, salt, hashHex] = stored.split("$");
  const derived = crypto.scryptSync(password, salt, KEY_LEN);
  const stored_ = Buffer.from(hashHex, "hex");
  if (derived.length !== stored_.length) return false;
  return crypto.timingSafeEqual(derived, stored_);
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

module.exports = { hashPassword, verifyPassword, sha256 };
