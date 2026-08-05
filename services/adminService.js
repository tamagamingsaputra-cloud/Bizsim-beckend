/* ============================================================
   services/adminService.js
   ============================================================ */
const { getDb } = require("../config/database");
const UserRepository = require("../repositories/userRepository");
const ActivityRepository = require("../repositories/activityRepository");
const { sanitizeText, isFiniteNumber } = require("../utils/validate");

const AdminService = {
  listUsers(limit, offset) { return UserRepository.listAll(limit, offset); },

  deleteUser(userId) {
    const user = UserRepository.findById(userId);
    if (!user) { const e = new Error("User tidak ditemukan"); e.code = "NOT_FOUND"; throw e; }
    if (user.role === "superadmin") { const e = new Error("Tidak bisa menghapus superadmin"); e.code = "FORBIDDEN"; throw e; }
    UserRepository.delete(userId);
  },

  setUserActive(userId, isActive) { UserRepository.setActive(userId, isActive); },
  setUserRole(userId, role) {
    if (!["guest", "member", "admin", "superadmin"].includes(role)) {
      const e = new Error("Role tidak dikenal"); e.code = "BAD_REQUEST"; throw e;
    }
    UserRepository.updateRole(userId, role);
  },

  addEvent({ id, title, description, tone, durationDays, impact }) {
    if (!id || !title || !description) { const e = new Error("Data event tidak lengkap"); e.code = "BAD_REQUEST"; throw e; }
    getDb().run(
      `INSERT INTO events (id, title, description, tone, duration_days, impact_json) VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, tone=excluded.tone, duration_days=excluded.duration_days, impact_json=excluded.impact_json`,
      [sanitizeText(id, 50), sanitizeText(title, 150), sanitizeText(description, 500), tone || "info", durationDays || 14, JSON.stringify(impact || {})]
    );
  },

  updateMarketAsset(id, fields) {
    const db = getDb();
    const existing = db.get(`SELECT * FROM online_assets WHERE id = ?`, [id]);
    if (!existing) { const e = new Error("Asset tidak ditemukan"); e.code = "NOT_FOUND"; throw e; }
    db.run(
      `UPDATE online_assets SET base_price = ?, volatility = ?, liquidity = ? WHERE id = ?`,
      [isFiniteNumber(fields.basePrice) ? fields.basePrice : existing.base_price,
       isFiniteNumber(fields.volatility) ? fields.volatility : existing.volatility,
       fields.liquidity || existing.liquidity, id]
    );
    return db.get(`SELECT * FROM online_assets WHERE id = ?`, [id]);
  },

  sendNotification({ userId, title, body, tone }) {
    if (!title || !body) { const e = new Error("Judul dan isi notifikasi wajib diisi"); e.code = "BAD_REQUEST"; throw e; }
    const clean = { title: sanitizeText(title, 150), body: sanitizeText(body, 500), tone: tone || "info" };
    if (userId) ActivityRepository.addNotification(userId, clean);
    else ActivityRepository.broadcastNotification(clean);
  },

  stats() {
    const db = getDb();
    return {
      totalUsers: db.get(`SELECT COUNT(*) c FROM users`).c,
      totalGuests: db.get(`SELECT COUNT(*) c FROM users WHERE auth_provider = 'guest'`).c,
      totalMembers: db.get(`SELECT COUNT(*) c FROM users WHERE role = 'member'`).c,
      totalSaves: db.get(`SELECT COUNT(*) c FROM save_games`).c,
      totalBusinesses: db.get(`SELECT COUNT(*) c FROM businesses`).c,
      totalTransactions: db.get(`SELECT COUNT(*) c FROM transactions`).c,
      avgNetWorth: db.get(`SELECT AVG(net_worth) a FROM save_games`).a || 0,
      topNetWorth: db.all(`SELECT sg.user_id, sg.net_worth, u.email FROM save_games sg JOIN users u ON u.id = sg.user_id ORDER BY sg.net_worth DESC LIMIT 10`),
    };
  },
};

module.exports = AdminService;
