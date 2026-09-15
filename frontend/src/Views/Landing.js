import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiPlatform, apiMiniCtfs } from "../api/client";
import { Shield, Terminal, Trophy, Users, Flag, ArrowRight, Zap, ChevronRight, Play, Clock, CheckCircle } from "lucide-react";

const Landing = () => {
  const [info, setInfo] = useState(null);
  const [miniCtfs, setMiniCtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 59, seconds: 59 });

  useEffect(() => {
    fetchInfo();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchInfo = async () => {
    try {
      const res = await apiPlatform.getInfo();
      setInfo(res.data);
      const miniRes = await apiMiniCtfs.list();
      setMiniCtfs(miniRes.data.mini_ctfs || []);
    } catch (err) {
      console.error("Landing info error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appPage">
      <div className="container">
        {/* HERO SECTION */}
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", marginBottom: "3rem", background: "radial-gradient(circle at 50% 0%, rgba(0,240,255,0.12) 0%, rgba(13,18,28,0.85) 70%)" }}>
          <div className="badge" style={{ background: "rgba(0, 255, 157, 0.1)", color: "#00ff9d", border: "1px solid rgba(0,255,157,0.3)", marginBottom: "1.5rem" }}>
            ⚡ ACTIVE CTF WARFARE 2026
          </div>

          <h1 style={{ fontSize: "3.25rem", fontWeight: "900", color: "#fff", letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            NEXT-GEN CYBERSECURITY <br />
            <span style={{ color: "#00f0ff", textShadow: "0 0 20px rgba(0,240,255,0.5)" }}>COMMAND CENTER</span>
          </h1>

          <p style={{ color: "#94a3b8", fontSize: "1.15rem", maxWidth: "680px", margin: "0 auto 2.5rem", lineHeight: "1.7" }}>
            Test your offensive hacking skills, reverse-engineer proprietary software, crack cryptography, and climb the live leaderboards on XCTF's enterprise competition platform.
          </p>

          {/* Countdown Timer */}
          <div style={{ display: "inline-flex", gap: "1.5rem", background: "rgba(0,0,0,0.4)", padding: "1rem 2rem", borderRadius: "12px", border: "1px solid rgba(0,240,255,0.2)", marginBottom: "2.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#00f0ff" }}>
                {String(timeLeft.hours).padStart(2, '0')}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase" }}>Hours</div>
            </div>
            <div style={{ fontSize: "1.5rem", color: "#00f0ff" }}>:</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#00f0ff" }}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase" }}>Minutes</div>
            </div>
            <div style={{ fontSize: "1.5rem", color: "#00f0ff" }}>:</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#00f0ff" }}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase" }}>Seconds</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link to="/challenges" className="btn btn-primary" style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}>
              <Terminal size={18} /> Enter CTF Arena <ArrowRight size={18} />
            </Link>
            <Link to="/signup" className="btn btn-secondary" style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}>
              Create Account
            </Link>
          </div>
        </div>

        {/* METRICS & STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ background: "rgba(0,240,255,0.1)", padding: "1rem", borderRadius: "12px", color: "#00f0ff" }}>
              <Flag size={28} />
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
                {info ? info.metrics.challenges_count : 10}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Active Challenges</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ background: "rgba(0,255,157,0.1)", padding: "1rem", borderRadius: "12px", color: "#00ff9d" }}>
              <Users size={28} />
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
                {info ? info.metrics.participants_count : 4}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Registered Operatives</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ background: "rgba(157,78,221,0.1)", padding: "1rem", borderRadius: "12px", color: "#9d4edd" }}>
              <Zap size={28} />
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
                {info ? info.metrics.solves_count : 6}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Total Flag Submissions</div>
            </div>
          </div>
        </div>

        {/* MINI CTF SPEEDRUN COMPETITIONS */}
        {miniCtfs && miniCtfs.length > 0 && (
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "3rem", borderTop: "3px solid #00f0ff" }}>
            <div className="section-title" style={{ marginBottom: "1.5rem" }}>
              <div>
                <h2><Trophy color="#00f0ff" /> Mini CTF Speedruns</h2>
                <p className="subtitle">Timed sprint challenges. Complete target sequences for speedrun leaderboard rankings.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {miniCtfs.map((m) => {
                const isCompleted = m.user_attempt && m.user_attempt.status === "Completed";
                const isInProgress = m.user_attempt && m.user_attempt.status === "In_Progress";

                return (
                  <div
                    key={m.id}
                    className="glass-panel"
                    style={{
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      border: isCompleted ? "1px solid #00ff9d" : isInProgress ? "1px solid #00f0ff" : "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(13, 19, 31, 0.7)"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        <span className={`badge difficulty-${m.difficulty}`}>{m.difficulty}</span>
                        <span className="badge" style={{ background: "rgba(0, 240, 255, 0.1)", color: "#00f0ff" }}>
                          {m.category}
                        </span>
                        <span className={`badge status-${m.status}`}>{m.status}</span>
                        <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)", color: "#fff", marginLeft: "auto" }}>
                          {m.challenges_count} Targets • {m.total_points} PTS
                        </span>
                      </div>

                      <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", marginBottom: "0.5rem" }}>
                        {m.title}
                      </h3>

                      <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.5", marginBottom: "1.25rem" }}>
                        {m.description}
                      </p>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div style={{ background: "rgba(0, 255, 157, 0.1)", border: "1px solid #00ff9d", padding: "0.6rem 0.85rem", borderRadius: "6px", color: "#00ff9d", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <CheckCircle size={14} /> Completed
                          </span>
                          <span style={{ fontFamily: "'Fira Code', monospace", fontWeight: 700 }}>
                            {m.user_attempt.formatted_time}
                          </span>
                        </div>
                      ) : isInProgress ? (
                        <div style={{ background: "rgba(0, 240, 255, 0.1)", border: "1px solid #00f0ff", padding: "0.6rem 0.85rem", borderRadius: "6px", color: "#00f0ff", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Clock size={14} /> In Progress
                          </span>
                          <span>{m.user_attempt.challenges_completed} / {m.challenges_count} Solved</span>
                        </div>
                      ) : null}

                      <Link to={`/mini-ctf/${m.id}`} className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                        <Play size={16} /> {isCompleted ? "View Results & Replay" : isInProgress ? "Resume Speedrun" : "Start Mini CTF"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEADERBOARD HIGHLIGHTS */}
        {info && info.top3 && info.top3.length > 0 && (
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "3rem" }}>
            <div className="section-title">
              <h2><Trophy color="#ffb703" /> Top Podium Rankings</h2>
              <Link to="/leaderboard" className="subtitle" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                Full Leaderboard <ChevronRight size={16} />
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
              {info.top3.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: i === 0 ? "1px solid #ffb703" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem"
                  }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: "900", color: i === 0 ? "#ffb703" : i === 1 ? "#94a3b8" : "#b45309" }}>
                    #{i + 1}
                  </div>
                  <img src={u.avatar} alt={u.username} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #00f0ff" }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{u.username}</div>
                    <div style={{ fontSize: "0.85rem", color: "#00ff9d", fontFamily: "'Fira Code', monospace" }}>{u.score} PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES GRID */}
        <div style={{ marginBottom: "3rem" }}>
          <div className="section-title">
            <h2><Shield /> Cyber Warfare Domains</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {(info?.categories || []).map((cat, i) => (
              <div key={i} className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{cat.name}</h3>
                  <span className="badge" style={{ background: "rgba(0,240,255,0.1)", color: "#00f0ff" }}>
                    {cat.count} Challenges
                  </span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Test real-world offensive techniques across modern protocols, binary formats, and cryptography.
                </p>
                <Link to={`/challenges?category=${cat.slug}`} style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  Browse Domain <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
