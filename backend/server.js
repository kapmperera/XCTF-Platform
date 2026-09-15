const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { initDatabase, all, get } = require("./db");

const authRoutes = require("./routes/auth");
const challengeRoutes = require("./routes/challenges");
const leaderboardRoutes = require("./routes/leaderboard");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");
const miniCtfRoutes = require("./routes/miniCtfs");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve challenge dynamic files from Challenges directory
const challengesDir = path.join(__dirname, "..", "Challenges");
app.use("/challenges-env", express.static(challengesDir));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mini-ctfs", miniCtfRoutes);

// Public Platform Info Route
app.get("/api/info", async (req, res) => {
  try {
    const totalChallenges = await get(`SELECT COUNT(*) as count FROM challenges WHERE is_active = 1`);
    const totalParticipants = await get(`SELECT COUNT(*) as count FROM users WHERE role = 'participant'`);
    const totalSolves = await get(`SELECT COUNT(*) as count FROM solves`);
    const categories = await all(`SELECT name, slug, icon, (SELECT COUNT(*) FROM challenges WHERE category_id = categories.id) as count FROM categories`);
    const configRows = await all(`SELECT key, value FROM competition_config`);
    
    const config = {};
    configRows.forEach(c => { config[c.key] = c.value; });

    // Highlight leaderboard top 3
    const top3 = await all(`
      SELECT u.id, u.username, u.avatar, u.score, COUNT(s.id) as solves_count
      FROM users u
      LEFT JOIN solves s ON u.id = s.user_id
      WHERE u.role = 'participant' AND u.is_banned = 0
      GROUP BY u.id
      ORDER BY u.score DESC
      LIMIT 3
    `);

    return res.json({
      title: config.title || "XCTF Cyber Warfare 2026",
      status: config.status || "active",
      start_time: config.start_time,
      end_time: config.end_time,
      rules: config.rules,
      metrics: {
        challenges_count: totalChallenges ? totalChallenges.count : 0,
        participants_count: totalParticipants ? totalParticipants.count : 0,
        solves_count: totalSolves ? totalSolves.count : 0
      },
      categories,
      top3
    });
  } catch (err) {
    console.error("Platform Info Error:", err);
    return res.status(500).json({ error: "Failed to fetch platform info." });
  }
});

// Handle direct non-API web routes gracefully (redirect to dev server or serve build)
app.get(["/challenges", "/challenges/*", "/mini-ctf", "/mini-ctf/*", "/mini-ctfs", "/mini-ctfs/*", "/dashboard", "/leaderboard"], (req, res) => {
  const frontendBuildPath = path.join(__dirname, "..", "frontend", "build", "index.html");
  if (fs.existsSync(frontendBuildPath)) {
    return res.sendFile(frontendBuildPath);
  }
  const fullPath = req.originalUrl || "/challenges";
  return res.redirect(`http://localhost:3000${fullPath}`);
});

// Serve frontend static build in production if built
const frontendBuild = path.join(__dirname, "..", "frontend", "build");
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendBuild, "index.html"));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

// Initialize DB and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` 🛡️  XCTF Command Center API running on port ${PORT}`);
      console.log(` 🚀  Challenge Environments: http://localhost:${PORT}/challenges-env/`);
      console.log(`==================================================`);
    });
  })
  .catch(err => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
