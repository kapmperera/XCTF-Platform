const jwt = require("jsonwebtoken");
const { get } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "xctf_super_secret_cyber_key_2026";

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. Token missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await get(
      `SELECT id, username, email, role, score, avatar, is_banned FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: "User account no longer exists." });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "Account has been suspended by CTF Administrators." });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Administrator privileges required." });
    }
    next();
  });
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await get(
        `SELECT id, username, email, role, score, avatar, is_banned FROM users WHERE id = ?`,
        [decoded.id]
      );
      if (user && !user.is_banned) {
        req.user = user;
      }
    }
  } catch (e) {
    // optional, ignore token errors
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  JWT_SECRET
};
