/* ============================================================
   utils/respond.js — helper response JSON konsisten
   ============================================================ */
function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

const ok = (res, data = {}) => send(res, 200, { success: true, ...data });
const created = (res, data = {}) => send(res, 201, { success: true, ...data });
const badRequest = (res, message = "Permintaan tidak valid") => send(res, 400, { success: false, error: message });
const unauthorized = (res, message = "Tidak terautentikasi") => send(res, 401, { success: false, error: message });
const forbidden = (res, message = "Tidak memiliki akses") => send(res, 403, { success: false, error: message });
const notFound = (res, message = "Tidak ditemukan") => send(res, 404, { success: false, error: message });
const conflict = (res, message = "Data sudah ada") => send(res, 409, { success: false, error: message });
const tooMany = (res, message = "Terlalu banyak permintaan, coba lagi nanti") => send(res, 429, { success: false, error: message });
const serverError = (res, message = "Terjadi kesalahan pada server") => send(res, 500, { success: false, error: message });

module.exports = { send, ok, created, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, serverError };
