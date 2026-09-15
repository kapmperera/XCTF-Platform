const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { get, run, all } = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "Username must be between 3 and 20 characters." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // Check existing
    const existingUser = await get(
      `SELECT id FROM users WHERE username = ? OR email = ?`,
      [username.trim(), email.trim().toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({ error: "Username or email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const result = await run(
      `INSERT INTO users (username, email, password_hash, role, score, avatar) VALUES (?, ?, ?, 'participant', 0, ?)`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, avatar]
    );

    const newUser = await get(
      `SELECT id, username, email, role, score, avatar, created_at FROM users WHERE id = ?`,
      [result.lastID]
    );

    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.status(201).json({
      message: "Registration successful!",
      token,
      user: newUser
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: "Server error during registration." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await get(
      `SELECT * FROM users WHERE email = ? OR username = ?`,
      [email.trim().toLowerCase(), email.trim()]
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "7d"
    });

    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      score: user.score,
      avatar: user.avatar,
      created_at: user.created_at
    };

    return res.json({
      message: "Login successful!",
      token,
      user: userProfile
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Server error during login." });
  }
});

// ME
router.get("/me", requireAuth, async (req, res) => {
  try {
    const solves = await all(`SELECT count(*) as count FROM solves WHERE user_id = ?`, [req.user.id]);
    const rankRow = await get(
      `SELECT count(*) + 1 as rank FROM users WHERE score > (SELECT score FROM users WHERE id = ?)`,
      [req.user.id]
    );

    return res.json({
      user: {
        ...req.user,
        solves_count: solves[0] ? solves[0].count : 0,
        rank: rankRow ? rankRow.rank : 1
      }
    });
  } catch (err) {
    console.error("Me Error:", err);
    return res.status(500).json({ error: "Server error fetching profile." });
  }
});

// UPDATE PROFILE
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (avatar) {
      await run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatar, req.user.id]);
    }
    const updated = await get(`SELECT id, username, email, role, score, avatar FROM users WHERE id = ?`, [req.user.id]);
    return res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

module.exports = router;
