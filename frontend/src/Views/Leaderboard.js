import React, { useState, useEffect } from "react";
import { apiLeaderboard } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Trophy, Search, RefreshCw, UserCheck } from "lucide-react";

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiLeaderboard.get({ q: searchTerm });
      setLeaderboard(res.data.leaderboard);
      setStats({
        total_participants: res.data.total_participants,
        total_solves: res.data.total_solves,
        total_available_points: res.data.total_available_points
      });
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLeaderboard();
  };

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="appPage">
      <div className="container">
        <div className="section-title">
          <div>
            <h2 style={{ fontSize: "2rem" }}><Trophy color="#ffb703" /> Global Leaderboard</h2>
            <p className="subtitle">Live competition standings and score progression metrics.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchLeaderboard}>
            <RefreshCw size={16} /> Sync Rankings
          </button>
        </div>

        {/* TOP 3 PODIUM */}
        {top3.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            {top3.map((u, i) => {
              const medals = ["🥇 GOLD OPERATIVE", "🥈 SILVER OPERATIVE", "🥉 BRONZE OPERATIVE"];
              const borderColors = ["#ffb703", "#94a3b8", "#b45309"];
              return (
                <div
                  key={u.id}
                  className="glass-panel"
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    border: `1px solid ${borderColors[i]}`,
                    boxShadow: i === 0 ? "0 0 30px rgba(255, 183, 3, 0.15)" : "none"
                  }}
                >
                  <div className="badge" style={{ background: "rgba(0,0,0,0.4)", color: borderColors[i], border: `1px solid ${borderColors[i]}`, marginBottom: "1rem" }}>
                    {medals[i]}
                  </div>

                  <img
                    src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                    alt={u.username}
                    style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${borderColors[i]}`, margin: "0 auto 1rem" }}
                  />

                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", marginBottom: "0.25rem" }}>{u.username}</h3>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Fira Code', monospace", color: "#00f0ff" }}>
                    {u.score} PTS
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                    {u.solves_count} Challenges Solved
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE SECTION */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", flex: 1, maxWidth: "400px" }}>
              <div className="form-group" style={{ marginBottom: 0, width: "100%" }}>
                <input
                  type="text"
                  placeholder="Search operative..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                <Search size={16} />
              </button>
            </form>

            <div style={{ fontSize: "0.85rem", color: "#94a3b8", display: "flex", gap: "1.5rem" }}>
              <span>Participants: <strong style={{ color: "#fff" }}>{stats.total_participants || 0}</strong></span>
              <span>Total Solves: <strong style={{ color: "#00ff9d" }}>{stats.total_solves || 0}</strong></span>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
              Calculating rank vectors...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="xctf-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Operative</th>
                    <th>Score</th>
                    <th>Solves</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((u) => {
                    const isSelf = user && user.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        style={{
                          background: isSelf ? "rgba(0, 240, 255, 0.08)" : "transparent",
                          fontWeight: isSelf ? 600 : 400
                        }}
                      >
                        <td style={{ fontFamily: "'Fira Code', monospace", fontWeight: 700, color: u.rank <= 3 ? "#ffb703" : "#94a3b8" }}>
                          #{u.rank}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <img src={u.avatar} alt={u.username} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #00f0ff" }} />
                            <span style={{ color: "#fff" }}>{u.username}</span>
                            {isSelf && <span className="badge" style={{ background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>YOU</span>}
                          </div>
                        </td>
                        <td style={{ fontFamily: "'Fira Code', monospace", fontWeight: 700, color: "#00f0ff" }}>
                          {u.score} PTS
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#00ff9d" }}>
                            <UserCheck size={14} /> {u.solves_count}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                          {new Date(u.last_solve_time).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
