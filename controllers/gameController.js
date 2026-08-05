const GameService = require("../services/gameService");
const ActivityRepository = require("../repositories/activityRepository");
const { readJsonBody } = require("../utils/body");
const { ok, badRequest, notFound, serverError } = require("../utils/respond");

const GameController = {
  async save(req, res) {
    const body = await readJsonBody(req);
    if (!body.state) return badRequest(res, "Field 'state' wajib diisi");
    try {
      const record = GameService.save(req.user.id, body.state);
      ok(res, { savedAt: record.updated_at, netWorth: record.net_worth });
    } catch (e) { e.code === "BAD_REQUEST" ? badRequest(res, e.message) : serverError(res, e.message); }
  },

  async load(req, res) {
    const record = GameService.load(req.user.id);
    if (!record) return notFound(res, "Belum ada save game");
    ok(res, { state: record.state, updatedAt: record.updated_at });
  },

  async getBusinesses(req, res) { ok(res, { businesses: GameService.getBusinesses(req.user.id) }); },
  async getAssets(req, res) { ok(res, GameService.getAssets(req.user.id)); },
  async getEvents(req, res) { ok(res, GameService.getEvents(req.user.id)); },
  async getTransactions(req, res) { ok(res, { transactions: ActivityRepository.listTransactions(req.user.id) }); },
  async getNotifications(req, res) { ok(res, { notifications: ActivityRepository.listNotifications(req.user.id) }); },

  async buy(req, res) {
    const body = await readJsonBody(req);
    try { ok(res, { position: GameService.buy(req.user.id, body) }); }
    catch (e) { e.code === "BAD_REQUEST" ? badRequest(res, e.message) : serverError(res, e.message); }
  },

  async sell(req, res) {
    const body = await readJsonBody(req);
    try { ok(res, GameService.sell(req.user.id, body)); }
    catch (e) { e.code === "BAD_REQUEST" ? badRequest(res, e.message) : serverError(res, e.message); }
  },
};

module.exports = GameController;
