import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useHistory, useLocation } from "react-router-dom";
import { apiMiniCtfs } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Trophy, Clock, CheckCircle, ExternalLink, Lightbulb,
  Flag, ArrowLeft, Play, SkipForward
} from "lucide-react";

// Lightweight Celebration Canvas Particle Effect
const CelebrationCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#00f0ff", "#00ff9d", "#ffb703", "#ff2a5f", "#ffffff"];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008,
        gravity: 0.25
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (particles.some(p => p.alpha > 0)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99999
      }}
    />
  );
};

const MiniCtfPlayer = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { user, showToast } = useAuth();

  const [miniCtf, setMiniCtf] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [userAttempt, setUserAttempt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  // Challenge execution state
  const [flagInput, setFlagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showHintIndex, setShowHintIndex] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Final Results state
  const [resultsData, setResultsData] = useState(null);
  const [viewMode, setViewMode] = useState("player"); // 'player' or 'results'

  const timerRef = useRef(null);

  useEffect(() => {
    fetchMiniCtf();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const queryParams = new URLSearchParams(location.search);
  const requestedChallengeId = queryParams.get("challengeId") || queryParams.get("id");

  // Keep active step synced if URL challengeId param is supplied
  useEffect(() => {
    if (challenges.length > 0 && requestedChallengeId) {
      const idx = challenges.findIndex(c => c.id === Number(requestedChallengeId));
      if (idx !== -1) {
        setActiveStepIndex(idx);
      }
    }
  }, [location.search, challenges, requestedChallengeId]);

  const fetchMiniCtf = async () => {
    setLoading(true);
    try {
      const res = await apiMiniCtfs.get(id);
      setMiniCtf(res.data.mini_ctf);
      const chList = res.data.challenges || [];
      setChallenges(chList);
      setUserAttempt(res.data.user_attempt);

      const initElapsed = res.data.elapsed_seconds || 0;
      setElapsedSeconds(initElapsed);

      if (res.data.mini_ctf.time_mode === "time_limited") {
        const rem = res.data.remaining_seconds !== null && res.data.remaining_seconds !== undefined
          ? res.data.remaining_seconds
          : (res.data.mini_ctf.time_limit_minutes || 30) * 60;
        setRemainingSeconds(rem);
      }

      if (res.data.is_expired) {
        setIsExpired(true);
        fetchResults();
      } else if (res.data.user_attempt && res.data.user_attempt.status === "In_Progress") {
        startLiveTimer(res.data.mini_ctf.time_mode);
      }

      // If attempt is completed or expired, fetch final results payload directly
      if (res.data.user_attempt && (res.data.user_attempt.status === "Completed" || res.data.user_attempt.status === "Expired")) {
        fetchResults();
      } else {
        // If a specific challengeId was passed in URL, jump to it, else first non-completed step
        const urlParams = new URLSearchParams(window.location.search);
        const qCid = urlParams.get("challengeId") || urlParams.get("id");
        if (qCid) {
          const matchIdx = chList.findIndex(c => c.id === Number(qCid));
          if (matchIdx !== -1) {
            setActiveStepIndex(matchIdx);
          } else {
            const firstActive = chList.findIndex(c => c.step_status !== "Completed");
            if (firstActive !== -1) setActiveStepIndex(firstActive);
          }
        } else {
          const firstActive = chList.findIndex(c => c.step_status !== "Completed");
          if (firstActive !== -1) {
            setActiveStepIndex(firstActive);
          }
        }
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await apiMiniCtfs.getResults(id);
      setResultsData(res.data);
      setViewMode("results");
    } catch (err) {
      console.error("Results fetch error:", err);
    }
  };

  const handleTimeExpired = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsExpired(true);
    showToast("⏰ Time's up! Your Mini CTF session has ended.", "warning");
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4000);
    await fetchResults();
  };

  const startLiveTimer = (mode) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (mode === "time_limited") {
        setRemainingSeconds((prev) => {
          if (prev === null || prev <= 1) {
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
  };

  const handleStartAttempt = async () => {
    if (!user) {
      showToast("Please log in to start this Mini CTF.", "error");
      history.push("/login");
      return;
    }
    try {
      const res = await apiMiniCtfs.start(id);
      setUserAttempt(res.data.attempt);
      startLiveTimer(miniCtf.time_mode);
      showToast("Mini CTF started! Timer is now running.", "success");

      // Notify step start for first challenge
      if (challenges.length > 0 && activeStepIndex < challenges.length) {
        apiMiniCtfs.updateStep(id, challenges[activeStepIndex].id, "start").catch(() => {});
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleSkipChallenge = async (ch) => {
    if (!userAttempt) {
      await handleStartAttempt();
    }
    try {
      await apiMiniCtfs.updateStep(id, ch.id, "skip");
      
      // Update local step status to Skipped
      const updatedChs = [...challenges];
      updatedChs[activeStepIndex].step_status = "Skipped";
      setChallenges(updatedChs);
      
      showToast(`Skipped '${ch.title}'. You can return to solve it anytime!`, "info");

      // Advance to next challenge step if available
      if (activeStepIndex < challenges.length - 1) {
        const nextIdx = activeStepIndex + 1;
        setActiveStepIndex(nextIdx);
        await apiMiniCtfs.updateStep(id, challenges[nextIdx].id, "start_step");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please log in to submit flags.", "error");
      return;
    }
    if (!flagInput.trim()) return;

    const currentChallenge = challenges[activeStepIndex];
    if (!currentChallenge) return;

    if (!userAttempt) {
      await handleStartAttempt();
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiMiniCtfs.submitFlag(id, currentChallenge.id, flagInput);
      const data = res.data;

      if (data.is_correct) {
        showToast(data.message, "success");
        setFeedback({ type: "success", text: data.message });

        // Update local step state
        const updatedChallenges = [...challenges];
        updatedChallenges[activeStepIndex].solved = true;
        updatedChallenges[activeStepIndex].step_status = "Completed";
        updatedChallenges[activeStepIndex].formatted_duration = data.formatted_challenge_duration || "00m 05s";
        setChallenges(updatedChallenges);
        setFlagInput("");

        // Check if Mini CTF completed
        if (data.mini_ctf_completed) {
          if (timerRef.current) clearInterval(timerRef.current);
          setUserAttempt((prev) => ({
            ...prev,
            status: "Completed",
            total_time_seconds: data.total_time_seconds,
            formatted_time: data.formatted_time
          }));

          // Trigger celebration particle animation!
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 5000);

          fetchResults();
        } else {
          // Advance to next unsolved step if available
          if (activeStepIndex < challenges.length - 1) {
            const nextIdx = activeStepIndex + 1;
            setActiveStepIndex(nextIdx);
            apiMiniCtfs.updateStep(id, challenges[nextIdx].id, "start_step");
          }
        }
      } else {
        showToast(data.message, "error");
        setFeedback({ type: "error", text: data.message });
      }
    } catch (err) {
      showToast(err.message, "error");
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimerDisplay = (totalSec) => {
    if (!totalSec || totalSec < 0) return "00:00:00";
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return [
        h.toString().padStart(2, "0"),
        m.toString().padStart(2, "0"),
        s.toString().padStart(2, "0")
      ].join(":");
    }
    return [
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0")
    ].join(":");
  };

  if (loading || !miniCtf) {
    return (
      <div className="appPage">
        <div className="container" style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: "#00f0ff" }}>Initializing Mini CTF Arena...</p>
        </div>
      </div>
    );
  }

  const currentChallenge = challenges[activeStepIndex];
  const isCompleted = userAttempt && userAttempt.status === "Completed";
  const playerOrigin = window.location.origin;
  const targetEnvUrl = currentChallenge && currentChallenge.url
    ? (currentChallenge.url.startsWith("http://") || currentChallenge.url.startsWith("https://")
        ? `${currentChallenge.url}${currentChallenge.url.includes("?") ? "&" : "?"}challengeId=${currentChallenge.id}&miniCtfId=${miniCtf.id}`
        : (currentChallenge.url.includes("?") 
            ? (currentChallenge.url.includes("/")
                ? `${playerOrigin}/challenges-env/${currentChallenge.url}&challengeId=${currentChallenge.id}&miniCtfId=${miniCtf.id}`
                : `${playerOrigin}/challenges-env/${currentChallenge.url.replace("?", "/index.html?")}&challengeId=${currentChallenge.id}&miniCtfId=${miniCtf.id}`)
            : `${playerOrigin}/challenges-env/${currentChallenge.url}/index.html?challengeId=${currentChallenge.id}&miniCtfId=${miniCtf.id}`))
    : null;

  return (
    <div className="appPage">
      {showCelebration && <CelebrationCanvas />}

      <div className="container">
        {/* TOP BAR & NAVIGATION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link to="/" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <ArrowLeft size={16} /> Back to Home Page
          </Link>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className={`badge difficulty-${miniCtf.difficulty}`}>{miniCtf.difficulty}</span>
            <span className="badge" style={{ background: "rgba(0,240,255,0.1)", color: "#00f0ff" }}>{miniCtf.category}</span>
            {isCompleted && (
              <button className="btn btn-primary btn-sm" onClick={() => setViewMode(viewMode === "results" ? "player" : "results")}>
                {viewMode === "results" ? "View Arena Player" : "View Final Results Summary"}
              </button>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* VIEW MODE 1: FINAL RESULTS PAGE SUMMARY    */}
        {/* ========================================== */}
        {viewMode === "results" && resultsData ? (
          <div>
            {/* HERO RESULTS BANNER */}
            <div
              className="glass-panel"
              style={{
                padding: "2.5rem 2rem",
                textAlign: "center",
                marginBottom: "2rem",
                borderTop: resultsData.attempt.status === "Expired" ? "4px solid #ff2a5f" : "4px solid #00ff9d"
              }}
            >
              <Trophy
                size={64}
                color={resultsData.attempt.status === "Expired" ? "#ff2a5f" : "#ffb703"}
                style={{ filter: "drop-shadow(0 0 20px rgba(255,183,3,0.5))", marginBottom: "1rem" }}
              />
              <h1 style={{ fontSize: "2.25rem", fontWeight: "900", color: "#fff", marginBottom: "0.5rem" }}>
                {resultsData.attempt.status === "Expired" ? "⏰ Time's Up!" : "🎉 Mini CTF Completed!"}
              </h1>
              <p
                style={{
                  fontSize: "1.15rem",
                  color: resultsData.attempt.status === "Expired" ? "#ff2a5f" : "#00ff9d",
                  fontWeight: "700",
                  marginBottom: "1rem"
                }}
              >
                {resultsData.metrics.congratulations_message}
              </p>
              <p style={{ color: "#cbd5e1", fontSize: "0.95rem", maxWidth: "620px", margin: "0 auto" }}>
                Summary for <strong>{resultsData.mini_ctf.title}</strong>: You completed <strong>{resultsData.metrics.completed_count}</strong> out of <strong>{resultsData.metrics.total_challenges}</strong> challenges.
              </p>
            </div>

            {/* METRICS SUMMARY STAT CARDS */}
            <div className="stats-grid" style={{ marginBottom: "2rem" }}>
              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Total Time</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#00f0ff", fontFamily: "'Fira Code', monospace" }}>
                  {resultsData.attempt.formatted_total_time}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Time Limit</div>
                <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "#e2e8f0" }}>
                  {resultsData.mini_ctf.time_limit_display}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Completed</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#00ff9d" }}>
                  {resultsData.metrics.completed_count} / {resultsData.metrics.total_challenges}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Skipped</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffb703" }}>
                  {resultsData.metrics.skipped_count}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Not Attempted</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#94a3b8" }}>
                  {resultsData.metrics.not_attempted_count || 0}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Score</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffb703", fontFamily: "'Fira Code', monospace" }}>
                  {resultsData.metrics.total_score} PTS
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Completion Rate</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#00f0ff" }}>
                  {resultsData.metrics.completion_rate}%
                </div>
              </div>
            </div>

            {/* CHALLENGE-BY-CHALLENGE BREAKDOWN TABLE */}
            <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2.5rem" }}>
              <h3 style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
                Challenge Performance Breakdown
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table className="xctf-table">
                  <thead>
                    <tr>
                      <th>Seq</th>
                      <th>Challenge</th>
                      <th>Category</th>
                      <th>Points</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Completion Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsData.breakdown.map((row) => (
                      <tr key={row.challenge_id}>
                        <td style={{ color: "#94a3b8", fontFamily: "'Fira Code', monospace" }}>#{row.sequence_order}</td>
                        <td style={{ color: "#fff", fontWeight: 600 }}>{row.title}</td>
                        <td style={{ color: "#00f0ff" }}>{row.category}</td>
                        <td style={{ color: "#ffb703", fontFamily: "'Fira Code', monospace" }}>{row.points} PTS</td>
                        <td>
                          {row.status === "Completed" ? (
                            <span className="badge" style={{ background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>
                              ✅ Completed
                            </span>
                          ) : row.status === "Skipped" ? (
                            <span className="badge" style={{ background: "rgba(255,183,3,0.15)", color: "#ffb703" }}>
                              ⏭️ Skipped
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                              ❌ Not Attempted
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "'Fira Code', monospace", color: row.status === "Completed" ? "#00ff9d" : "#94a3b8" }}>
                          {row.formatted_duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: "3rem" }}>
              <button className="btn btn-secondary" onClick={() => setViewMode("player")}>
                Return to Arena Player
              </button>
              <Link to="/" className="btn btn-primary">
                Return to Home Page
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================== */
          /* VIEW MODE 2: ARENA PLAYER & STEPPER        */
          /* ========================================== */
          <div>
            {/* HEADER PANEL & LIVE TIMER BAR */}
            <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem", borderLeft: miniCtf.time_mode === "time_limited" ? "4px solid #ffb703" : "4px solid #00f0ff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ color: "#00ff9d", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>🏆 MINI CTF SPEEDRUN ARENA</span>
                    <span className="badge" style={{ background: "rgba(0,240,255,0.1)", color: "#00f0ff" }}>
                      {miniCtf.time_mode === "time_limited" ? `⏱️ ${miniCtf.time_limit_minutes || 30} Min Time Limit` : "♾️ Normal Mode"}
                    </span>
                    {userAttempt && userAttempt.attempt_number > 1 && (
                      <span className="badge" style={{ background: "rgba(255,183,3,0.15)", color: "#ffb703" }}>
                        🎯 Attempt #{userAttempt.attempt_number}
                      </span>
                    )}
                  </div>
                  <h1 style={{ fontSize: "2.25rem", fontWeight: "900", color: "#fff", marginBottom: "0.5rem" }}>
                    {miniCtf.title}
                  </h1>
                  <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: "720px", margin: 0 }}>
                    {miniCtf.description}
                  </p>
                </div>

                {/* LIVE TIMER DISPLAY (NORMAL VS TIME-LIMITED COUNTDOWN) */}
                <div style={{ background: "rgba(0,0,0,0.6)", padding: "1.25rem 1.75rem", borderRadius: "12px", border: miniCtf.time_mode === "time_limited" ? "1px solid rgba(255, 183, 3, 0.4)" : "1px solid rgba(0, 240, 255, 0.3)", textAlign: "center", minWidth: "220px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                    <Clock size={14} color={miniCtf.time_mode === "time_limited" ? "#ffb703" : "#00f0ff"} />
                    {isCompleted ? "TOTAL TIME RECORDED" : isExpired ? "SESSION EXPIRED" : miniCtf.time_mode === "time_limited" ? "COUNTDOWN TIMER" : "SPEEDRUN TIMER"}
                  </div>
                  <div style={{ fontSize: "2.25rem", fontWeight: "900", fontFamily: "'Fira Code', monospace", color: isCompleted ? "#00ff9d" : isExpired ? "#ff2a5f" : miniCtf.time_mode === "time_limited" ? "#ffb703" : "#00f0ff", textShadow: "0 0 15px rgba(0,240,255,0.4)" }}>
                    {formatTimerDisplay(
                      isCompleted || isExpired
                        ? userAttempt.total_time_seconds
                        : miniCtf.time_mode === "time_limited"
                        ? (remainingSeconds !== null ? remainingSeconds : (miniCtf.time_limit_minutes || 30) * 60)
                        : elapsedSeconds
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: isCompleted ? "#00ff9d" : isExpired ? "#ff2a5f" : (userAttempt ? "#00ff9d" : "#ffb703"), marginTop: "0.25rem" }}>
                    {isCompleted ? "✓ SPEEDRUN COMPLETED" : isExpired ? "⏰ TIME EXPIRED" : (userAttempt ? "⚡ TIMER RUNNING" : "⏸ READY TO START")}
                  </div>
                </div>
              </div>

              {!userAttempt && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ fontSize: "0.95rem", color: "#e2e8f0" }}>
                    Click <strong>Start Mini CTF</strong> to begin your session. {miniCtf.time_mode === "time_limited" ? `The ${miniCtf.time_limit_minutes || 30}-minute countdown will start immediately.` : "The timer will begin counting your speedrun time."}
                  </div>
                  <button className="btn btn-primary" style={{ padding: "0.75rem 1.75rem", fontSize: "1rem" }} onClick={handleStartAttempt}>
                    <Play size={18} /> Start Mini CTF
                  </button>
                </div>
              )}
            </div>

            {/* ORDERED CHALLENGE PROGRESS STEPPER */}
            <div className="glass-panel" style={{ padding: "1rem 1.5rem", marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between" }}>
                <span>Challenge Sequence ({challenges.length} Total Targets)</span>
                <span>
                  {challenges.filter((c) => c.step_status === "Completed" || c.solved).length} of {challenges.length} Completed
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                {challenges.map((ch, idx) => {
                  const isCurrent = activeStepIndex === idx;
                  const isStepDone = ch.step_status === "Completed" || ch.solved;
                  const isSkipped = ch.step_status === "Skipped";

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveStepIndex(idx)}
                      style={{
                        flex: 1,
                        minWidth: "170px",
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        border: isCurrent ? "2px solid #00f0ff" : "1px solid rgba(255,255,255,0.1)",
                        background: isCurrent
                          ? "rgba(0, 240, 255, 0.15)"
                          : isStepDone
                          ? "rgba(0, 255, 157, 0.08)"
                          : isSkipped
                          ? "rgba(255, 183, 3, 0.08)"
                          : "rgba(0,0,0,0.3)",
                        color: "#fff",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", color: isCurrent ? "#00f0ff" : "#94a3b8" }}>
                          STEP {idx + 1}
                        </span>
                        {isStepDone ? (
                          <span style={{ fontSize: "0.75rem", color: "#00ff9d", fontWeight: "bold" }}>✅ Solved</span>
                        ) : isSkipped ? (
                          <span style={{ fontSize: "0.75rem", color: "#ffb703", fontWeight: "bold" }}>⏭️ Skipped</span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#ffb703" }}>{ch.points} PTS</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ch.title}
                      </div>
                      {ch.formatted_duration !== "—" && (
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                          ⏱ {ch.formatted_duration}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTIVE CHALLENGE EXECUTION CONTAINER */}
            {currentChallenge ? (
              <div className="glass-panel" style={{ padding: "2rem", marginBottom: "3rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={`badge difficulty-${currentChallenge.difficulty}`}>{currentChallenge.difficulty}</span>
                    <span className="badge" style={{ background: "rgba(0, 240, 255, 0.1)", color: "#00f0ff" }}>
                      {currentChallenge.category_name}
                    </span>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
                      {currentChallenge.points} PTS
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                      Challenge {activeStepIndex + 1} of {challenges.length}
                    </div>
                    {/* SKIP CHALLENGE BUTTON */}
                    {currentChallenge.step_status !== "Completed" && !currentChallenge.solved && (
                      <button
                        className="btn btn-warning btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                        title="Skip this challenge for now and return to it later"
                        onClick={() => handleSkipChallenge(currentChallenge)}
                      >
                        <SkipForward size={14} /> Skip Challenge
                      </button>
                    )}
                  </div>
                </div>

                <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#fff", marginBottom: "1rem" }}>
                  {currentChallenge.title}
                </h2>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "1.5rem" }}>
                  <h4 style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    Target Mission Objective
                  </h4>
                  <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    {currentChallenge.description}
                  </p>
                </div>

                {targetEnvUrl && (
                  <div style={{ marginBottom: "1.5rem", background: "rgba(0, 240, 255, 0.05)", padding: "1rem", borderRadius: "10px", border: "1px solid rgba(0, 240, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>Hosted Target Environment</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Launch target sandbox with back-navigation integration.</div>
                    </div>
                    <a href={targetEnvUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                      <ExternalLink size={16} /> Open Target Sandbox
                    </a>
                  </div>
                )}

                {/* HINTS ACCORDION */}
                {currentChallenge.hints && currentChallenge.hints.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                      Tactical Intelligence (Hints)
                    </h4>
                    {currentChallenge.hints.map((hint, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                          padding: "0.75rem 1rem",
                          marginBottom: "0.5rem",
                          cursor: "pointer"
                        }}
                        onClick={() => setShowHintIndex(showHintIndex === idx ? null : idx)}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.9rem", color: "#f1f5f9" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Lightbulb size={16} color="#ffb703" /> Hint #{idx + 1}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#00f0ff" }}>
                            {showHintIndex === idx ? "Hide" : "Decrypt Hint"}
                          </span>
                        </div>
                        {showHintIndex === idx && (
                          <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: "0.88rem" }}>
                            {hint}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* FLAG SUBMISSION FORM */}
                <div style={{ background: "rgba(13, 19, 31, 0.9)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(0, 240, 255, 0.2)" }}>
                  {currentChallenge.step_status === "Completed" || currentChallenge.solved ? (
                    <div style={{ textAlign: "center", color: "#00ff9d", padding: "1rem 0" }}>
                      <CheckCircle size={38} style={{ marginBottom: "0.5rem" }} />
                      <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>CHALLENGE SOLVED</h3>
                      <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        You have successfully captured this flag in the Mini CTF sequence!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitFlag}>
                      {currentChallenge.step_status === "Skipped" && (
                        <div style={{ background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.3)", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1rem", color: "#ffb703", fontSize: "0.85rem" }}>
                          ⏭️ You previously skipped this challenge. Enter the correct flag below to complete it!
                        </div>
                      )}

                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label style={{ color: "#00f0ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Flag size={16} /> Submit Flag for {currentChallenge.title}
                        </label>
                        <input
                          type="text"
                          placeholder="XCTF{flag_string}"
                          value={flagInput}
                          onChange={(e) => setFlagInput(e.target.value)}
                          style={{ fontFamily: "'Fira Code', monospace" }}
                        />
                      </div>

                      {feedback && (
                        <div
                          style={{
                            padding: "0.75rem",
                            borderRadius: "6px",
                            marginBottom: "1rem",
                            fontSize: "0.88rem",
                            background: feedback.type === "success" ? "rgba(0,255,157,0.15)" : "rgba(255,42,95,0.15)",
                            border: feedback.type === "success" ? "1px solid #00ff9d" : "1px solid #ff2a5f",
                            color: feedback.type === "success" ? "#00ff9d" : "#ff2a5f"
                          }}
                        >
                          {feedback.text}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                          {submitting ? "Verifying Flag..." : "Submit Flag"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-warning"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                          onClick={() => handleSkipChallenge(currentChallenge)}
                        >
                          <SkipForward size={16} /> Skip
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniCtfPlayer;
