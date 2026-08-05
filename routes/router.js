/* ============================================================
   routes/router.js
   Router kecil tanpa dependency (pengganti express Router).
   Mendukung path param (:id) dan chain middleware => handler.
   ============================================================ */
const { notFound, serverError } = require("../utils/respond");

class Router {
  constructor() { this.routes = []; }

  _add(method, path, fns) {
    const handler = fns.pop();
    const middlewares = fns;
    const segments = path.split("/").filter(Boolean);
    this.routes.push({ method, segments, middlewares, handler });
  }
  get(path, ...fns) { this._add("GET", path, fns); }
  post(path, ...fns) { this._add("POST", path, fns); }
  put(path, ...fns) { this._add("PUT", path, fns); }
  delete(path, ...fns) { this._add("DELETE", path, fns); }

  _match(route, method, urlSegments) {
    if (route.method !== method) return null;
    if (route.segments.length !== urlSegments.length) return null;
    const params = {};
    for (let i = 0; i < route.segments.length; i++) {
      const r = route.segments[i], u = urlSegments[i];
      if (r.startsWith(":")) params[r.slice(1)] = decodeURIComponent(u);
      else if (r !== u) return null;
    }
    return params;
  }

  async handle(req, res) {
    const url = new URL(req.url, "http://internal");
    const urlSegments = url.pathname.split("/").filter(Boolean);

    for (const route of this.routes) {
      const params = this._match(route, req.method, urlSegments);
      if (!params) continue;
      try {
        for (const mw of route.middlewares) {
          const cont = await mw(req, res, params);
          if (cont === false) return; // middleware sudah mengirim response (401/403/429/dst)
        }
        await route.handler(req, res, params);
      } catch (e) {
        console.error("[router] error:", e);
        if (!res.writableEnded) serverError(res, "Terjadi kesalahan internal");
      }
      return;
    }
    notFound(res, "Endpoint tidak ditemukan");
  }
}

module.exports = Router;
