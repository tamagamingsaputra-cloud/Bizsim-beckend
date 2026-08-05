/* ============================================================
   middleware/role.js — hak akses berbasis role
   Urutan hak akses: guest < member < admin < superadmin
   ============================================================ */
const { forbidden } = require("../utils/respond");

const LEVEL = { guest: 0, member: 1, admin: 2, superadmin: 3 };

function requireRole(minRole) {
  return async function (req, res) {
    const level = LEVEL[req.user?.role] ?? -1;
    if (level < LEVEL[minRole]) { forbidden(res, `Membutuhkan role minimal "${minRole}"`); return false; }
    return true;
  };
}

module.exports = { requireRole };
