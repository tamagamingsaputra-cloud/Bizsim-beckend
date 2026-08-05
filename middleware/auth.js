/* ============================================================
   middleware/auth.js — verifikasi Bearer JWT, isi req.user
   ============================================================ */
const jwt = require("../utils/jwt");
const { unauthorized, forbidden } = require("../utils/respond");
const UserRepository = require("../repositories/userRepository");

// wajib login
async function requireAuth(req, res) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? jwt.verify(token) : null;
  if (!payload) { unauthorized(res, "Token tidak valid atau kedaluwarsa"); return false; }
  const user = UserRepository.findById(payload.sub);
  if (!user || !user.is_active) { forbidden(res, "Akun tidak aktif"); return false; }
  req.user = { id: user.id, email: user.email, role: user.role, authProvider: user.auth_provider };
  return true;
}

// opsional: isi req.user jika ada token valid, tapi tidak menolak jika tidak ada
async function optionalAuth(req) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? jwt.verify(token) : null;
  if (!payload) return true;
  const user = UserRepository.findById(payload.sub);
  if (user && user.is_active) req.user = { id: user.id, email: user.email, role: user.role, authProvider: user.auth_provider };
  return true;
}

module.exports = { requireAuth, optionalAuth };
