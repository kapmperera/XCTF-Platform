const express = require("express");
const router = express.Router();
const { get, run, all } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// All admin routes require admin privileges
router.use(requireAdmin);

// 1. ADMIN DASHBOARD OVERVIEW STATS
router.get("/overview", async (req, res) => {
  try {
    const totalUsers = await get(`SELECT COUNT(*) as count FROM users WHERE role = 'participant'`);
    const activeUsers = await get(`SELECT COUNT(DISTINCT user_id) as count FROM submissions WHERE created_at >= datetime('now', '-24 hours')`);
    const totalChallenges = await get(`SELECT COUNT(*) as count FROM challenges`);
    const totalSubmissions = await get(`SELECT COUNT(*) as count FROM submissions`);
    const totalSolves = await get(`SELECT COUNT(*) as count FROM solves`);
    const competitionStatus = await all(`SELECT key, value FROM competition_config`);

    const configMap = {};
    competitionStatus.forEach(c => { configMap[c.key] = c.value; });

    // Recent submissions
    const recentSubmissions = await all(`
      SELECT sub.id, sub.submitted_flag, sub.is_correct, sub.created_at, u.username, ch.title as challenge_title
      FROM submissions sub
      JOIN users u ON sub.user_id = u.id
      JOIN challenges ch ON sub.challenge_id = ch.id
      ORDER BY sub.created_at DESC
      LIMIT 15
    `);

    return res.json({
      metrics: {
        total_users: totalUsers ? totalUsers.count : 0,
        active_users_24h: activeUsers ? activeUsers.count : 0,
        total_challenges: totalChallenges ? totalChallenges.count : 0,
        total_submissions: totalSubmissions ? totalSubmissions.count : 0,
        total_solves: totalSolves ? totalSolves.count : 0,
        solve_rate: totalSubmissions.count > 0 ? Math.round((totalSolves.count / totalSubmissions.count) * 100) : 0
      },
      config: configMap,
      recent_submissions: recentSubmissions
    });
  } catch (err) {
    console.error("Admin Overview Error:", err);
    return res.status(500).json({ error: "Failed to load admin metrics." });
  }
});

// 2. CHALLENGE CRUD
router.get("/challenges", async (req, res) => {
  try {
    const challenges = await all(`
      SELECT c.*, cat.name as category_name,
             (SELECT COUNT(*) FROM solves WHERE challenge_id = c.id) as solves_count
      FROM challenges c
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.id DESC
    `);
    return res.json({ challenges });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list challenges." });
  }
});

router.post("/challenges", async (req, res) => {
  try {
    const { title, category_id, difficulty, points, description, hints, flag, author, url, files } = req.body;

    if (!title || !flag || !description) {
      return res.status(400).json({ error: "Title, flag, and description are required fields." });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const hintsJson = typeof hints === "string" ? hints : JSON.stringify(hints || []);
    const filesJson = typeof files === "string" ? files : JSON.stringify(files || []);

    const result = await run(
      `INSERT INTO challenges (title, slug, category_id, difficulty, points, description, hints, flag, author, url, files, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [title, slug, category_id || 1, difficulty || "Easy", points || 100, description, hintsJson, flag, author || "Admin", url || "", filesJson]
    );

    const newCh = await get(`SELECT * FROM challenges WHERE id = ?`, [result.lastID]);
    return res.status(201).json({ message: "Challenge created successfully!", challenge: newCh });
  } catch (err) {
    console.error("Create Challenge Error:", err);
    return res.status(500).json({ error: "Failed to create challenge." });
  }
});

router.put("/challenges/:id", async (req, res) => {
  try {
    const chId = req.params.id;
    const { title, category_id, difficulty, points, description, hints, flag, author, url, files, is_active } = req.body;

    const existing = await get(`SELECT id FROM challenges WHERE id = ?`, [chId]);
    if (!existing) {
      return res.status(404).json({ error: "Challenge not found." });
    }

    const hintsJson = typeof hints === "string" ? hints : JSON.stringify(hints || []);
    const filesJson = typeof files === "string" ? files : JSON.stringify(files || []);

    await run(
      `UPDATE challenges 
       SET title = ?, category_id = ?, difficulty = ?, points = ?, description = ?, hints = ?, flag = ?, author = ?, url = ?, files = ?, is_active = ?
       WHERE id = ?`,
      [title, category_id, difficulty, points, description, hintsJson, flag, author, url, filesJson, is_active !== undefined ? is_active : 1, chId]
    );

    const updated = await get(`SELECT * FROM challenges WHERE id = ?`, [chId]);
    return res.json({ message: "Challenge updated successfully!", challenge: updated });
  } catch (err) {
    console.error("Update Challenge Error:", err);
    return res.status(500).json({ error: "Failed to update challenge." });
  }
});

router.delete("/challenges/:id", async (req, res) => {
  try {
    const chId = req.params.id;
    await run(`DELETE FROM challenges WHERE id = ?`, [chId]);
    return res.json({ message: "Challenge deleted successfully!" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete challenge." });
  }
});

// 3. USER MANAGEMENT
router.get("/users", async (req, res) => {
  try {
    const users = await all(`
      SELECT u.id, u.username, u.email, u.role, u.score, u.is_banned, u.created_at,
             (SELECT COUNT(*) FROM solves WHERE user_id = u.id) as solves_count
      FROM users u
      ORDER BY u.id ASC
    `);
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list users." });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "participant"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }
    await run(`UPDATE users SET role = ? WHERE id = ?`, [role, req.params.id]);
    return res.json({ message: "User role updated successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update user role." });
  }
});

router.put("/users/:id/ban", async (req, res) => {
  try {
    const { is_banned } = req.body;
    await run(`UPDATE users SET is_banned = ? WHERE id = ?`, [is_banned ? 1 : 0, req.params.id]);
    return res.json({ message: `User ${is_banned ? "banned" : "unbanned"} successfully.` });
  } catch (err) {
    return res.status(500).json({ error: "Failed to toggle ban status." });
  }
});

// 4. COMPETITION CONFIG MANAGEMENT
router.post("/config", async (req, res) => {
  try {
    const { title, status, start_time, end_time, rules } = req.body;
    if (title) await run(`INSERT OR REPLACE INTO competition_config (key, value) VALUES ('title', ?)`, [title]);
    if (status) await run(`INSERT OR REPLACE INTO competition_config (key, value) VALUES ('status', ?)`, [status]);
    if (start_time) await run(`INSERT OR REPLACE INTO competition_config (key, value) VALUES ('start_time', ?)`, [start_time]);
    if (end_time) await run(`INSERT OR REPLACE INTO competition_config (key, value) VALUES ('end_time', ?)`, [end_time]);
    if (rules) await run(`INSERT OR REPLACE INTO competition_config (key, value) VALUES ('rules', ?)`, [rules]);

    return res.json({ message: "Competition configuration saved successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update competition config." });
  }
});

// 5. CATEGORY MANAGEMENT
router.get("/categories", async (req, res) => {
  try {
    const categories = await all(`SELECT * FROM categories ORDER BY name ASC`);
    return res.json({ categories });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list categories." });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required." });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await run(`INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)`, [name, slug, description || "", icon || "code"]);
    return res.status(201).json({ message: "Category created!" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create category." });
  }
});

// ==========================================
// 6. MINI CTF ADMIN GOVERNANCE & MANAGEMENT
// ==========================================

// Helper to validate status transitions
function validateStatusTransition(currentStatus, newStatus, challengeCount) {
  const allowed = {
    "Draft": ["Published"],
    "Published": ["Active", "Draft"],
    "Active": ["Completed", "Published"],
    "Completed": ["Archived"],
    "Archived": ["Published"]
  };

  if (currentStatus === newStatus) return { valid: true };

  const validTargets = allowed[currentStatus] || [];
  if (!validTargets.includes(newStatus)) {
    return {
      valid: false,
      message: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Recommended lifecycle flow: Draft → Published → Active → Completed → Archived.`
    };
  }

  if (newStatus === "Published" && (!challengeCount || challengeCount < 1)) {
    return {
      valid: false,
      message: "Cannot publish a Mini CTF without at least one challenge attached in sequence."
    };
  }

  return { valid: true };
}

// GET /api/admin/mini-ctfs - List all Mini CTFs with audit history & details
router.get("/mini-ctfs", async (req, res) => {
  try {
    const miniCtfs = await all(`
      SELECT m.*, u.username as creator_username,
             (SELECT COUNT(*) FROM mini_ctf_challenges WHERE mini_ctf_id = m.id) as challenges_count,
             (SELECT COUNT(*) FROM mini_ctf_attempts WHERE mini_ctf_id = m.id AND status = 'Completed') as completed_count
      FROM mini_ctfs m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.id DESC
    `);

    for (const m of miniCtfs) {
      // Fetch ordered challenges
      m.challenges = await all(`
        SELECT c.id, c.title, c.difficulty, c.points, mc.sequence_order
        FROM mini_ctf_challenges mc
        JOIN challenges c ON mc.challenge_id = c.id
        WHERE mc.mini_ctf_id = ?
        ORDER BY mc.sequence_order ASC
      `, [m.id]);

      // Fetch private permissions
      const perms = await all(`
        SELECT p.user_id, u.username, u.email
        FROM mini_ctf_permissions p
        JOIN users u ON p.user_id = u.id
        WHERE p.mini_ctf_id = ?
      `, [m.id]);
      m.permitted_users = perms;

      // Fetch status transition audit logs
      m.status_logs = await all(`
        SELECT l.*, u.username as admin_username
        FROM mini_ctf_status_logs l
        LEFT JOIN users u ON l.changed_by = u.id
        WHERE l.mini_ctf_id = ?
        ORDER BY l.changed_at DESC
      `, [m.id]);
    }

    return res.json({ mini_ctfs: miniCtfs });
  } catch (err) {
    console.error("Admin GET mini-ctfs error:", err);
    return res.status(500).json({ error: "Failed to list Mini CTFs for admin." });
  }
});

// POST /api/admin/mini-ctfs - Create a new Mini CTF
router.post("/mini-ctfs", async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      category,
      status,
      visibility,
      time_mode,
      time_limit_minutes,
      scheduled_start_time,
      scheduled_end_time,
      challenge_ids,
      permitted_user_ids
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    if (!challenge_ids || !Array.isArray(challenge_ids) || challenge_ids.length === 0) {
      return res.status(400).json({ error: "At least one challenge must be selected for the Mini CTF." });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") + "-" + Date.now();
    const initialStatus = status || "Draft";
    const initialVisibility = visibility || "Public";
    const mode = time_mode === "time_limited" ? "time_limited" : "normal";
    const limitMins = time_limit_minutes ? Math.max(1, Number(time_limit_minutes)) : 30;

    // Validate status if creating directly as Published
    if (initialStatus === "Published" && challenge_ids.length === 0) {
      return res.status(400).json({ error: "Cannot set status to Published without challenges." });
    }

    const result = await run(`
      INSERT INTO mini_ctfs (title, slug, description, difficulty, category, status, visibility, time_mode, time_limit_minutes, scheduled_start_time, scheduled_end_time, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      slug,
      description,
      difficulty || "Easy",
      category || "Mixed",
      initialStatus,
      initialVisibility,
      mode,
      limitMins,
      scheduled_start_time || null,
      scheduled_end_time || null,
      req.user.id
    ]);

    const miniCtfId = result.lastID;

    // Insert challenge sequence mapping
    let order = 1;
    for (const chId of challenge_ids) {
      await run(`
        INSERT INTO mini_ctf_challenges (mini_ctf_id, challenge_id, sequence_order)
        VALUES (?, ?, ?)
      `, [miniCtfId, chId, order++]);
    }

    // Insert private permissions if provided
    if (initialVisibility === "Private" && Array.isArray(permitted_user_ids)) {
      for (const uId of permitted_user_ids) {
        await run(`
          INSERT OR IGNORE INTO mini_ctf_permissions (mini_ctf_id, user_id)
          VALUES (?, ?)
        `, [miniCtfId, uId]);
      }
    }

    // Audit log
    await run(`
      INSERT INTO mini_ctf_status_logs (mini_ctf_id, from_status, to_status, changed_by, reason)
      VALUES (?, NULL, ?, ?, ?)
    `, [miniCtfId, initialStatus, req.user.id, "Initial Mini CTF Creation"]);

    return res.status(201).json({
      message: "Mini CTF created successfully!",
      mini_ctf_id: miniCtfId
    });
  } catch (err) {
    console.error("Admin POST mini-ctfs error:", err);
    return res.status(500).json({ error: "Failed to create Mini CTF." });
  }
});

// PUT /api/admin/mini-ctfs/:id - Edit an existing Mini CTF
router.put("/mini-ctfs/:id", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const {
      title,
      description,
      difficulty,
      category,
      visibility,
      time_mode,
      time_limit_minutes,
      scheduled_start_time,
      scheduled_end_time,
      challenge_ids,
      permitted_user_ids
    } = req.body;

    const existing = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!existing) {
      return res.status(404).json({ error: "Mini CTF not found." });
    }

    const mode = time_mode !== undefined ? (time_mode === "time_limited" ? "time_limited" : "normal") : existing.time_mode;
    const limitMins = time_limit_minutes !== undefined ? Math.max(1, Number(time_limit_minutes)) : existing.time_limit_minutes;

    await run(`
      UPDATE mini_ctfs
      SET title = ?, description = ?, difficulty = ?, category = ?, visibility = ?,
          time_mode = ?, time_limit_minutes = ?,
          scheduled_start_time = ?, scheduled_end_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title !== undefined && title !== null ? title : existing.title,
      description !== undefined && description !== null ? description : existing.description,
      difficulty !== undefined && difficulty !== null ? difficulty : existing.difficulty,
      category !== undefined && category !== null ? category : existing.category,
      visibility !== undefined && visibility !== null ? visibility : existing.visibility,
      mode,
      limitMins,
      scheduled_start_time !== undefined ? scheduled_start_time : existing.scheduled_start_time,
      scheduled_end_time !== undefined ? scheduled_end_time : existing.scheduled_end_time,
      miniCtfId
    ]);

    // Update challenge sequence order if provided
    if (Array.isArray(challenge_ids)) {
      await run(`DELETE FROM mini_ctf_challenges WHERE mini_ctf_id = ?`, [miniCtfId]);
      let order = 1;
      for (const chId of challenge_ids) {
        await run(`
          INSERT INTO mini_ctf_challenges (mini_ctf_id, challenge_id, sequence_order)
          VALUES (?, ?, ?)
        `, [miniCtfId, chId, order++]);
      }
    }

    // Update permissions if provided
    if (Array.isArray(permitted_user_ids)) {
      await run(`DELETE FROM mini_ctf_permissions WHERE mini_ctf_id = ?`, [miniCtfId]);
      for (const uId of permitted_user_ids) {
        await run(`
          INSERT OR IGNORE INTO mini_ctf_permissions (mini_ctf_id, user_id)
          VALUES (?, ?)
        `, [miniCtfId, uId]);
      }
    }

    return res.json({ message: "Mini CTF updated successfully." });
  } catch (err) {
    console.error("Admin PUT mini-ctfs/:id error:", err);
    return res.status(500).json({ error: "Failed to update Mini CTF." });
  }
});

// PUT /api/admin/mini-ctfs/:id/status - Change Mini CTF status with lifecycle rules & audit
router.put("/mini-ctfs/:id/status", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Target status is required." });
    }

    const existing = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!existing) {
      return res.status(404).json({ error: "Mini CTF not found." });
    }

    const chCountRow = await get(`SELECT COUNT(*) as count FROM mini_ctf_challenges WHERE mini_ctf_id = ?`, [miniCtfId]);
    const challengeCount = chCountRow ? chCountRow.count : 0;

    // Validate lifecycle transition
    const validation = validateStatusTransition(existing.status, status, challengeCount);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    await run(`
      UPDATE mini_ctfs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [status, miniCtfId]);

    // Record audit log
    await run(`
      INSERT INTO mini_ctf_status_logs (mini_ctf_id, from_status, to_status, changed_by, reason)
      VALUES (?, ?, ?, ?, ?)
    `, [miniCtfId, existing.status, status, req.user.id, reason || "Admin Status Transition"]);

    return res.json({
      message: `Mini CTF status changed from '${existing.status}' to '${status}'.`,
      from_status: existing.status,
      to_status: status
    });
  } catch (err) {
    console.error("Admin PUT mini-ctfs/:id/status error:", err);
    return res.status(500).json({ error: "Failed to change Mini CTF status." });
  }
});

// DELETE /api/admin/mini-ctfs/:id - Delete a Mini CTF
router.delete("/mini-ctfs/:id", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    await run(`DELETE FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    return res.json({ message: "Mini CTF deleted successfully." });
  } catch (err) {
    console.error("Admin DELETE mini-ctfs/:id error:", err);
    return res.status(500).json({ error: "Failed to delete Mini CTF." });
  }
});

// POST /api/admin/mini-ctfs/:id/reset-attempts - Reset Mini CTF for new participant attempts (Preserves historical attempts & respects challenge reset option)
router.post("/mini-ctfs/:id/reset-attempts", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const { reason, target_status, challenge_reset_option } = req.body;

    const resetOption = ["all", "keep", "completed_only"].includes(challenge_reset_option) 
      ? challenge_reset_option 
      : "all";

    const miniCtf = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!miniCtf) {
      return res.status(404).json({ error: "Mini CTF not found." });
    }

    const previousStatus = miniCtf.status;
    const newStatus = target_status || (previousStatus === "Completed" ? "Published" : previousStatus);

    // Update Mini CTF status to new target status (e.g. Published or Active)
    await run(`UPDATE mini_ctfs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, miniCtfId]);

    // Mark current active attempts for this Mini CTF as non-active (preserving historical attempt data & scores)
    const affectedRes = await run(`
      UPDATE mini_ctf_attempts 
      SET is_active_attempt = 0 
      WHERE mini_ctf_id = ? AND (is_active_attempt = 1 OR is_active_attempt IS NULL)
    `, [miniCtfId]);

    const affectedCount = affectedRes ? affectedRes.changes : 0;

    const logReason = `${reason || "Admin Reset CTF for new participant attempt"} [Challenge Reset Mode: ${resetOption}]`;

    // Log status transition audit log if status changed
    if (previousStatus !== newStatus) {
      await run(`
        INSERT INTO mini_ctf_status_logs (mini_ctf_id, from_status, to_status, changed_by, reason)
        VALUES (?, ?, ?, ?, ?)
      `, [miniCtfId, previousStatus, newStatus, req.user.id, logReason]);
    }

    // Log administrative reset operation audit entry
    await run(`
      INSERT INTO admin_reset_logs (admin_id, reset_type, target_type, target_id, affected_user_id, reason)
      VALUES (?, 'Mini_CTF_Attempt_Reset', 'MiniCTF', ?, NULL, ?)
    `, [req.user.id, miniCtfId, logReason]);

    return res.json({
      message: `Mini CTF '${miniCtf.title}' has been reset for new participant attempts (Mode: ${resetOption}). Previous attempt history preserved.`,
      previous_status: previousStatus,
      new_status: newStatus,
      challenge_reset_option: resetOption,
      affected_attempts_count: affectedCount
    });
  } catch (err) {
    console.error("Admin POST mini-ctfs/:id/reset-attempts error:", err);
    return res.status(500).json({ error: "Failed to reset Mini CTF attempts." });
  }
});

// GET /api/admin/mini-ctfs/:id/preview - Admin Preview Mode
router.get("/mini-ctfs/:id/preview", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const miniCtf = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!miniCtf) return res.status(404).json({ error: "Mini CTF not found." });

    const challenges = await all(`
      SELECT c.id, c.title, c.slug, c.difficulty, c.points, c.description, c.hints, c.url, cat.name as category_name, mc.sequence_order
      FROM mini_ctf_challenges mc
      JOIN challenges c ON mc.challenge_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE mc.mini_ctf_id = ?
      ORDER BY mc.sequence_order ASC
    `, [miniCtfId]);

    return res.json({
      preview_mode: true,
      mini_ctf: miniCtf,
      challenges
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to preview Mini CTF." });
  }
});

// ==========================================
// 7. ADMIN RESET, REVIEW & PROGRESS GOVERNANCE
// ==========================================

// PUT /api/admin/challenges/:id/reset-review - Reset challenge to Review mode (is_active = 0)
router.put("/challenges/:id/reset-review", async (req, res) => {
  try {
    const chId = req.params.id;
    const { reason } = req.body;

    const existing = await get(`SELECT * FROM challenges WHERE id = ?`, [chId]);
    if (!existing) return res.status(404).json({ error: "Challenge not found." });

    await run(`UPDATE challenges SET is_active = 0 WHERE id = ?`, [chId]);

    // Record audit log
    await run(`
      INSERT INTO admin_reset_logs (admin_id, reset_type, target_type, target_id, reason)
      VALUES (?, 'Challenge_Review', 'Challenge', ?, ?)
    `, [req.user.id, chId, reason || "Challenge reset to Review mode for maintenance/testing."]);

    return res.json({
      message: `Challenge '${existing.title}' has been reset to Review state (hidden from participants, configuration preserved).`,
      challenge_id: chId,
      is_active: 0
    });
  } catch (err) {
    console.error("Admin reset challenge error:", err);
    return res.status(500).json({ error: "Failed to reset challenge to review state." });
  }
});

// PUT /api/admin/challenges/:id/activate - Re-activate reviewed challenge
router.put("/challenges/:id/activate", async (req, res) => {
  try {
    const chId = req.params.id;
    const { reason } = req.body;

    const existing = await get(`SELECT * FROM challenges WHERE id = ?`, [chId]);
    if (!existing) return res.status(404).json({ error: "Challenge not found." });

    await run(`UPDATE challenges SET is_active = 1 WHERE id = ?`, [chId]);

    await run(`
      INSERT INTO admin_reset_logs (admin_id, reset_type, target_type, target_id, reason)
      VALUES (?, 'Challenge_Activate', 'Challenge', ?, ?)
    `, [req.user.id, chId, reason || "Challenge review completed and re-activated."]);

    return res.json({
      message: `Challenge '${existing.title}' is now Active & Published to participants.`,
      challenge_id: chId,
      is_active: 1
    });
  } catch (err) {
    console.error("Admin activate challenge error:", err);
    return res.status(500).json({ error: "Failed to activate challenge." });
  }
});

// PUT /api/admin/mini-ctfs/:id/reset-review - Reset Mini CTF back to Draft/Review state
router.put("/mini-ctfs/:id/reset-review", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const { reason } = req.body;

    const existing = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!existing) return res.status(404).json({ error: "Mini CTF not found." });

    await run(`UPDATE mini_ctfs SET status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [miniCtfId]);

    await run(`
      INSERT INTO mini_ctf_status_logs (mini_ctf_id, from_status, to_status, changed_by, reason)
      VALUES (?, ?, 'Draft', ?, ?)
    `, [miniCtfId, existing.status, req.user.id, reason || "Admin Reset Mini CTF to Draft/Review for testing"]);

    await run(`
      INSERT INTO admin_reset_logs (admin_id, reset_type, target_type, target_id, reason)
      VALUES (?, 'MiniCTF_Reset_Draft', 'MiniCTF', ?, ?)
    `, [req.user.id, miniCtfId, reason || "Mini CTF reset to Draft/Review mode."]);

    return res.json({
      message: `Mini CTF '${existing.title}' reset back to Draft/Review. Challenge sequences and user attempts preserved.`,
      mini_ctf_id: miniCtfId,
      status: "Draft"
    });
  } catch (err) {
    console.error("Admin reset mini-ctf error:", err);
    return res.status(500).json({ error: "Failed to reset Mini CTF to review state." });
  }
});

// POST /api/admin/reset/participant-progress - Granular participant progress reset controls
router.post("/reset/participant-progress", async (req, res) => {
  try {
    const { scope, mini_ctf_id, challenge_id, user_id, reason } = req.body;

    if (!scope) {
      return res.status(400).json({ error: "Reset scope option is required." });
    }

    let affectedCount = 0;
    let targetType = "ParticipantProgress";
    let targetId = 0;
    let affectedUserId = user_id || null;

    if (scope === "single_user_mini_ctf") {
      if (!mini_ctf_id || !user_id) {
        return res.status(400).json({ error: "Mini CTF ID and User ID are required for single user reset." });
      }
      targetType = "MiniCTF";
      targetId = mini_ctf_id;
      const resCount = await run(`DELETE FROM mini_ctf_attempts WHERE mini_ctf_id = ? AND user_id = ?`, [mini_ctf_id, user_id]);
      affectedCount = resCount.changes;
    } else if (scope === "all_users_mini_ctf") {
      if (!mini_ctf_id) {
        return res.status(400).json({ error: "Mini CTF ID is required for all users reset." });
      }
      targetType = "MiniCTF";
      targetId = mini_ctf_id;
      const resCount = await run(`DELETE FROM mini_ctf_attempts WHERE mini_ctf_id = ?`, [mini_ctf_id]);
      affectedCount = resCount.changes;
    } else if (scope === "single_user_challenge") {
      if (!challenge_id || !user_id) {
        return res.status(400).json({ error: "Challenge ID and User ID are required for single user challenge reset." });
      }
      targetType = "Challenge";
      targetId = challenge_id;

      const solve = await get(`SELECT points_awarded FROM solves WHERE challenge_id = ? AND user_id = ?`, [challenge_id, user_id]);
      if (solve) {
        await run(`DELETE FROM solves WHERE challenge_id = ? AND user_id = ?`, [challenge_id, user_id]);
        await run(`UPDATE users SET score = MAX(0, score - ?) WHERE id = ?`, [solve.points_awarded, user_id]);
        affectedCount = 1;
      }
    } else if (scope === "all_users_challenge") {
      if (!challenge_id) {
        return res.status(400).json({ error: "Challenge ID is required for all users challenge reset." });
      }
      targetType = "Challenge";
      targetId = challenge_id;

      const solves = await all(`SELECT user_id, points_awarded FROM solves WHERE challenge_id = ?`, [challenge_id]);
      for (const s of solves) {
        await run(`UPDATE users SET score = MAX(0, score - ?) WHERE id = ?`, [s.points_awarded, s.user_id]);
      }
      const resCount = await run(`DELETE FROM solves WHERE challenge_id = ?`, [challenge_id]);
      affectedCount = resCount.changes;
    } else {
      return res.status(400).json({ error: "Invalid reset scope option." });
    }

    // Record audit log
    await run(`
      INSERT INTO admin_reset_logs (admin_id, reset_type, target_type, target_id, affected_user_id, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, `Reset_${scope}`, targetType, targetId, affectedUserId, reason || `Admin progress reset scope: ${scope}`]);

    return res.json({
      message: `Participant progress reset executed successfully. (${affectedCount} records affected)`,
      scope,
      affected_count: affectedCount
    });
  } catch (err) {
    console.error("Admin progress reset error:", err);
    return res.status(500).json({ error: "Failed to reset participant progress." });
  }
});

// GET /api/admin/reset-logs - View audit trail of reset operations
router.get("/reset-logs", async (req, res) => {
  try {
    const logs = await all(`
      SELECT l.*,
             u_admin.username as admin_username,
             u_aff.username as affected_username
      FROM admin_reset_logs l
      LEFT JOIN users u_admin ON l.admin_id = u_admin.id
      LEFT JOIN users u_aff ON l.affected_user_id = u_aff.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);

    // Attach target titles if possible
    for (const log of logs) {
      if (log.target_type === "Challenge") {
        const ch = await get(`SELECT title FROM challenges WHERE id = ?`, [log.target_id]);
        log.target_title = ch ? ch.title : `Challenge #${log.target_id}`;
      } else if (log.target_type === "MiniCTF") {
        const m = await get(`SELECT title FROM mini_ctfs WHERE id = ?`, [log.target_id]);
        log.target_title = m ? m.title : `Mini CTF #${log.target_id}`;
      } else {
        log.target_title = `Target #${log.target_id}`;
      }
    }

    return res.json({ reset_logs: logs });
  } catch (err) {
    console.error("Admin GET reset-logs error:", err);
    return res.status(500).json({ error: "Failed to fetch reset audit logs." });
  }
});

// POST /api/admin/challenges/:id/revert-to-inspect - Revert challenge status from Review Mission (Completed) back to Inspect Challenge (Incomplete)
router.post("/challenges/:id/revert-to-inspect", async (req, res) => {
  try {
    const chId = req.params.id;
    const { user_id, scope, reason } = req.body;

    const ch = await get(`SELECT * FROM challenges WHERE id = ?`, [chId]);
    if (!ch) {
      return res.status(404).json({ error: "Challenge not found." });
    }

    let affectedUserCount = 0;
    let targetUserId = user_id || req.user.id;

    if (scope === "all_users") {
      const solves = await all(`SELECT user_id, points_awarded FROM solves WHERE challenge_id = ?`, [chId]);
      for (const s of solves) {
        await run(`UPDATE users SET score = MAX(0, score - ?) WHERE id = ?`, [s.points_awarded, s.user_id]);
      }
      const resDel = await run(`DELETE FROM solves WHERE challenge_id = ?`, [chId]);
      affectedUserCount = resDel.changes;
      targetUserId = null;
    } else {
      const solve = await get(`SELECT points_awarded FROM solves WHERE challenge_id = ? AND user_id = ?`, [chId, targetUserId]);
      if (solve) {
        await run(`DELETE FROM solves WHERE challenge_id = ? AND user_id = ?`, [chId, targetUserId]);
        await run(`UPDATE users SET score = MAX(0, score - ?) WHERE id = ?`, [solve.points_awarded, targetUserId]);
        affectedUserCount = 1;
      }
    }

    // Insert mandatory status reversal audit log
    await run(`
      INSERT INTO admin_reset_logs (admin_id, reset_type, target_type, target_id, affected_user_id, reason)
      VALUES (?, 'Status_Reversal_Revert_To_Inspect', 'Challenge', ?, ?, ?)
    `, [
      req.user.id,
      chId,
      targetUserId,
      reason || `Reverted status from 'Review Mission (Completed)' to 'Inspect Challenge (Incomplete)' for challenge '${ch.title}'.`
    ]);

    return res.json({
      message: `Challenge '${ch.title}' status successfully reverted from 'Review Mission' to 'Inspect Challenge'.`,
      challenge_id: Number(chId),
      previous_status: "Review Mission",
      new_status: "Inspect Challenge",
      solved: false,
      affected_user_count: affectedUserCount
    });
  } catch (err) {
    console.error("Admin revert challenge status error:", err);
    return res.status(500).json({ error: "Failed to revert challenge status." });
  }
});

module.exports = router;



