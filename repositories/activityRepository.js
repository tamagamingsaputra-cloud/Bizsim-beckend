const { getDb } = require("../config/database");

const ActivityRepository = {
  addTransaction(userId, { type, description, amount, gameTime }) {
    getDb().run(
      `INSERT INTO transactions (user_id, type, description, amount, game_time) VALUES (?,?,?,?,?)`,
      [userId, type, description, amount, gameTime || null]
    );
  },
  listTransactions(userId, limit = 60) {
    return getDb().all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?`, [userId, limit]);
  },

  unlockAchievement(userId, achievementId) {
    getDb().run(`INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)`, [userId, achievementId]);
  },
  listAchievements(userId) {
    return getDb().all(`SELECT * FROM achievements WHERE user_id = ?`, [userId]);
  },

  addNotification(userId, { title, body, tone = "info" }) {
    getDb().run(`INSERT INTO notifications (user_id, title, body, tone) VALUES (?,?,?,?)`, [userId, title, body, tone]);
  },
  broadcastNotification({ title, body, tone = "info" }) {
    getDb().run(`INSERT INTO notifications (user_id, title, body, tone) VALUES (NULL,?,?,?)`, [title, body, tone]);
  },
  listNotifications(userId, limit = 50) {
    return getDb().all(
      `SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT ?`,
      [userId, limit]
    );
  },

  recordEventTrigger(userId, eventId, regionKey) {
    getDb().run(`INSERT INTO event_history (user_id, event_id, region_key) VALUES (?,?,?)`, [userId, eventId, regionKey || null]);
  },
  listEventCatalog() {
    return getDb().all(`SELECT * FROM events`);
  },

  recordMarketPrice(assetId, price) {
    getDb().run(`INSERT INTO market_history (asset_id, price) VALUES (?, ?)`, [assetId, price]);
  },
  listOnlineAssets() {
    return getDb().all(`SELECT * FROM online_assets`);
  },
};

module.exports = ActivityRepository;
