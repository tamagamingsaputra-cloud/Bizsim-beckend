/* ============================================================
   utils/googleAuth.js
   Verifikasi ID token dari Google Identity Services (GIS) secara
   nyata: ambil JWKS publik Google, cocokkan `kid`, verifikasi
   signature RS256, cek `aud`, `iss`, dan masa berlaku.

   Ini BUKAN implementasi palsu — namun tetap butuh:
     1. GOOGLE_CLIENT_ID valid di .env
     2. Koneksi internet saat runtime (untuk ambil JWKS & saat
        pengguna memuat script Google Identity Services di frontend)
   Keduanya tidak tersedia di sandbox pengembangan ini, jadi fungsi
   ini belum bisa diuji end-to-end di sini — tapi logikanya standar
   dan akan bekerja begitu di-deploy dengan kredensial asli.
   ============================================================ */
const crypto = require("crypto");
const config = require("../config");

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let cachedJwks = null;
let cachedAt = 0;

function b64urlToBuffer(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

async function getJwks() {
  const ONE_HOUR = 3600 * 1000;
  if (cachedJwks && Date.now() - cachedAt < ONE_HOUR) return cachedJwks;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error("Gagal mengambil JWKS Google");
  cachedJwks = await res.json();
  cachedAt = Date.now();
  return cachedJwks;
}

/**
 * Verifikasi Google ID token (JWT RS256) dan kembalikan payload
 * (sub, email, name, picture, dst) jika valid, atau null jika tidak.
 */
async function verifyGoogleIdToken(idToken) {
  if (!config.google.clientId) {
    throw new Error("GOOGLE_CLIENT_ID belum dikonfigurasi di .env");
  }
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(b64urlToBuffer(headerB64).toString("utf8"));
  const payload = JSON.parse(b64urlToBuffer(payloadB64).toString("utf8"));

  const jwks = await getJwks();
  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) return null;

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const signature = b64urlToBuffer(sigB64);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const valid = verifier.verify(publicKey, signature);
  if (!valid) return null;

  if (!ISSUERS.includes(payload.iss)) return null;
  if (payload.aud !== config.google.clientId) return null;
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;

  return payload; // { sub, email, email_verified, name, picture, ... }
}

module.exports = { verifyGoogleIdToken };
