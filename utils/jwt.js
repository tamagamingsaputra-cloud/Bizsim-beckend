/* ============================================================
   utils/jwt.js — implementasi JWT (HS256) memakai Node core
   crypto saja (tanpa package jsonwebtoken). Format standar
   header.payload.signature, base64url, HMAC-SHA256.
   ============================================================ */
const crypto = require("crypto");
const config = require("../config");

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }
function fromB64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

function parseDuration(str) {
  const m = String(str).match(/^(\d+)([smhd])$/);
  if (!m) return 3600;
  const n = Number(m[1]);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
  return n * mult;
}

function sign(payload, expiresIn = config.auth.jwtExpiresIn) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + parseDuration(expiresIn) };
  const data = `${b64urlJson(header)}.${b64urlJson(fullPayload)}`;
  const sig = crypto.createHmac("sha256", config.auth.jwtSecret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expected = crypto.createHmac("sha256", config.auth.jwtSecret).update(`${headerB64}.${payloadB64}`).digest();
  const given = fromB64url(sigB64);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let payload;
  try { payload = JSON.parse(fromB64url(payloadB64).toString("utf8")); } catch { return null; }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

module.exports = { sign, verify };
