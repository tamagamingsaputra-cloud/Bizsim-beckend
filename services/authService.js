/* ============================================================
   services/authService.js
   ============================================================ */
const UserRepository = require("../repositories/userRepository");
const { hashPassword, verifyPassword, sha256 } = require("../utils/hash");
const jwt = require("../utils/jwt");
const { verifyGoogleIdToken } = require("../utils/googleAuth");
const { getDb } = require("../config/database");
const config = require("../config");

function publicUser(u) {
  return { id: u.id, email: u.email, role: u.role, authProvider: u.auth_provider, isActive: !!u.is_active };
}

function issueTokens(user) {
  const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.auth.jwtExpiresIn);
  const refreshTokenRaw = require("crypto").randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + parseDays(config.auth.refreshExpiresIn) * 86400000).toISOString();
  getDb().run(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)`,
    [user.id, sha256(refreshTokenRaw), expiresAt]);
  return { accessToken, refreshToken: refreshTokenRaw };
}
function parseDays(str) { const m = String(str).match(/^(\d+)d$/); return m ? Number(m[1]) : 30; }

const AuthService = {
  async register(email, password) {
    const existing = UserRepository.findByEmail(email);
    if (existing) { const e = new Error("Email sudah terdaftar"); e.code = "CONFLICT"; throw e; }
    const hash = hashPassword(password);
    const user = UserRepository.createLocal(email, hash);
    UserRepository.upsertProfile(user.id, { displayName: email.split("@")[0] });
    return { user: publicUser(user), ...issueTokens(user) };
  },

  async login(email, password) {
    const user = UserRepository.findByEmail(email);
    if (!user || !user.password_hash) { const e = new Error("Email atau password salah"); e.code = "UNAUTHORIZED"; throw e; }
    if (!user.is_active) { const e = new Error("Akun dinonaktifkan"); e.code = "FORBIDDEN"; throw e; }
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) { const e = new Error("Email atau password salah"); e.code = "UNAUTHORIZED"; throw e; }
    return { user: publicUser(user), ...issueTokens(user) };
  },

  async googleLogin(idToken) {
    const payload = await verifyGoogleIdToken(idToken);
    if (!payload || !payload.email) { const e = new Error("Token Google tidak valid"); e.code = "UNAUTHORIZED"; throw e; }
    let user = UserRepository.findByGoogleId(payload.sub) || UserRepository.findByEmail(payload.email);
    if (!user) {
      user = UserRepository.createGoogle(payload.email, payload.sub, payload.name, payload.picture);
    }
    return { user: publicUser(user), ...issueTokens(user) };
  },

  async guestLogin() {
    const user = UserRepository.createGuest();
    return { user: publicUser(user), ...issueTokens(user) };
  },

  async refresh(refreshTokenRaw) {
    const hash = sha256(refreshTokenRaw);
    const row = getDb().get(
      `SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')`, [hash]);
    if (!row) { const e = new Error("Refresh token tidak valid"); e.code = "UNAUTHORIZED"; throw e; }
    const user = UserRepository.findById(row.user_id);
    if (!user || !user.is_active) { const e = new Error("Akun tidak aktif"); e.code = "FORBIDDEN"; throw e; }
    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.auth.jwtExpiresIn);
    return { accessToken, user: publicUser(user) };
  },

  async logout(refreshTokenRaw) {
    if (!refreshTokenRaw) return;
    getDb().run(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?`, [sha256(refreshTokenRaw)]);
  },

  publicUser,
};

module.exports = AuthService;
