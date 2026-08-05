/* ============================================================
   controllers/authController.js
   ============================================================ */
const AuthService = require("../services/authService");
const { readJsonBody } = require("../utils/body");
const { isValidEmail, isValidPassword } = require("../utils/validate");
const { ok, created, badRequest, unauthorized, conflict, forbidden, serverError } = require("../utils/respond");

function handleAuthError(res, e) {
  if (e.code === "CONFLICT") return conflict(res, e.message);
  if (e.code === "UNAUTHORIZED") return unauthorized(res, e.message);
  if (e.code === "FORBIDDEN") return forbidden(res, e.message);
  return serverError(res, e.message);
}

const AuthController = {
  async register(req, res) {
    const body = await readJsonBody(req);
    if (!isValidEmail(body.email)) return badRequest(res, "Email tidak valid");
    if (!isValidPassword(body.password)) return badRequest(res, "Password minimal 8 karakter");
    try {
      const result = await AuthService.register(body.email.toLowerCase().trim(), body.password);
      created(res, result);
    } catch (e) { handleAuthError(res, e); }
  },

  async login(req, res) {
    const body = await readJsonBody(req);
    if (!isValidEmail(body.email) || typeof body.password !== "string") return badRequest(res, "Email/password tidak valid");
    try {
      const result = await AuthService.login(body.email.toLowerCase().trim(), body.password);
      ok(res, result);
    } catch (e) { handleAuthError(res, e); }
  },

  async googleLogin(req, res) {
    const body = await readJsonBody(req);
    if (!body.idToken || typeof body.idToken !== "string") return badRequest(res, "idToken wajib diisi");
    try {
      const result = await AuthService.googleLogin(body.idToken);
      ok(res, result);
    } catch (e) { handleAuthError(res, e); }
  },

  async guestLogin(req, res) {
    try {
      const result = await AuthService.guestLogin();
      ok(res, result);
    } catch (e) { handleAuthError(res, e); }
  },

  async refresh(req, res) {
    const body = await readJsonBody(req);
    if (!body.refreshToken) return badRequest(res, "refreshToken wajib diisi");
    try {
      const result = await AuthService.refresh(body.refreshToken);
      ok(res, result);
    } catch (e) { handleAuthError(res, e); }
  },

  async logout(req, res) {
    const body = await readJsonBody(req).catch(() => ({}));
    await AuthService.logout(body.refreshToken);
    ok(res, { message: "Logged out" });
  },
};

module.exports = AuthController;
