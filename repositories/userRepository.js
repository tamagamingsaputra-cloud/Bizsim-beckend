/* ============================================================
   repositories/userRepository.js
   Semua query pakai prepared statement (parameter terpisah)
   sebagai proteksi SQL Injection.
   ============================================================ */
const { getDb } = require("../config/database");

const UserRepository = {
  findByEmail(email) {
    return getDb().get(`SELECT * FROM users WHERE email = ?`, [email]);
  },
  findByGoogleId(googleId) {
    return getDb().get(`SELECT * FROM users WHERE google_id = ?`, [googleId]);
  },
  findById(id) {
    return getDb().get(`SELECT * FROM users WHERE id = ?`, [id]);
  },
  createLocal(email, passwordHash) {
    const info = getDb().run(
      `INSERT INTO users (email, password_hash, auth_provider, role) VALUES (?, ?, 'local', 'member')`,
      [email, passwordHash]
    );
    return this.findById(info.lastInsertRowid);
  },
  createGoogle(email, googleId, displayName, avatarUrl) {
    const db = getDb();
    const info = db.run(
      `INSERT INTO users (email, google_id, auth_provider, role) VALUES (?, ?, 'google', 'member')`,
      [email, googleId]
    );
    db.run(`INSERT INTO user_profiles (user_id, display_name, avatar_url) VALUES (?, ?, ?)`,
      [info.lastInsertRowid, displayName || null, avatarUrl || null]);
    return this.findById(info.lastInsertRowid);
  },
  createGuest() {
    const db = getDb();
    const email = `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}@guest.bizsim.local`;
    const info = db.run(`INSERT INTO users (email, auth_provider, role) VALUES (?, 'guest', 'guest')`, [email]);
    db.run(`INSERT INTO user_profiles (user_id, display_name) VALUES (?, 'Guest Player')`, [info.lastInsertRowid]);
    return this.findById(info.lastInsertRowid);
  },
  updateRole(userId, role) {
    getDb().run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [role, userId]);
  },
  setActive(userId, isActive) {
    getDb().run(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`, [isActive ? 1 : 0, userId]);
  },
  delete(userId) {
    getDb().run(`DELETE FROM users WHERE id = ?`, [userId]);
  },
  listAll(limit = 100, offset = 0) {
    return getDb().all(
      `SELECT u.id, u.email, u.role, u.auth_provider, u.is_active, u.created_at, p.display_name, p.avatar_url
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       ORDER BY u.id DESC LIMIT ? OFFSET ?`, [limit, offset]);
  },
  count() {
    return getDb().get(`SELECT COUNT(*) as c FROM users`).c;
  },
  getProfile(userId) {
    return getDb().get(`SELECT * FROM user_profiles WHERE user_id = ?`, [userId]);
  },
  upsertProfile(userId, { displayName, avatarUrl, bio }) {
    const db = getDb();
    const existing = this.getProfile(userId);
    if (existing) {
      db.run(`UPDATE user_profiles SET display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url), bio = COALESCE(?, bio), updated_at = datetime('now') WHERE user_id = ?`,
        [displayName ?? null, avatarUrl ?? null, bio ?? null, userId]);
    } else {
      db.run(`INSERT INTO user_profiles (user_id, display_name, avatar_url, bio) VALUES (?, ?, ?, ?)`,
        [userId, displayName ?? null, avatarUrl ?? null, bio ?? null]);
    }
    return this.getProfile(userId);
  },
};

module.exports = UserRepository;
