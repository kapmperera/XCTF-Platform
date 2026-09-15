const express = require("express");
const router = express.Router();
const { run, get, all } = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");

// Helper to format seconds into mm:ss or hh:mm:ss
function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  }
  return [
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

function formatReadableTime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds.toString().padStart(2, '0')}s`;
}

function parseUtcTimestamp(dateStr) {
  if (!dateStr) return Date.now();
  const formatted = dateStr.includes("Z") || dateStr.includes("+") 
    ? dateStr 
    : dateStr.replace(" ", "T") + "Z";
  const ms = new Date(formatted).getTime();
  return isNaN(ms) ? Date.now() : ms;
}

// Automated schedule evaluator
async function evaluateSchedules() {
  try {
    const now = new Date().toISOString();
    const toActivate = await all(`
      SELECT id, status FROM mini_ctfs 
      WHERE (status = 'Scheduled' OR status = 'Published') 
      AND scheduled_start_time IS NOT NULL 
      AND scheduled_start_time <= ?
      AND (scheduled_end_time IS NULL OR scheduled_end_time > ?)
    `, [now, now]);

    for (const item of toActivate) {
      await run(`UPDATE mini_ctfs SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.id]);
      await run(`INSERT INTO mini_ctf_status_logs (mini_ctf_id, from_status, to_status, reason) VALUES (?, ?, 'Active', 'Automated schedule start threshold reached')`, [item.id, item.status]);
    }

    const toComplete = await all(`
      SELECT id, status FROM mini_ctfs 
      WHERE status = 'Active' 
      AND scheduled_end_time IS NOT NULL 
      AND scheduled_end_time <= ?
    `, [now]);

    for (const item of toComplete) {
      await run(`UPDATE mini_ctfs SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.id]);
      await run(`INSERT INTO mini_ctf_status_logs (mini_ctf_id, from_status, to_status, reason) VALUES (?, 'Active', 'Completed', 'Automated schedule end threshold reached')`, [item.id]);
    }
  } catch (err) {
    console.error("Schedule evaluation error:", err);
  }
}

// 1. GET /api/mini-ctfs - List Mini CTFs visible to current user
router.get("/", optionalAuth, async (req, res) => {
  try {
    await evaluateSchedules();
    const userId = req.user ? req.user.id : null;

    const sql = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM mini_ctf_challenges WHERE mini_ctf_id = m.id) as challenges_count,
        (SELECT COALESCE(SUM(c.points), 0) FROM mini_ctf_challenges mc JOIN challenges c ON mc.challenge_id = c.id WHERE mc.mini_ctf_id = m.id) as total_points,
        (SELECT COUNT(*) FROM mini_ctf_attempts WHERE mini_ctf_id = m.id AND status = 'Completed') as completed_users_count
      FROM mini_ctfs m
      WHERE m.status IN ('Published', 'Active', 'Completed')
      ORDER BY 
        CASE m.status 
          WHEN 'Active' THEN 1 
          WHEN 'Published' THEN 2 
          WHEN 'Completed' THEN 3 
          ELSE 4 
        END, 
        m.created_at DESC
    `;

    const miniCtfs = await all(sql);

    const result = [];
    for (const m of miniCtfs) {
      if (m.visibility === "Hidden" || m.status === "Draft" || m.status === "Archived") continue;
      if (m.visibility === "Private") {
        if (!userId) continue;
        const perm = await get(`SELECT id FROM mini_ctf_permissions WHERE mini_ctf_id = ? AND user_id = ?`, [m.id, userId]);
        if (!perm) continue;
      }

      let attempt = null;
      if (userId) {
        attempt = await get(`
          SELECT status, start_time, end_time, total_time_seconds, challenges_completed, total_challenges, attempt_number
          FROM mini_ctf_attempts 
          WHERE mini_ctf_id = ? AND user_id = ? AND is_active_attempt = 1
          ORDER BY id DESC LIMIT 1
        `, [m.id, userId]);

        if (attempt) {
          attempt.formatted_time = formatDuration(attempt.total_time_seconds);
        }
      }

      result.push({
        ...m,
        user_attempt: attempt
      });
    }

    return res.json({ mini_ctfs: result });
  } catch (err) {
    console.error("GET /api/mini-ctfs error:", err);
    return res.status(500).json({ error: "Failed to load Mini CTFs." });
  }
});

// 2. GET /api/mini-ctfs/:id - Fetch Mini CTF details, challenge sequence, & per-challenge step progress
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    await evaluateSchedules();
    const miniCtfId = req.params.id;
    const userId = req.user ? req.user.id : null;

    const miniCtf = await get(`
      SELECT m.*, u.username as creator_username
      FROM mini_ctfs m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [miniCtfId]);

    if (!miniCtf) {
      return res.status(404).json({ error: "Mini CTF not found." });
    }

    if (miniCtf.visibility === "Private" && userId) {
      const perm = await get(`SELECT id FROM mini_ctf_permissions WHERE mini_ctf_id = ? AND user_id = ?`, [miniCtfId, userId]);
      if (!perm) {
        return res.status(403).json({ error: "Access denied. Private Mini CTF permission required." });
      }
    }

    const challenges = await all(`
      SELECT c.id, c.title, c.slug, c.difficulty, c.points, c.description, c.hints, c.url, c.author,
             cat.name as category_name, mc.sequence_order
      FROM mini_ctf_challenges mc
      JOIN challenges c ON mc.challenge_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE mc.mini_ctf_id = ?
      ORDER BY mc.sequence_order ASC
    `, [miniCtfId]);

    let attempt = null;
    let elapsed_seconds = 0;
    let remaining_seconds = null;
    let is_expired = false;

    const timeLimitMins = miniCtf.time_limit_minutes || 30;
    const timeLimitSecs = timeLimitMins * 60;

    if (userId) {
      attempt = await get(`
        SELECT * FROM mini_ctf_attempts
        WHERE mini_ctf_id = ? AND user_id = ? AND is_active_attempt = 1
        ORDER BY id DESC LIMIT 1
      `, [miniCtfId, userId]);

      if (attempt) {
        let currentElapsed = 0;
        if (attempt.start_time) {
          const startTimeMs = parseUtcTimestamp(attempt.start_time);
          currentElapsed = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
        }

        if (miniCtf.time_mode === "time_limited") {
          const remCalc = Math.max(0, timeLimitSecs - currentElapsed);

          // Self-healing check: If attempt was marked 'Expired' (e.g. by previous timezone bug),
          // BUT calculated remaining time remCalc is actually > 0, un-expire the attempt.
          if (attempt.status === "Expired" && remCalc > 0) {
            attempt.status = "In_Progress";
            attempt.total_time_seconds = null;
            await run(`UPDATE mini_ctf_attempts SET status = 'In_Progress', end_time = NULL, total_time_seconds = NULL WHERE id = ?`, [attempt.id]);
          }

          if (attempt.status === "In_Progress" && remCalc <= 0) {
            is_expired = true;
            attempt.status = "Expired";
            attempt.total_time_seconds = timeLimitSecs;
            await run(`
              UPDATE mini_ctf_attempts 
              SET status = 'Expired', end_time = CURRENT_TIMESTAMP, total_time_seconds = ?
              WHERE id = ?
            `, [timeLimitSecs, attempt.id]);
          }

          elapsed_seconds = (attempt.status === 'Completed' || attempt.status === 'Expired')
            ? (attempt.total_time_seconds || timeLimitSecs)
            : currentElapsed;

          remaining_seconds = Math.max(0, timeLimitSecs - elapsed_seconds);
          if (attempt.status === "Expired") is_expired = true;
        } else {
          // Normal mode: reset remaining_seconds and clear expiration if mode changed to Normal
          remaining_seconds = null;
          is_expired = false;
          if (attempt.status === "Expired") {
            attempt.status = "In_Progress";
            await run(`UPDATE mini_ctf_attempts SET status = 'In_Progress' WHERE id = ?`, [attempt.id]);
          }
          elapsed_seconds = (attempt.status === 'Completed')
            ? (attempt.total_time_seconds || 0)
            : currentElapsed;
        }

        attempt.formatted_time = formatDuration(attempt.total_time_seconds || elapsed_seconds);
      } else {
        // Active attempt is NULL (after Admin Reset CTF or before user starts)
        elapsed_seconds = 0;
        is_expired = false;
        if (miniCtf.time_mode === "time_limited") {
          remaining_seconds = timeLimitSecs;
        }
      }
    }

    // Determine preview step statuses if active attempt is NULL
    let previewResetMode = "all";
    let prevAttemptForPreview = null;
    if (userId && !attempt) {
      prevAttemptForPreview = await get(`
        SELECT id FROM mini_ctf_attempts 
        WHERE mini_ctf_id = ? AND user_id = ?
        ORDER BY id DESC LIMIT 1
      `, [miniCtfId, userId]);

      if (prevAttemptForPreview) {
        const latestResetLog = await get(`
          SELECT reason FROM admin_reset_logs 
          WHERE target_type = 'MiniCTF' AND target_id = ? AND reset_type = 'Mini_CTF_Attempt_Reset'
          ORDER BY id DESC LIMIT 1
        `, [miniCtfId]);

        if (latestResetLog && latestResetLog.reason) {
          if (latestResetLog.reason.includes("[Challenge Reset Mode: keep]")) previewResetMode = "keep";
          else if (latestResetLog.reason.includes("[Challenge Reset Mode: completed_only]")) previewResetMode = "completed_only";
        }
      }
    }

    // Attach per-challenge step progress
    for (const ch of challenges) {
      try {
        ch.hints = JSON.parse(ch.hints || "[]");
      } catch (e) {
        ch.hints = [];
      }
      ch.solved = false;
      ch.step_status = "Not_Attempted";
      ch.duration_seconds = null;
      ch.formatted_duration = "—";

      if (userId) {
        const solve = await get(`SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?`, [userId, ch.id]);
        ch.solved = !!solve;

        if (attempt) {
          const stepProg = await get(`
            SELECT status, duration_seconds, start_time, completed_at
            FROM mini_ctf_challenge_progress
            WHERE attempt_id = ? AND challenge_id = ?
          `, [attempt.id, ch.id]);

          if (stepProg) {
            ch.step_status = stepProg.status;
            ch.duration_seconds = stepProg.duration_seconds;
            ch.formatted_duration = formatReadableTime(stepProg.duration_seconds);
          }
        } else if (prevAttemptForPreview) {
          const prevProg = await get(`
            SELECT status, duration_seconds FROM mini_ctf_challenge_progress
            WHERE attempt_id = ? AND challenge_id = ?
          `, [prevAttemptForPreview.id, ch.id]);

          if (prevProg) {
            if (previewResetMode === "keep") {
              ch.step_status = prevProg.status;
              ch.duration_seconds = prevProg.duration_seconds;
              ch.formatted_duration = formatReadableTime(prevProg.duration_seconds);
            } else if (previewResetMode === "completed_only" && prevProg.status !== "Completed") {
              ch.step_status = prevProg.status;
              ch.duration_seconds = prevProg.duration_seconds;
              ch.formatted_duration = formatReadableTime(prevProg.duration_seconds);
            }
          }
        }
      }
    }

    return res.json({
      mini_ctf: miniCtf,
      challenges,
      user_attempt: attempt,
      elapsed_seconds,
      remaining_seconds,
      is_expired,
      time_mode: miniCtf.time_mode || "normal",
      time_limit_minutes: timeLimitMins
    });
  } catch (err) {
    console.error("GET /api/mini-ctfs/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch Mini CTF details." });
  }
});

// 3. POST /api/mini-ctfs/:id/start - Explicitly start Mini CTF timer on user action
router.post("/:id/start", requireAuth, async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const userId = req.user.id;

    const miniCtf = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!miniCtf) {
      return res.status(404).json({ error: "Mini CTF not found." });
    }

    if (miniCtf.status === "Draft" || miniCtf.status === "Archived") {
      return res.status(400).json({ error: `Cannot start a Mini CTF with status '${miniCtf.status}'.` });
    }

    const countRow = await get(`SELECT COUNT(*) as count FROM mini_ctf_challenges WHERE mini_ctf_id = ?`, [miniCtfId]);
    const totalChallenges = countRow ? countRow.count : 0;

    let attempt = await get(`
      SELECT * FROM mini_ctf_attempts 
      WHERE mini_ctf_id = ? AND user_id = ? AND is_active_attempt = 1
      ORDER BY id DESC LIMIT 1
    `, [miniCtfId, userId]);

    if (!attempt) {
      const maxRow = await get(`
        SELECT MAX(attempt_number) as max_num FROM mini_ctf_attempts
        WHERE mini_ctf_id = ? AND user_id = ?
      `, [miniCtfId, userId]);
      const nextAttemptNum = (maxRow && maxRow.max_num ? maxRow.max_num : 0) + 1;

      const insRes = await run(`
        INSERT INTO mini_ctf_attempts (mini_ctf_id, user_id, attempt_number, is_active_attempt, start_time, total_challenges, status)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, 'In_Progress')
      `, [miniCtfId, userId, nextAttemptNum, totalChallenges]);

      attempt = await get(`SELECT * FROM mini_ctf_attempts WHERE id = ?`, [insRes.lastID]);

      if (nextAttemptNum > 1) {
        const prevAttempt = await get(`
          SELECT id FROM mini_ctf_attempts 
          WHERE mini_ctf_id = ? AND user_id = ? AND id != ?
          ORDER BY id DESC LIMIT 1
        `, [miniCtfId, userId, attempt.id]);

        if (prevAttempt) {
          const latestResetLog = await get(`
            SELECT reason FROM admin_reset_logs 
            WHERE target_type = 'MiniCTF' AND target_id = ? AND reset_type = 'Mini_CTF_Attempt_Reset'
            ORDER BY id DESC LIMIT 1
          `, [miniCtfId]);

          let resetMode = "all";
          if (latestResetLog && latestResetLog.reason) {
            if (latestResetLog.reason.includes("[Challenge Reset Mode: keep]")) resetMode = "keep";
            else if (latestResetLog.reason.includes("[Challenge Reset Mode: completed_only]")) resetMode = "completed_only";
          }

          if (resetMode === "keep") {
            const prevProgress = await all(`SELECT * FROM mini_ctf_challenge_progress WHERE attempt_id = ?`, [prevAttempt.id]);
            for (const p of prevProgress) {
              await run(`
                INSERT INTO mini_ctf_challenge_progress (attempt_id, mini_ctf_id, user_id, challenge_id, status, start_time, completed_at, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(attempt_id, challenge_id) DO NOTHING
              `, [attempt.id, miniCtfId, userId, p.challenge_id, p.status, p.start_time, p.completed_at, p.duration_seconds]);
            }
          } else if (resetMode === "completed_only") {
            const prevProgress = await all(`SELECT * FROM mini_ctf_challenge_progress WHERE attempt_id = ? AND status != 'Completed'`, [prevAttempt.id]);
            for (const p of prevProgress) {
              await run(`
                INSERT INTO mini_ctf_challenge_progress (attempt_id, mini_ctf_id, user_id, challenge_id, status, start_time, completed_at, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(attempt_id, challenge_id) DO NOTHING
              `, [attempt.id, miniCtfId, userId, p.challenge_id, p.status, p.start_time, p.completed_at, p.duration_seconds]);
            }
          }
        }
      }
    }

    // Initialize first challenge in sequence if present
    const firstCh = await get(`
      SELECT challenge_id FROM mini_ctf_challenges WHERE mini_ctf_id = ? ORDER BY sequence_order ASC LIMIT 1
    `, [miniCtfId]);

    if (firstCh) {
      await run(`
        INSERT INTO mini_ctf_challenge_progress (attempt_id, mini_ctf_id, user_id, challenge_id, status, start_time)
        VALUES (?, ?, ?, ?, 'In_Progress', CURRENT_TIMESTAMP)
        ON CONFLICT(attempt_id, challenge_id) DO NOTHING
      `, [attempt.id, miniCtfId, userId, firstCh.challenge_id]);
    }

    const currentElapsed = Math.max(0, Math.floor((Date.now() - parseUtcTimestamp(attempt.start_time)) / 1000));
    attempt.current_elapsed_seconds = currentElapsed;
    attempt.formatted_time = formatDuration(attempt.total_time_seconds || currentElapsed);

    return res.json({
      message: "Mini CTF timer started!",
      attempt
    });
  } catch (err) {
    console.error("POST /api/mini-ctfs/:id/start error:", err);
    return res.status(500).json({ error: "Failed to start Mini CTF timer." });
  }
});

// 4. POST /api/mini-ctfs/:id/step - Update per-challenge step action ('start_step' or 'skip_step')
router.post("/:id/step", requireAuth, async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const userId = req.user.id;
    const { challenge_id, action } = req.body;

    if (!challenge_id || !action) {
      return res.status(400).json({ error: "Challenge ID and action are required." });
    }

    let attempt = await get(`
      SELECT * FROM mini_ctf_attempts 
      WHERE mini_ctf_id = ? AND user_id = ? AND is_active_attempt = 1
      ORDER BY id DESC LIMIT 1
    `, [miniCtfId, userId]);

    if (!attempt) {
      const maxRow = await get(`
        SELECT MAX(attempt_number) as max_num FROM mini_ctf_attempts 
        WHERE mini_ctf_id = ? AND user_id = ?
      `, [miniCtfId, userId]);
      const nextAttemptNum = (maxRow && maxRow.max_num ? maxRow.max_num : 0) + 1;
      const countRow = await get(`SELECT COUNT(*) as count FROM mini_ctf_challenges WHERE mini_ctf_id = ?`, [miniCtfId]);

      const insRes = await run(`
        INSERT INTO mini_ctf_attempts (mini_ctf_id, user_id, attempt_number, is_active_attempt, start_time, total_challenges, status)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, 'In_Progress')
      `, [miniCtfId, userId, nextAttemptNum, countRow ? countRow.count : 0]);
      attempt = await get(`SELECT * FROM mini_ctf_attempts WHERE id = ?`, [insRes.lastID]);
    }

    if (action === "skip") {
      await run(`
        INSERT INTO mini_ctf_challenge_progress (attempt_id, mini_ctf_id, user_id, challenge_id, status, start_time)
        VALUES (?, ?, ?, ?, 'Skipped', CURRENT_TIMESTAMP)
        ON CONFLICT(attempt_id, challenge_id) DO UPDATE SET status = CASE WHEN status = 'Completed' THEN 'Completed' ELSE 'Skipped' END
      `, [attempt.id, miniCtfId, userId, challenge_id]);
    } else if (action === "start_step") {
      await run(`
        INSERT INTO mini_ctf_challenge_progress (attempt_id, mini_ctf_id, user_id, challenge_id, status, start_time)
        VALUES (?, ?, ?, ?, 'In_Progress', CURRENT_TIMESTAMP)
        ON CONFLICT(attempt_id, challenge_id) DO NOTHING
      `, [attempt.id, miniCtfId, userId, challenge_id]);
    }

    return res.json({
      message: `Step action '${action}' recorded.`,
      challenge_id,
      action
    });
  } catch (err) {
    console.error("POST /api/mini-ctfs/:id/step error:", err);
    return res.status(500).json({ error: "Failed to update challenge step." });
  }
});

// 5. POST /api/mini-ctfs/:id/submit-flag - Submit flag & track challenge duration / completion
router.post("/:id/submit-flag", requireAuth, async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const userId = req.user.id;
    const { challenge_id, flag } = req.body;

    if (!challenge_id || !flag) {
      return res.status(400).json({ error: "Challenge ID and flag are required." });
    }

    const miniCtf = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!miniCtf) return res.status(404).json({ error: "Mini CTF not found." });

    let attempt = await get(`
      SELECT * FROM mini_ctf_attempts 
      WHERE mini_ctf_id = ? AND user_id = ? AND is_active_attempt = 1
      ORDER BY id DESC LIMIT 1
    `, [miniCtfId, userId]);
    if (attempt) {
      if (attempt.status === "Expired") {
        return res.status(400).json({ error: "⏰ Time's up! Your Mini CTF session has ended.", is_expired: true });
      }
      if (miniCtf.time_mode === "time_limited" && attempt.status === "In_Progress") {
        const timeLimitSecs = (miniCtf.time_limit_minutes || 30) * 60;
        const elapsed = Math.floor((Date.now() - parseUtcTimestamp(attempt.start_time)) / 1000);
        if (elapsed >= timeLimitSecs) {
          await run(`UPDATE mini_ctf_attempts SET status = 'Expired', end_time = CURRENT_TIMESTAMP, total_time_seconds = ? WHERE id = ?`, [timeLimitSecs, attempt.id]);
          return res.status(400).json({ error: "⏰ Time's up! Your Mini CTF session has ended.", is_expired: true });
        }
      }
    }

    const mapping = await get(`SELECT * FROM mini_ctf_challenges WHERE mini_ctf_id = ? AND challenge_id = ?`, [miniCtfId, challenge_id]);
    if (!mapping) {
      return res.status(400).json({ error: "Challenge is not part of this Mini CTF." });
    }

    const challenge = await get(`SELECT * FROM challenges WHERE id = ?`, [challenge_id]);
    if (!challenge) {
      return res.status(404).json({ error: "Target challenge not found." });
    }

    const submittedClean = flag.trim();
    const isCorrect = (submittedClean === challenge.flag);

    if (!isCorrect) {
      return res.json({
        is_correct: false,
        message: "Incorrect flag. Review your solution and try again!"
      });
    }

    // Award global solve & user score if not solved previously
    const existingSolve = await get(`SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?`, [userId, challenge_id]);
    let pointsAwarded = 0;
    let isFirstBlood = false;

    if (!existingSolve) {
      pointsAwarded = challenge.points;
      const solveCount = await get(`SELECT COUNT(*) as count FROM solves WHERE challenge_id = ?`, [challenge_id]);
      isFirstBlood = (solveCount.count === 0);

      await run(`
        INSERT INTO solves (user_id, challenge_id, points_awarded, is_first_blood)
        VALUES (?, ?, ?, ?)
      `, [userId, challenge_id, pointsAwarded, isFirstBlood ? 1 : 0]);

      await run(`UPDATE users SET score = score + ? WHERE id = ?`, [pointsAwarded, userId]);

      await run(`
        INSERT INTO submissions (user_id, challenge_id, submitted_flag, is_correct, points_awarded)
        VALUES (?, ?, ?, 1, ?)
      `, [userId, challenge_id, submittedClean, pointsAwarded]);
    }

    if (!attempt) {
      const maxRow = await get(`
        SELECT MAX(attempt_number) as max_num FROM mini_ctf_attempts 
        WHERE mini_ctf_id = ? AND user_id = ?
      `, [miniCtfId, userId]);
      const nextAttemptNum = (maxRow && maxRow.max_num ? maxRow.max_num : 0) + 1;
      const countRow = await get(`SELECT COUNT(*) as count FROM mini_ctf_challenges WHERE mini_ctf_id = ?`, [miniCtfId]);

      const insRes = await run(`
        INSERT INTO mini_ctf_attempts (mini_ctf_id, user_id, attempt_number, is_active_attempt, start_time, total_challenges, status)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, 'In_Progress')
      `, [miniCtfId, userId, nextAttemptNum, countRow ? countRow.count : 0]);
      attempt = await get(`SELECT * FROM mini_ctf_attempts WHERE id = ?`, [insRes.lastID]);
    }

    // Record per-challenge completion progress and duration
    let stepProg = await get(`SELECT * FROM mini_ctf_challenge_progress WHERE attempt_id = ? AND challenge_id = ?`, [attempt.id, challenge_id]);
    const startTime = stepProg ? parseUtcTimestamp(stepProg.start_time) : parseUtcTimestamp(attempt.start_time);
    const durationSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));

    await run(`
      INSERT INTO mini_ctf_challenge_progress (attempt_id, mini_ctf_id, user_id, challenge_id, status, start_time, completed_at, duration_seconds)
      VALUES (?, ?, ?, ?, 'Completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(attempt_id, challenge_id) DO UPDATE SET
        status = 'Completed',
        completed_at = CURRENT_TIMESTAMP,
        duration_seconds = ?
    `, [attempt.id, miniCtfId, userId, challenge_id, durationSec, durationSec]);

    // Count solved challenges in this Mini CTF attempt
    const solvedInMiniCtf = await get(`
      SELECT COUNT(DISTINCT challenge_id) as count
      FROM mini_ctf_challenge_progress
      WHERE attempt_id = ? AND status = 'Completed'
    `, [attempt.id]);

    const completedCount = solvedInMiniCtf ? solvedInMiniCtf.count : 0;
    const totalInMiniCtf = attempt.total_challenges || 1;

    // Check if this is the last challenge in sequence OR all challenges solved
    const maxSeq = await get(`SELECT MAX(sequence_order) as max_seq FROM mini_ctf_challenges WHERE mini_ctf_id = ?`, [miniCtfId]);
    const isLastChallengeInSeq = (mapping.sequence_order === (maxSeq ? maxSeq.max_seq : totalInMiniCtf));

    let miniCtfCompleted = false;
    let totalTimeSeconds = attempt.total_time_seconds;

    if ((completedCount >= totalInMiniCtf || isLastChallengeInSeq) && attempt.status !== 'Completed') {
      miniCtfCompleted = true;
      const startTimeMs = parseUtcTimestamp(attempt.start_time);
      totalTimeSeconds = Math.max(1, Math.floor((Date.now() - startTimeMs) / 1000));

      await run(`
        UPDATE mini_ctf_attempts 
        SET status = 'Completed', end_time = CURRENT_TIMESTAMP, total_time_seconds = ?, challenges_completed = ?
        WHERE id = ?
      `, [totalTimeSeconds, completedCount, attempt.id]);
    } else {
      await run(`
        UPDATE mini_ctf_attempts SET challenges_completed = ? WHERE id = ?
      `, [completedCount, attempt.id]);
    }

    return res.json({
      is_correct: true,
      points_awarded: pointsAwarded,
      is_first_blood: isFirstBlood,
      mini_ctf_completed: miniCtfCompleted,
      challenges_completed: completedCount,
      total_challenges: totalInMiniCtf,
      total_time_seconds: totalTimeSeconds,
      formatted_time: formatDuration(totalTimeSeconds),
      challenge_duration_seconds: durationSec,
      formatted_challenge_duration: formatReadableTime(durationSec),
      message: miniCtfCompleted 
        ? `🏆 CONGRATULATIONS! Mini CTF completed in ${formatReadableTime(totalTimeSeconds)}!`
        : `🔥 Correct flag! Challenge ${completedCount} of ${totalInMiniCtf} completed.`
    });
  } catch (err) {
    console.error("POST /api/mini-ctfs/:id/submit-flag error:", err);
    return res.status(500).json({ error: "Failed to process flag submission." });
  }
});

// 6. GET /api/mini-ctfs/:id/results - Detailed final results page payload
router.get("/:id/results", requireAuth, async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const userId = req.user.id;

    const miniCtf = await get(`SELECT * FROM mini_ctfs WHERE id = ?`, [miniCtfId]);
    if (!miniCtf) return res.status(404).json({ error: "Mini CTF not found." });

    const attempt = await get(`
      SELECT * FROM mini_ctf_attempts 
      WHERE mini_ctf_id = ? AND user_id = ? AND is_active_attempt = 1
      ORDER BY id DESC LIMIT 1
    `, [miniCtfId, userId]);
    if (!attempt) return res.status(404).json({ error: "No attempt recorded for this Mini CTF." });

    const challenges = await all(`
      SELECT c.id, c.title, c.slug, c.points, c.difficulty, cat.name as category_name, mc.sequence_order
      FROM mini_ctf_challenges mc
      JOIN challenges c ON mc.challenge_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE mc.mini_ctf_id = ?
      ORDER BY mc.sequence_order ASC
    `, [miniCtfId]);

    const progressRows = await all(`
      SELECT challenge_id, status, duration_seconds, start_time, completed_at
      FROM mini_ctf_challenge_progress
      WHERE attempt_id = ?
    `, [attempt.id]);

    const progressMap = {};
    progressRows.forEach(p => { progressMap[p.challenge_id] = p; });

    let completedCount = 0;
    let skippedCount = 0;
    let totalScoreEarned = 0;

    const breakdown = challenges.map(ch => {
      const p = progressMap[ch.id];
      let status = "Not_Attempted";
      let durationSec = null;

      if (p) {
        status = p.status;
        durationSec = p.duration_seconds;
      }

      if (status === "Completed") {
        completedCount++;
        totalScoreEarned += ch.points;
      } else if (status === "Skipped") {
        skippedCount++;
      } else {
        status = "Not_Attempted";
      }

      return {
        challenge_id: ch.id,
        title: ch.title,
        difficulty: ch.difficulty,
        category: ch.category_name || "General",
        sequence_order: ch.sequence_order,
        points: ch.points,
        status,
        duration_seconds: durationSec,
        formatted_duration: formatReadableTime(durationSec)
      };
    });

    const totalChallenges = challenges.length || 1;
    let notAttemptedCount = totalChallenges - (completedCount + skippedCount);
    if (notAttemptedCount < 0) notAttemptedCount = 0;

    const completionRate = Math.round((completedCount / totalChallenges) * 100);

    let congratulations = "Good Attempt! Keep practicing to master all challenges.";
    if (attempt.status === "Expired") {
      congratulations = "⏰ Time's Up! Your Mini CTF session has ended. Here is your final performance summary.";
    } else if (completionRate === 100) {
      congratulations = "🏆 Outstanding Speedrun! You completed 100% of the challenges!";
    } else if (completionRate >= 75) {
      congratulations = "🎉 Great Job! Excellent performance across the Mini CTF sequence!";
    } else if (completionRate >= 50) {
      congratulations = "👍 Solid Effort! You completed over half the challenges.";
    }

    return res.json({
      mini_ctf: {
        id: miniCtf.id,
        title: miniCtf.title,
        description: miniCtf.description,
        difficulty: miniCtf.difficulty,
        category: miniCtf.category,
        time_mode: miniCtf.time_mode || "normal",
        time_limit_minutes: miniCtf.time_limit_minutes || 30,
        time_limit_display: miniCtf.time_mode === "time_limited" ? `${miniCtf.time_limit_minutes || 30} Minutes` : "Unlimited (Normal Mode)"
      },
      attempt: {
        id: attempt.id,
        status: attempt.status,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
        total_time_seconds: attempt.total_time_seconds,
        formatted_total_time: formatReadableTime(attempt.total_time_seconds)
      },
      metrics: {
        completed_count: completedCount,
        skipped_count: skippedCount,
        not_attempted_count: notAttemptedCount,
        total_challenges: totalChallenges,
        total_score: totalScoreEarned,
        completion_rate: completionRate,
        congratulations_message: congratulations
      },
      breakdown
    });
  } catch (err) {
    console.error("GET /api/mini-ctfs/:id/results error:", err);
    return res.status(500).json({ error: "Failed to load Mini CTF results." });
  }
});

// 7. GET /api/mini-ctfs/:id/leaderboard - Speedrun leaderboard for completed attempts
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const miniCtfId = req.params.id;
    const leaderboard = await all(`
      SELECT a.total_time_seconds, a.start_time, a.end_time, u.id as user_id, u.username, u.avatar
      FROM mini_ctf_attempts a
      JOIN users u ON a.user_id = u.id
      WHERE a.mini_ctf_id = ? AND a.status = 'Completed'
      ORDER BY a.total_time_seconds ASC, a.end_time ASC
      LIMIT 50
    `, [miniCtfId]);

    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
      entry.formatted_time = formatDuration(entry.total_time_seconds);
    });

    return res.json({ leaderboard });
  } catch (err) {
    console.error("GET /api/mini-ctfs/:id/leaderboard error:", err);
    return res.status(500).json({ error: "Failed to load Mini CTF leaderboard." });
  }
});

module.exports = router;

