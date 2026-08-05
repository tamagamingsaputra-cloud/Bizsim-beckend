const { getDb } = require("../config/database");

const SaveGameRepository = {
  get(userId, slot = "default") {
    return getDb().get(`SELECT * FROM save_games WHERE user_id = ? AND slot = ?`, [userId, slot]);
  },
  upsert(userId, slot, stateObj) {
    const db = getDb();
    const json = JSON.stringify(stateObj);
    const netWorth = Number(stateObj?.__netWorth || 0);
    const t = stateObj?.time || {};
    const existing = this.get(userId, slot);
    if (existing) {
      db.run(
        `UPDATE save_games SET state_json = ?, net_worth = ?, game_year = ?, game_month = ?, game_day = ?, updated_at = datetime('now')
         WHERE user_id = ? AND slot = ?`,
        [json, netWorth, t.year || 1, t.month || 1, t.day || 1, userId, slot]
      );
    } else {
      db.run(
        `INSERT INTO save_games (user_id, slot, state_json, net_worth, game_year, game_month, game_day) VALUES (?,?,?,?,?,?,?)`,
        [userId, slot, json, netWorth, t.year || 1, t.month || 1, t.day || 1]
      );
    }
    return this.get(userId, slot);
  },
  delete(userId, slot = "default") {
    getDb().run(`DELETE FROM save_games WHERE user_id = ? AND slot = ?`, [userId, slot]);
  },
};

module.exports = SaveGameRepository;
