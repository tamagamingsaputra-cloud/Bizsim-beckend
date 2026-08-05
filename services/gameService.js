/* ============================================================
   services/gameService.js
   Menyimpan/mengambil snapshot game (sumber kebenaran gameplay
   tetap di client — engine simulasi TIDAK diduplikasi di sini),
   plus sinkronisasi ringkasan ke tabel ternormalisasi untuk
   kebutuhan admin panel & query cepat, dan endpoint buy/sell
   ringan yang mencatat transaksi + posisi portfolio di server.
   ============================================================ */
const { getDb } = require("../config/database");
const SaveGameRepository = require("../repositories/saveGameRepository");
const ActivityRepository = require("../repositories/activityRepository");
const { sanitizeText, isFiniteNumber } = require("../utils/validate");

function syncNormalizedTables(userId, state) {
  const db = getDb();

  db.run(`DELETE FROM businesses WHERE user_id = ?`, [userId]);
  (state.businesses || []).forEach(b => {
    const info = db.run(
      `INSERT INTO businesses (user_id, business_type, name, total_profit) VALUES (?,?,?,?)`,
      [userId, sanitizeText(b.type, 50), sanitizeText(b.name, 100), Number(b.totalProfit || 0)]
    );
    (b.upgrades || []).forEach(upId => {
      db.run(`INSERT INTO business_levels (business_id, upgrade_id) VALUES (?, ?)`, [info.lastInsertRowid, sanitizeText(upId, 50)]);
    });
  });

  db.run(`DELETE FROM portfolio WHERE user_id = ?`, [userId]);
  Object.entries(state.market?.portfolio || {}).forEach(([assetId, pos]) => {
    if (pos.qty > 0) {
      db.run(`INSERT INTO portfolio (user_id, asset_id, qty, avg_buy) VALUES (?,?,?,?)`,
        [userId, assetId, pos.qty, pos.avgBuy]);
    }
  });

  if (state.offline?.gold) {
    const g = state.offline.gold;
    db.run(
      `INSERT INTO gold_assets (user_id, grams, avg_buy_price) VALUES (?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET grams = excluded.grams, avg_buy_price = excluded.avg_buy_price, updated_at = datetime('now')`,
      [userId, g.grams || 0, g.avgBuyPrice || 0]
    );
  }

  db.run(`DELETE FROM lands WHERE user_id = ?`, [userId]);
  (state.offline?.land || []).forEach(l => {
    db.run(
      `INSERT INTO lands (user_id, location_key, area_m2, price_per_m2, total_price, current_value, developed, rented) VALUES (?,?,?,?,?,?,?,?)`,
      [userId, l.locationKey, l.area, l.pricePerM2, l.totalPrice, l.currentValue, l.developed ? 1 : 0, l.rented ? 1 : 0]
    );
  });

  db.run(`DELETE FROM properties WHERE user_id = ?`, [userId]);
  (state.offline?.properties || []).forEach(p => {
    db.run(
      `INSERT INTO properties (user_id, property_type, location_key, buy_price, current_value, rented, rent_per_month) VALUES (?,?,?,?,?,?,?)`,
      [userId, p.propType, p.locationKey, p.buyPrice, p.currentValue, p.rented ? 1 : 0, p.rentPerMonth]
    );
  });

  db.run(`DELETE FROM offline_assets WHERE user_id = ?`, [userId]);
  ["vehicles", "machines", "warehouses"].forEach(cat => {
    (state.offline?.[cat] || []).forEach(v => {
      db.run(
        `INSERT INTO offline_assets (user_id, category, ref_key, name, buy_price, current_value) VALUES (?,?,?,?,?,?)`,
        [userId, cat.slice(0, -1), v.id, v.name, v.buyPrice, v.currentValue]
      );
    });
  });

  (state.achievements || []).forEach(id => ActivityRepository.unlockAchievement(userId, id));
}

const GameService = {
  save(userId, state) {
    if (!state || typeof state !== "object") { const e = new Error("State tidak valid"); e.code = "BAD_REQUEST"; throw e; }
    const netWorth = isFiniteNumber(state.__netWorth) ? state.__netWorth : 0;
    const record = SaveGameRepository.upsert(userId, "default", { ...state, __netWorth: netWorth });
    syncNormalizedTables(userId, state);
    return record;
  },

  load(userId) {
    const record = SaveGameRepository.get(userId, "default");
    if (!record) return null;
    return { ...record, state: JSON.parse(record.state_json) };
  },

  getBusinesses(userId) {
    return getDb().all(
      `SELECT b.*, GROUP_CONCAT(bl.upgrade_id) as upgrades FROM businesses b
       LEFT JOIN business_levels bl ON bl.business_id = b.id
       WHERE b.user_id = ? GROUP BY b.id ORDER BY b.id DESC`, [userId]);
  },

  getAssets(userId) {
    const db = getDb();
    return {
      onlineCatalog: ActivityRepository.listOnlineAssets(),
      portfolio: db.all(`SELECT * FROM portfolio WHERE user_id = ?`, [userId]),
      gold: db.get(`SELECT * FROM gold_assets WHERE user_id = ?`, [userId]) || { grams: 0, avg_buy_price: 0 },
      land: db.all(`SELECT * FROM lands WHERE user_id = ?`, [userId]),
      properties: db.all(`SELECT * FROM properties WHERE user_id = ?`, [userId]),
      offline: db.all(`SELECT * FROM offline_assets WHERE user_id = ?`, [userId]),
    };
  },

  getEvents(userId) {
    return {
      catalog: ActivityRepository.listEventCatalog(),
      history: getDb().all(`SELECT * FROM event_history WHERE user_id = ? ORDER BY id DESC LIMIT 30`, [userId]),
    };
  },

  buy(userId, { assetId, qty, price }) {
    if (!assetId || !isFiniteNumber(qty) || qty <= 0 || !isFiniteNumber(price) || price <= 0) {
      const e = new Error("Parameter buy tidak valid"); e.code = "BAD_REQUEST"; throw e;
    }
    const db = getDb();
    const amount = qty * price;
    const existing = db.get(`SELECT * FROM portfolio WHERE user_id = ? AND asset_id = ?`, [userId, assetId]);
    if (existing) {
      const newQty = existing.qty + qty;
      const newAvg = (existing.avg_buy * existing.qty + amount) / newQty;
      db.run(`UPDATE portfolio SET qty = ?, avg_buy = ?, updated_at = datetime('now') WHERE user_id = ? AND asset_id = ?`,
        [newQty, newAvg, userId, assetId]);
    } else {
      db.run(`INSERT INTO portfolio (user_id, asset_id, qty, avg_buy) VALUES (?,?,?,?)`, [userId, assetId, qty, price]);
    }
    ActivityRepository.addTransaction(userId, { type: "Buy", description: sanitizeText(`Beli ${qty} ${assetId} @ ${price}`), amount: -amount });
    return db.get(`SELECT * FROM portfolio WHERE user_id = ? AND asset_id = ?`, [userId, assetId]);
  },

  sell(userId, { assetId, qty, price }) {
    if (!assetId || !isFiniteNumber(qty) || qty <= 0 || !isFiniteNumber(price) || price <= 0) {
      const e = new Error("Parameter sell tidak valid"); e.code = "BAD_REQUEST"; throw e;
    }
    const db = getDb();
    const existing = db.get(`SELECT * FROM portfolio WHERE user_id = ? AND asset_id = ?`, [userId, assetId]);
    if (!existing || existing.qty < qty) { const e = new Error("Kepemilikan tidak cukup"); e.code = "BAD_REQUEST"; throw e; }
    const proceeds = qty * price;
    const remaining = existing.qty - qty;
    if (remaining <= 0.000001) {
      db.run(`DELETE FROM portfolio WHERE user_id = ? AND asset_id = ?`, [userId, assetId]);
    } else {
      db.run(`UPDATE portfolio SET qty = ?, updated_at = datetime('now') WHERE user_id = ? AND asset_id = ?`, [remaining, userId, assetId]);
    }
    ActivityRepository.addTransaction(userId, { type: "Sell", description: sanitizeText(`Jual ${qty} ${assetId} @ ${price}`), amount: proceeds });
    return { assetId, soldQty: qty, proceeds, remainingQty: Math.max(0, remaining) };
  },
};

module.exports = GameService;
