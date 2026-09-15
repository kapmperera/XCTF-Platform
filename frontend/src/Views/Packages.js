import React, { useState, useEffect } from "react";
import { useLocation, useHistory, useParams } from "react-router-dom";
import { apiChallenges, apiAdmin } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ChallengeDetailModal from "./ChallengeDetailModal";
import { Search, CheckCircle, Flag, RefreshCw, RotateCcw } from "lucide-react";

const Packages = () => {
  const { user, showToast } = useAuth();
  const location = useLocation();
  const history = useHistory();
  const { id: paramId } = useParams();
  const queryParams = new URLSearchParams(location.search);
  const initialCategory = queryParams.get("category") || "all";

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // Auto-open challenge modal if challengeId is in URL parameters
  useEffect(() => {
    const cId = queryParams.get("challengeId") || queryParams.get("id") || paramId;
    if (cId) {
      setSelectedChallengeId(Number(cId));
    }
  }, [location.search, paramId]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  useEffect(() => {
    fetchChallenges();
  }, [categoryFilter, difficultyFilter, statusFilter, sortOption]);

  const handleSelectChallenge = (id) => {
    setSelectedChallengeId(id);
    if (id) {
      history.push(`/challenges?challengeId=${id}`);
    } else {
      history.push('/challenges');
    }
  };

  const handleRevertToInspect = async (ch) => {
    const confirmMsg = "Are you sure you want to revert this challenge to Inspect Challenge? The challenge will be marked as incomplete and available for further inspection.";
    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt(`Reason for reverting '${ch.title}' to Inspect Challenge (optional):`, "Admin status reversal");

    try {
      const res = await apiAdmin.revertChallengeToInspect(ch.id, { reason: reason || "" });
      showToast(res.data.message || `Reverted '${ch.title}' to Inspect Challenge.`, "success");
      fetchChallenges();
    } catch (err) {
      showToast(err.message || "Failed to revert challenge status.", "error");
    }
  };

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await apiChallenges.list({
        category: categoryFilter,
        difficulty: difficultyFilter,
        status: statusFilter,
        sort: sortOption,
        q: searchTerm
      });
      setChallenges(res.data.challenges);
    } catch (err) {
      console.error("Fetch challenges error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchChallenges();
  };

  return (
    <div className="appPage">
      <div className="container">
        <div className="section-title" style={{ marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "2rem" }}><Flag /> Challenge Command Center</h2>
            <p className="subtitle">Select a target mission, analyze specifications, and submit correct flags.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchChallenges} title="Refresh Challenges">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Search Keyword</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                />
                <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Domains</option>
                <option value="web-exploitation">Web Exploitation</option>
                <option value="cryptography">Cryptography</option>
                <option value="digital-forensics">Digital Forensics</option>
                <option value="osint">OSINT</option>
                <option value="reverse-engineering">Reverse Engineering</option>
                <option value="binary-exploitation">Binary Exploitation</option>
                <option value="steganography">Steganography</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Difficulty</label>
              <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                <option value="all">All Difficulties</option>
                <option value="Beginner">Beginner</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Insane">Insane</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Solves</option>
                <option value="unsolved">Unsolved</option>
                <option value="solved">Solved</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Sort By</label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="points_desc">Highest Points</option>
                <option value="points_asc">Lowest Points</option>
                <option value="solves">Most Solves</option>
                <option value="difficulty">Difficulty Order</option>
              </select>
            </div>
          </form>
        </div>

        {/* CHALLENGES GRID */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
            Scanning tactical challenge databases...
          </div>
        ) : challenges.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "4rem" }}>
            <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>No active challenges match your filter criteria.</p>
          </div>
        ) : (
          <div className="challenges-grid">
            {challenges.map((ch) => (
              <div
                key={ch.id}
                className={`glass-panel challenge-card ${ch.solved ? "solved" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => handleSelectChallenge(ch.id)}
              >
                <div>
                  <div className="card-top">
                    <span className="badge" style={{ background: "rgba(0, 240, 255, 0.1)", color: "#00f0ff" }}>
                      {ch.category_name}
                    </span>
                    <span className={`badge difficulty-${ch.difficulty}`}>{ch.difficulty}</span>
                  </div>

                  <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {ch.solved && <CheckCircle size={18} color="#00ff9d" />}
                    {ch.title}
                  </h3>

                  <p className="card-desc">{ch.description}</p>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div className="card-points">{ch.points} PTS</div>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{ch.solves_count} Solves</span>
                  </div>

                  {user && user.role === "admin" && ch.solved ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                        Review Mission
                      </button>
                      <button
                        className="btn btn-warning btn-sm"
                        style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                        title="Revert status to Inspect Challenge (Incomplete)"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevertToInspect(ch);
                        }}
                      >
                        <RotateCcw size={14} /> Revert
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                      {ch.solved ? "Review Mission" : "Inspect Challenge"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INTERACTIVE CHALLENGE MODAL */}
        {selectedChallengeId && (
          <ChallengeDetailModal
            challengeId={selectedChallengeId}
            onClose={() => handleSelectChallenge(null)}
            onSolveSuccess={fetchChallenges}
          />
        )}
      </div>
    </div>
  );
};

export default Packages;
