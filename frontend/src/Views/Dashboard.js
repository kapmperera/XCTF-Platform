import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiDashboard } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Trophy, Award, CheckCircle, Crosshair, Activity, Clock, Flag } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await apiDashboard.getStats();
      setData(res.data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="appPage">
        <div className="container" style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
          Synchronizing operative command telemetry...
        </div>
      </div>
    );
  }

  const { profile, stats, categories, recent_submissions, achievements, recommended } = data;

  return (
    <div className="appPage">
      <div className="container">
        {/* TOP PROFILE BANNER */}
        <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <img
                src={profile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                alt={profile.username}
                style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid #00f0ff" }}
              />
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#fff" }}>{profile.username}</h1>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Operative Email: {profile.email}</p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <span className="badge" style={{ background: "rgba(0,240,255,0.1)", color: "#00f0ff" }}>
                    RANK #{profile.rank}
                  </span>
                  <span className="badge" style={{ background: "rgba(0,255,157,0.1)", color: "#00ff9d" }}>
                    OPERATIVE STATUS: ACTIVE
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase" }}>Total Score</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", fontFamily: "'Fira Code', monospace", color: "#00f0ff" }}>
                {profile.score} <span style={{ fontSize: "1rem", color: "#94a3b8" }}>PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", color: "#00ff9d" }}>
              <CheckCircle size={24} />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>SOLVED</span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
              {stats.challenges_solved} <span style={{ fontSize: "1rem", color: "#94a3b8" }}>/ {stats.challenges_total}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>Challenges Solved</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", color: "#00f0ff" }}>
              <Crosshair size={24} />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>ACCURACY</span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
              {stats.accuracy_rate}%
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>{stats.total_attempts} Total Submissions</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", color: "#ffb703" }}>
              <Trophy size={24} />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>GLOBAL RANK</span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
              #{profile.rank}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>Leaderboard Standing</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", color: "#9d4edd" }}>
              <Award size={24} />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>BADGES</span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", fontFamily: "'Fira Code', monospace", color: "#fff" }}>
              {stats.achievements_unlocked} <span style={{ fontSize: "1rem", color: "#94a3b8" }}>/ {stats.achievements_total}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>Achievements Unlocked</div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
          {/* Category Performance */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div className="section-title">
              <h2><Activity /> Domain Performance</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {categories.map((cat) => {
                const percent = cat.total_challenges > 0 ? Math.round((cat.solved_challenges / cat.total_challenges) * 100) : 0;
                return (
                  <div key={cat.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "0.4rem" }}>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{cat.name}</span>
                      <span style={{ color: "#00f0ff", fontFamily: "'Fira Code', monospace" }}>
                        {cat.solved_challenges} / {cat.total_challenges} ({percent}%)
                      </span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          background: percent === 100 ? "#00ff9d" : "linear-gradient(90deg, #00f0ff, #9d4edd)",
                          borderRadius: 4,
                          transition: "width 0.5s ease"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unlocked Achievements */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div className="section-title">
              <h2><Award /> Unlocked Achievements</h2>
            </div>
            {achievements.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>No achievements unlocked yet. Solve challenges to earn badges!</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,183,3,0.3)",
                      padding: "1rem",
                      borderRadius: "10px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ffb703", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                      <Award size={16} /> {ach.title}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{ach.description}</p>
                    <div style={{ fontSize: "0.75rem", color: "#00ff9d", marginTop: "0.5rem", fontFamily: "'Fira Code', monospace" }}>
                      +{ach.points} BONUS PTS
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECENT SUBMISSIONS LOG */}
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <div className="section-title">
            <h2><Clock /> Recent Submission Logs</h2>
          </div>
          {recent_submissions.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>No flag submissions recorded yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="xctf-table">
                <thead>
                  <tr>
                    <th>Challenge</th>
                    <th>Submitted Flag</th>
                    <th>Result</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ color: "#fff", fontWeight: 600 }}>{sub.challenge_title}</td>
                      <td style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.85rem", color: "#cbd5e1" }}>
                        {sub.submitted_flag}
                      </td>
                      <td>
                        {sub.is_correct === 1 ? (
                          <span className="badge" style={{ background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>
                            CORRECT (+{sub.points_awarded} PTS)
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "rgba(255,42,95,0.15)", color: "#ff2a5f" }}>
                            INCORRECT
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        {new Date(sub.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RECOMMENDED TARGETS */}
        {recommended && recommended.length > 0 && (
          <div>
            <div className="section-title">
              <h2><Flag /> Recommended Missions</h2>
            </div>
            <div className="challenges-grid">
              {recommended.map((ch) => (
                <div key={ch.id} className="glass-panel challenge-card">
                  <div>
                    <div className="card-top">
                      <span className="badge" style={{ background: "rgba(0, 240, 255, 0.1)", color: "#00f0ff" }}>
                        {ch.category_name}
                      </span>
                      <span className={`badge difficulty-${ch.difficulty}`}>{ch.difficulty}</span>
                    </div>
                    <h3 className="card-title">{ch.title}</h3>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                    <div className="card-points">{ch.points} PTS</div>
                    <Link to="/challenges" className="btn btn-secondary btn-sm">
                      Target Mission
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
