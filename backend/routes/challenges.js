const express = require("express");
const router = express.Router();
const { get, run, all } = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");

// GET ALL CHALLENGES (with optional auth to mark solved status)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { category, difficulty, q, status, sort } = req.query;

    let query = `
      SELECT 
        c.id, c.title, c.slug, c.category_id, c.difficulty, c.points, 
        c.description, c.hints, c.author, c.url, c.files, c.created_at,
        cat.name as category_name, cat.slug as category_slug,
        (SELECT COUNT(*) FROM solves WHERE challenge_id = c.id) as solves_count
      FROM challenges c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.is_active = 1
    `;

    const params = [];

    if (category && category !== "all") {
      query += ` AND cat.slug = ?`;
      params.push(category);
    }

    if (difficulty && difficulty !== "all") {
      query += ` AND c.difficulty = ?`;
      params.push(difficulty);
    }

    if (q) {
      query += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    // Order by
    if (sort === "points_desc") {
      query += ` ORDER BY c.points DESC`;
    } else if (sort === "points_asc") {
      query += ` ORDER BY c.points ASC`;
    } else if (sort === "solves") {
      query += ` ORDER BY solves_count DESC`;
    } else if (sort === "difficulty") {
      query += ` ORDER BY CASE c.difficulty WHEN 'Beginner' THEN 1 WHEN 'Easy' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Hard' THEN 4 WHEN 'Insane' THEN 5 END ASC`;
    } else {
      query += ` ORDER BY c.created_at DESC`;
    }

    const rows = await all(query, params);

    // Get current user's solved challenge IDs
    let userSolvedSet = new Set();
    if (req.user) {
      const userSolves = await all(`SELECT challenge_id FROM solves WHERE user_id = ?`, [req.user.id]);
      userSolves.forEach(s => userSolvedSet.add(s.challenge_id));
    }

    const challenges = rows.map(ch => {
      let hintsArr = [];
      let filesArr = [];
      try { hintsArr = JSON.parse(ch.hints || "[]"); } catch (e) {}
      try { filesArr = JSON.parse(ch.files || "[]"); } catch (e) {}

      return {
        id: ch.id,
        title: ch.title,
        slug: ch.slug,
        category_id: ch.category_id,
        category_name: ch.category_name || "General",
        category_slug: ch.category_slug || "general",
        difficulty: ch.difficulty,
        points: ch.points,
        description: ch.description,
        hints_count: hintsArr.length,
        author: ch.author,
        url: ch.url,
        files: filesArr,
        solves_count: ch.solves_count,
        solved: userSolvedSet.has(ch.id)
      };
    });

    // Filter by solved/unsolved status if requested
    let result = challenges;
    if (status === "solved") {
      result = challenges.filter(c => c.solved);
    } else if (status === "unsolved") {
      result = challenges.filter(c => !c.solved);
    }

    return res.json({ challenges: result });
  } catch (err) {
    console.error("Fetch Challenges Error:", err);
    return res.status(500).json({ error: "Failed to fetch challenges." });
  }
});

// GET SINGLE CHALLENGE DETAILS
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const chId = req.params.id;
    const ch = await get(
      `SELECT c.*, cat.name as category_name, cat.slug as category_slug,
              (SELECT COUNT(*) FROM solves WHERE challenge_id = c.id) as solves_count
       FROM challenges c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ? AND c.is_active = 1`,
      [chId]
    );

    if (!ch) {
      return res.status(404).json({ error: "Challenge not found." });
    }

    let isSolved = false;
    if (req.user) {
      const solvedRow = await get(`SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?`, [req.user.id, chId]);
      isSolved = !!solvedRow;
    }

    let hintsArr = [];
    let filesArr = [];
    try { hintsArr = JSON.parse(ch.hints || "[]"); } catch (e) {}
    try { filesArr = JSON.parse(ch.files || "[]"); } catch (e) {}

    // Get recent solvers (first blood & top solvers)
    const solvers = await all(
      `SELECT s.created_at, s.is_first_blood, u.username, u.avatar 
       FROM solves s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.challenge_id = ? 
       ORDER BY s.created_at ASC LIMIT 5`,
      [chId]
    );

    return res.json({
      challenge: {
        id: ch.id,
        title: ch.title,
        slug: ch.slug,
        category_name: ch.category_name,
        category_slug: ch.category_slug,
        difficulty: ch.difficulty,
        points: ch.points,
        description: ch.description,
        hints: hintsArr,
        author: ch.author,
        url: ch.url,
        files: filesArr,
        solves_count: ch.solves_count,
        solved: isSolved,
        solvers
      }
    });
  } catch (err) {
    console.error("Get Challenge Error:", err);
    return res.status(500).json({ error: "Failed to retrieve challenge details." });
  }
});

// SUBMIT FLAG
router.post("/:id/submit", requireAuth, async (req, res) => {
  try {
    const chId = req.params.id;
    const { flag } = req.body;
    const userId = req.user.id;

    if (!flag || typeof flag !== "string") {
      return res.status(400).json({ error: "Please enter a valid flag string." });
    }

    const ch = await get(`SELECT * FROM challenges WHERE id = ? AND is_active = 1`, [chId]);
    if (!ch) {
      return res.status(404).json({ error: "Challenge not found or disabled." });
    }

    // Check if user already solved
    const existingSolve = await get(`SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?`, [userId, chId]);
    if (existingSolve) {
      return res.status(400).json({
        is_correct: true,
        already_solved: true,
        message: "You have already solved this challenge!"
      });
    }

    const submittedClean = flag.trim();
    const targetClean = ch.flag.trim();
    const isCorrect = (submittedClean === targetClean);

    // Record submission attempt
    await run(
      `INSERT INTO submissions (user_id, challenge_id, submitted_flag, is_correct, points_awarded) VALUES (?, ?, ?, ?, ?)`,
      [userId, chId, submittedClean, isCorrect ? 1 : 0, isCorrect ? ch.points : 0]
    );

    if (!isCorrect) {
      return res.json({
        is_correct: false,
        message: "Incorrect flag. Review your solution and try again!"
      });
    }

    // Correct Flag!
    // Check if First Blood
    const totalSolvesRow = await get(`SELECT COUNT(*) as count FROM solves WHERE challenge_id = ?`, [chId]);
    const isFirstBlood = (totalSolvesRow.count === 0) ? 1 : 0;

    // Record Solve
    await run(
      `INSERT INTO solves (user_id, challenge_id, points_awarded, is_first_blood) VALUES (?, ?, ?, ?)`,
      [userId, chId, ch.points, isFirstBlood]
    );

    // Update User Score
    await run(`UPDATE users SET score = score + ? WHERE id = ?`, [ch.points, userId]);

    // Check unlocked achievements
    const newUnlocked = await checkAndAwardAchievements(userId, ch);

    const updatedUser = await get(`SELECT score FROM users WHERE id = ?`, [userId]);

    return res.json({
      is_correct: true,
      points_awarded: ch.points,
      is_first_blood: !!isFirstBlood,
      new_score: updatedUser ? updatedUser.score : 0,
      achievements_unlocked: newUnlocked,
      message: isFirstBlood
        ? `🔥 FIRST BLOOD! Correct flag submitted! +${ch.points} pts awarded.`
        : `🎉 Correct Flag! +${ch.points} pts awarded.`
    });
  } catch (err) {
    console.error("Submit Flag Error:", err);
    return res.status(500).json({ error: "Error processing flag submission." });
  }
});

// Helper: Award achievements dynamically
async function checkAndAwardAchievements(userId, challenge) {
  const unlocked = [];

  // Check 1: First blood
  const fbCount = await get(`SELECT COUNT(*) as count FROM solves WHERE user_id = ? AND is_first_blood = 1`, [userId]);
  if (fbCount && fbCount.count >= 1) {
    await unlockAchievement(userId, "first_blood", unlocked);
  }

  // Check 2: Category specific
  if (challenge.category_id) {
    const cat = await get(`SELECT slug FROM categories WHERE id = ?`, [challenge.category_id]);
    if (cat && cat.slug === "web-exploitation") {
      await unlockAchievement(userId, "web_hunter", unlocked);
    } else if (cat && cat.slug === "cryptography") {
      await unlockAchievement(userId, "crypto_breaker", unlocked);
    }
  }

  // Check 3: Solve count >= 3
  const solveCount = await get(`SELECT COUNT(*) as count FROM solves WHERE user_id = ?`, [userId]);
  if (solveCount && solveCount.count >= 3) {
    await unlockAchievement(userId, "rookie", unlocked);
  }

  // Check 4: Score >= 100
  const userRow = await get(`SELECT score FROM users WHERE id = ?`, [userId]);
  if (userRow && userRow.score >= 100) {
    await unlockAchievement(userId, "century_club", unlocked);
  }

  return unlocked;
}

async function unlockAchievement(userId, key, unlockedArray) {
  const ach = await get(`SELECT id, title, description, points, icon FROM achievements WHERE key = ?`, [key]);
  if (!ach) return;

  try {
    await run(
      `INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)`,
      [userId, ach.id]
    );
    unlockedArray.push({
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      points: ach.points
    });
  } catch (err) {
    // Already unlocked UNIQUE constraint ignore
  }
}

module.exports = router;
