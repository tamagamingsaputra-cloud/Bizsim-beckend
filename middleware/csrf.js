/* ============================================================
   middleware/csrf.js
   Catatan: API ini utamanya dipakai lewat header
   `Authorization: Bearer <token>`, yang secara desain sudah
   kebal terhadap CSRF klasik (browser tidak otomatis melampirkan
   header ini lintas origin seperti ia melampirkan cookie).
   Middleware ini disediakan untuk skenario di mana kamu memilih
   menyimpan token di cookie (mis. refresh token) — pakai pola
   double-submit cookie: header X-CSRF-Token harus sama dengan
   cookie csrf_token.
   ============================================================ */
const { forbidden } = require("../utils/respond");

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").filter(Boolean).map(p => {
    const idx = p.indexOf("=");
    return [p.slice(0, idx).trim(), decodeURIComponent(p.slice(idx + 1).trim())];
  }));
}

async function verifyCsrf(req, res) {
  const cookies = parseCookies(req);
  const cookieToken = cookies["csrf_token"];
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    forbidden(res, "CSRF token tidak valid");
    return false;
  }
  return true;
}

module.exports = { verifyCsrf, parseCookies };
