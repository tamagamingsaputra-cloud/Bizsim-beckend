const UserRepository = require("../repositories/userRepository");
const { readJsonBody } = require("../utils/body");
const { sanitizeText } = require("../utils/validate");
const { ok } = require("../utils/respond");

const ProfileController = {
  async getProfile(req, res) {
    const profile = UserRepository.getProfile(req.user.id);
    ok(res, { user: req.user, profile: profile || null });
  },

  async updateProfile(req, res) {
    const body = await readJsonBody(req);
    const updated = UserRepository.upsertProfile(req.user.id, {
      displayName: body.displayName ? sanitizeText(body.displayName, 100) : undefined,
      avatarUrl: body.avatarUrl ? sanitizeText(body.avatarUrl, 500) : undefined,
      bio: body.bio ? sanitizeText(body.bio, 500) : undefined,
    });
    ok(res, { profile: updated });
  },
};

module.exports = ProfileController;
