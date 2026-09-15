import React, { useState, useEffect } from "react";
import { apiChallenges, apiAdmin, apiMiniCtfs } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { X, ExternalLink, Lightbulb, CheckCircle, UserCheck, Flag, ArrowLeft, RotateCcw } from "lucide-react";

const ChallengeDetailModal = ({ challengeId, onClose, onSolveSuccess, miniCtfId }) => {
  const { user, showToast } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flagInput, setFlagInput] = useState("");
  const [showHintIndex, setShowHintIndex] = useState(null);
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await apiChallenges.get(challengeId);
        setChallenge(res.data.challenge);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [challengeId]);

  const handleRevertToInspect = async () => {
    const confirmMsg = "Are you sure you want to revert this challenge to Inspect Challenge? The challenge will be marked as incomplete and available for further inspection.";
    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt(`Reason for reverting '${challenge.title}' to Inspect Challenge (optional):`, "Admin status reversal");

    try {
      const res = await apiAdmin.revertChallengeToInspect(challenge.id, { reason: reason || "" });
      showToast(res.data.message || `Reverted '${challenge.title}' to Inspect Challenge.`, "success");
      setChallenge((prev) => ({ ...prev, solved: false }));
      if (onSolveSuccess) onSolveSuccess();
    } catch (err) {
      showToast(err.message || "Failed to revert challenge status.", "error");
    }
  };

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please log in to submit flags.", "error");
      return;
    }
    if (!flagInput.trim()) return;

    setSubmitting(true);
    setSubmissionFeedback(null);
    try {
      const res = miniCtfId
        ? await apiMiniCtfs.submitFlag(miniCtfId, challengeId, flagInput)
        : await apiChallenges.submitFlag(challengeId, flagInput);
      const data = res.data;

      if (data.is_correct) {
        showToast(data.message, "success");
        setSubmissionFeedback({ type: "success", text: data.message });
        setChallenge((prev) => ({ ...prev, solved: true, solves_count: (prev.solves_count || 0) + 1 }));
        if (onSolveSuccess) onSolveSuccess();
      } else {
        showToast(data.message, "error");
        setSubmissionFeedback({ type: "error", text: data.message });
      }
    } catch (err) {
      showToast(err.message, "error");
      setSubmissionFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !challenge) {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "#94a3b8" }}>Decrypting challenge payload...</p>
        </div>
      </div>
    );
  }

  // Construct target challenge environment URL if available
  const cParam = `challengeId=${challenge.id}${miniCtfId ? `&miniCtfId=${miniCtfId}` : ""}`;
  const targetOrigin = window.location.origin;
  const targetEnvUrl = challenge.url
    ? (challenge.url.startsWith("http://") || challenge.url.startsWith("https://")
        ? `${challenge.url}${challenge.url.includes("?") ? "&" : "?"}${cParam}`
        : (challenge.url.includes("?") 
            ? (challenge.url.includes("/")
                ? `${targetOrigin}/challenges-env/${challenge.url}&${cParam}`
                : `${targetOrigin}/challenges-env/${challenge.url.replace("?", "/index.html?")}&${cParam}`)
            : `${targetOrigin}/challenges-env/${challenge.url}/index.html?${cParam}`))
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#00f0ff" }}
          >
            <ArrowLeft size={16} /> {miniCtfId ? "⬅ Return to Mini CTF & Submit Flag" : "Return to Challenges"}
          </button>
          <button className="modal-close" onClick={onClose} style={{ position: "static" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
          <span className={`badge difficulty-${challenge.difficulty}`}>{challenge.difficulty}</span>
          <span className="badge" style={{ background: "rgba(0, 240, 255, 0.1)", color: "#00f0ff" }}>
            {challenge.category_name}
          </span>
          <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)", color: "#fff", marginLeft: "auto" }}>
            {challenge.points} PTS
          </span>
        </div>

        <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#fff", marginBottom: "1rem" }}>
          {challenge.title}
        </h2>

        <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "1.5rem" }}>
          <h4 style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Mission Objective & Overview
          </h4>
          <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: "1.6" }}>{challenge.description}</p>
        </div>

        {targetEnvUrl && (
          <div style={{ marginBottom: "1.5rem", background: "rgba(0, 240, 255, 0.05)", padding: "1rem", borderRadius: "10px", border: "1px solid rgba(0, 240, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>Hosted Target Environment</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Launch interactive sandbox to exploit target system.</div>
            </div>
            <a
              href={targetEnvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              <ExternalLink size={16} /> Open Target Sandbox
            </a>
          </div>
        )}

        {/* Hints Accordion */}
        {challenge.hints && challenge.hints.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Tactical Intelligence (Hints)
            </h4>
            {challenge.hints.map((hint, idx) => (
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

        {/* Flag Submission Area */}
        <div style={{ background: "rgba(13, 19, 31, 0.9)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(0, 240, 255, 0.2)" }}>
          {challenge.solved ? (
            <div style={{ textAlign: "center", color: "#00ff9d", padding: "1rem 0" }}>
              <CheckCircle size={42} style={{ marginBottom: "0.5rem" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>CHALLENGE COMPLETED</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>You have successfully captured this flag!</p>
              {user && user.role === "admin" && (
                <button
                  className="btn btn-warning btn-sm"
                  style={{ marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  onClick={handleRevertToInspect}
                >
                  <RotateCcw size={14} /> Revert to Inspect Challenge
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitFlag}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label style={{ color: "#00f0ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Flag size={16} /> Flag Verification
                </label>
                <input
                  type="text"
                  placeholder="XCTF{flag_submission_string}"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  style={{ fontFamily: "'Fira Code', monospace" }}
                />
              </div>

              {submissionFeedback && (
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "6px",
                    marginBottom: "1rem",
                    fontSize: "0.88rem",
                    background: submissionFeedback.type === "success" ? "rgba(0,255,157,0.15)" : "rgba(255,42,95,0.15)",
                    border: submissionFeedback.type === "success" ? "1px solid #00ff9d" : "1px solid #ff2a5f",
                    color: submissionFeedback.type === "success" ? "#00ff9d" : "#ff2a5f"
                  }}
                >
                  {submissionFeedback.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={submitting}
              >
                {submitting ? "Verifying Flag..." : "Submit Flag"}
              </button>
            </form>
          )}
        </div>

        {/* Solver History */}
        {challenge.solvers && challenge.solvers.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Hall of Solvers ({challenge.solves_count} Total)
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {challenge.solvers.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <UserCheck size={14} color="#00ff9d" />
                  <span style={{ color: "#fff", fontWeight: 500 }}>{s.username}</span>
                  {s.is_first_blood === 1 && (
                    <span style={{ color: "#ff2a5f", fontWeight: "bold" }} title="First Blood">🩸</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetailModal;
