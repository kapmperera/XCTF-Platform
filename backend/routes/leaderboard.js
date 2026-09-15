const express = require("express");
const router = express.Router();
const { all, get } = require("../db");

router.get("/", async (req, res) => {
  try {
    const { q, limit = 50, page = 1 } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let query = `
      SELECT 
        u.id, u.username, u.avatar, u.score, u.created_at,
        COUNT(s.id) as solves_count,
        MAX(s.created_at) as last_solve_time
      FROM users u
      LEFT JOIN solves s ON u.id = s.user_id
      WHERE u.role = 'participant' AND u.is_banned = 0
    `;

    const params = [];
    if (q) {
      query += ` AND u.username LIKE ?`;
      params.push(`%${q}%`);
    }

    query += `
      GROUP BY u.id
      ORDER BY u.score DESC, last_solve_time ASC, u.id ASC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);

    const rows = await all(query, params);

    const totalCountRow = await get(`SELECT COUNT(*) as count FROM users WHERE role = 'participant' AND is_banned = 0`);
    const totalSolvesRow = await get(`SELECT COUNT(*) as count FROM solves`);
    const totalPointsRow = await get(`SELECT SUM(points) as total FROM challenges WHERE is_active = 1`);

    const leaderboard = rows.map((user, idx) => ({
      rank: offset + idx + 1,
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      score: user.score,
      solves_count: user.solves_count,
      last_solve_time: user.last_solve_time || user.created_at
    }));

    // Score progression history for top 5 users (for timeline charts)
    const top5Users = leaderboard.slice(0, 5);
    const timeline = [];

    for (const u of top5Users) {
      const userSolves = await all(
        `SELECT points_awarded, created_at FROM solves WHERE user_id = ? ORDER BY created_at ASC`,
        [u.id]
      );
      let runningScore = 0;
      const history = userSolves.map(s => {
        runningScore += s.points_awarded;
        return {
          timestamp: s.created_at,
          score: runningScore
        };
      });

      timeline.push({
        username: u.username,
        history
      });
    }

    return res.json({
      leaderboard,
      total_participants: totalCountRow ? totalCountRow.count : 0,
      total_solves: totalSolvesRow ? totalSolvesRow.count : 0,
      total_available_points: totalPointsRow ? totalPointsRow.total || 0 : 0,
      timeline
    });
  } catch (err) {
    console.error("Leaderboard Error:", err);
    return res.status(500).json({ error: "Failed to load leaderboard." });
  }
});

module.exports = router;
