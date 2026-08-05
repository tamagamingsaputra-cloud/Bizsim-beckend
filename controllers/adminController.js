const AdminService = require("../services/adminService");
const { readJsonBody } = require("../utils/body");
const { ok, badRequest, notFound, forbidden, serverError } = require("../utils/respond");

function handle(res, e) {
  if (e.code === "NOT_FOUND") return notFound(res, e.message);
  if (e.code === "FORBIDDEN") return forbidden(res, e.message);
  if (e.code === "BAD_REQUEST") return badRequest(res, e.message);
  return serverError(res, e.message);
}

const AdminController = {
  async listUsers(req, res) {
    const url = new URL(req.url, "http://x");
    const limit = Number(url.searchParams.get("limit")) || 100;
    const offset = Number(url.searchParams.get("offset")) || 0;
    ok(res, { users: AdminService.listUsers(limit, offset) });
  },

  async deleteUser(req, res, params) {
    try { AdminService.deleteUser(Number(params.id)); ok(res, { message: "User dihapus" }); }
    catch (e) { handle(res, e); }
  },

  async setUserRole(req, res, params) {
    const body = await readJsonBody(req);
    try { AdminService.setUserRole(Number(params.id), body.role); ok(res, { message: "Role diperbarui" }); }
    catch (e) { handle(res, e); }
  },

  async setUserActive(req, res, params) {
    const body = await readJsonBody(req);
    AdminService.setUserActive(Number(params.id), !!body.isActive);
    ok(res, { message: "Status akun diperbarui" });
  },

  async addEvent(req, res) {
    const body = await readJsonBody(req);
    try { AdminService.addEvent(body); ok(res, { message: "Event ditambahkan/diperbarui" }); }
    catch (e) { handle(res, e); }
  },

  async updateMarket(req, res, params) {
    const body = await readJsonBody(req);
    try { ok(res, { asset: AdminService.updateMarketAsset(params.id, body) }); }
    catch (e) { handle(res, e); }
  },

  async sendNotification(req, res) {
    const body = await readJsonBody(req);
    try { AdminService.sendNotification(body); ok(res, { message: "Notifikasi terkirim" }); }
    catch (e) { handle(res, e); }
  },

  async stats(req, res) { ok(res, AdminService.stats()); },
};

module.exports = AdminController;
