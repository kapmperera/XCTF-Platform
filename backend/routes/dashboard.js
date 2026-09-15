const express = require("express");
const router = express.Router();
const { get, all } = require("../db");
const { requireAuth } = require("../middleware/auth");

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Solved count & score
    const userRow = await get(`SELECT score, avatar, username, created_at FROM users WHERE id = ?`, [userId]);

    const rankRow = await get(
      `SELECT count(*) + 1 as rank FROM users WHERE score > (SELECT score FROM users WHERE id = ?) AND role = 'participant'`,
      [userId]
    );

    const totalChallengesRow = await get(`SELECT COUNT(*) as count FROM challenges WHERE is_active = 1`);
    const userSolvesRow = await get(`SELECT COUNT(*) as count FROM solves WHERE user_id = ?`, [userId]);

    const totalSubmissionsRow = await get(`SELECT COUNT(*) as count FROM submissions WHERE user_id = ?`, [userId]);
    const correctSubmissionsRow = await get(`SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND is_correct = 1`, [userId]);

    const totalSub = totalSubmissionsRow ? totalSubmissionsRow.count : 0;
    const correctSub = correctSubmissionsRow ? correctSubmissionsRow.count : 0;
    const accuracy = totalSub > 0 ? Math.round((correctSub / totalSub) * 100) : 100;

    // 2. Category progress
    const categories = await all(`
      SELECT 
        cat.id, cat.name, cat.slug, cat.icon,
        COUNT(c.id) as total_challenges,
        (SELECT COUNT(*) FROM solves s JOIN challenges ch ON s.challenge_id = ch.id WHERE s.user_id = ? AND ch.category_id = cat.id) as solved_challenges
      FROM categories cat
      LEFT JOIN challenges c ON cat.id = c.category_id AND c.is_active = 1
      GROUP BY cat.id
    `, [userId]);

    // 3. Recent Submissions
    const recentSubmissions = await all(`
      SELECT sub.id, sub.submitted_flag, sub.is_correct, sub.points_awarded, sub.created_at, ch.title as challenge_title, ch.difficulty
      FROM submissions sub
      JOIN challenges ch ON sub.challenge_id = ch.id
      WHERE sub.user_id = ?
      ORDER BY sub.created_at DESC
      LIMIT 10
    `, [userId]);

    // 4. Unlocked Achievements
    const achievements = await all(`
      SELECT a.id, a.key, a.title, a.description, a.icon, a.points, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `, [userId]);

    const allAchievementsCount = await get(`SELECT COUNT(*) as count FROM achievements`);

    // 5. Recommended Uncompleted Challenges
    const recommended = await all(`
      SELECT c.id, c.title, c.difficulty, c.points, cat.name as category_name
      FROM challenges c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.is_active = 1 AND c.id NOT IN (SELECT challenge_id FROM solves WHERE user_id = ?)
      ORDER BY c.points ASC
      LIMIT 4
    `, [userId]);

    return res.json({
      profile: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        score: userRow ? userRow.score : 0,
        rank: rankRow ? rankRow.rank : 1,
        avatar: userRow ? userRow.avatar : "",
        created_at: userRow ? userRow.created_at : ""
      },
      stats: {
        challenges_solved: userSolvesRow ? userSolvesRow.count : 0,
        challenges_total: totalChallengesRow ? totalChallengesRow.count : 0,
        accuracy_rate: accuracy,
        total_attempts: totalSub,
        achievements_unlocked: achievements.length,
        achievements_total: allAchievementsCount ? allAchievementsCount.count : 5
      },
      categories,
      recent_submissions: recentSubmissions,
      achievements,
      recommended
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    return res.status(500).json({ error: "Failed to load dashboard statistics." });
  }
});

module.exports = router;
