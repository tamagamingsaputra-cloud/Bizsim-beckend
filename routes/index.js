/* ============================================================
   routes/index.js — daftar seluruh endpoint REST API BizSim
   ============================================================ */
const Router = require("./router");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { generalLimiter, loginLimiter } = require("../middleware/rateLimit");

const AuthController = require("../controllers/authController");
const ProfileController = require("../controllers/profileController");
const GameController = require("../controllers/gameController");
const AdminController = require("../controllers/adminController");
const { ok } = require("../utils/respond");

const router = new Router();
const limit = generalLimiter();
const loginLimit = loginLimiter();

// ---------- Health ----------
router.get("/api/health", limit, async (req, res) => ok(res, { status: "up", time: new Date().toISOString() }));

// ---------- Auth ----------
router.post("/api/register", limit, AuthController.register);
router.post("/api/login", loginLimit, AuthController.login);
router.post("/api/google-login", loginLimit, AuthController.googleLogin);
router.post("/api/guest-login", limit, AuthController.guestLogin);
router.post("/api/refresh", limit, AuthController.refresh);
router.post("/api/logout", limit, AuthController.logout);

// ---------- Profile ----------
router.get("/api/profile", limit, requireAuth, ProfileController.getProfile);
router.put("/api/profile", limit, requireAuth, ProfileController.updateProfile);

// ---------- Game data (cloud save) ----------
router.post("/api/save", limit, requireAuth, GameController.save);
router.post("/api/load", limit, requireAuth, GameController.load); // sesuai spec: POST /api/load
router.get("/api/business", limit, requireAuth, GameController.getBusinesses);
router.get("/api/assets", limit, requireAuth, GameController.getAssets);
router.get("/api/events", limit, requireAuth, GameController.getEvents);
router.get("/api/transactions", limit, requireAuth, GameController.getTransactions);
router.get("/api/notifications", limit, requireAuth, GameController.getNotifications);
router.post("/api/buy", limit, requireAuth, GameController.buy);
router.post("/api/sell", limit, requireAuth, GameController.sell);

// ---------- Admin ----------
router.get("/api/admin/users", limit, requireAuth, requireRole("admin"), AdminController.listUsers);
router.delete("/api/admin/users/:id", limit, requireAuth, requireRole("superadmin"), AdminController.deleteUser);
router.put("/api/admin/users/:id/role", limit, requireAuth, requireRole("superadmin"), AdminController.setUserRole);
router.put("/api/admin/users/:id/active", limit, requireAuth, requireRole("admin"), AdminController.setUserActive);
router.post("/api/admin/events", limit, requireAuth, requireRole("admin"), AdminController.addEvent);
router.put("/api/admin/market/:id", limit, requireAuth, requireRole("admin"), AdminController.updateMarket);
router.post("/api/admin/notifications", limit, requireAuth, requireRole("admin"), AdminController.sendNotification);
router.get("/api/admin/stats", limit, requireAuth, requireRole("admin"), AdminController.stats);

module.exports = router;
