import React, { useState, useEffect } from "react";
import { apiAdmin } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Lock, Plus, Edit, Trash2, Shield, Users, Flag, RefreshCw,
  Trophy, Eye, ArrowUp, ArrowDown, History, RotateCcw, FileText
} from "lucide-react";

const AdminDashboard = () => {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'challenges', 'mini-ctfs', 'users', 'reset-logs'
  const [overview, setOverview] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [users, setUsers] = useState([]);
  const [miniCtfs, setMiniCtfs] = useState([]);
  const [resetLogs, setResetLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Challenge Modal State
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [chForm, setChForm] = useState({
    title: "",
    category_id: 1,
    difficulty: "Easy",
    points: 100,
    description: "",
    hints: "",
    flag: "",
    author: "Admin",
    url: ""
  });

  // Mini CTF Modal State
  const [showMiniCtfModal, setShowMiniCtfModal] = useState(false);
  const [editingMiniCtf, setEditingMiniCtf] = useState(null);
  const [mctfForm, setMctfForm] = useState({
    title: "",
    description: "",
    difficulty: "Easy",
    category: "Web Exploitation",
    status: "Draft",
    visibility: "Public",
    time_mode: "normal",
    time_limit_minutes: 30,
    scheduled_start_time: "",
    scheduled_end_time: "",
    challenge_ids: [],
    permitted_user_ids: []
  });

  // Status Change Workflow Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalMctf, setStatusModalMctf] = useState(null);
  const [targetStatus, setTargetStatus] = useState("Published");
  const [statusReason, setStatusReason] = useState("");

  // Reset Mini CTF Attempts Modal State
  const [showResetAttemptsModal, setShowResetAttemptsModal] = useState(false);
  const [resetAttemptsMctf, setResetAttemptsMctf] = useState(null);
  const [resetAttemptsReason, setResetAttemptsReason] = useState("");
  const [resetAttemptsTargetStatus, setResetAttemptsTargetStatus] = useState("Published");
  const [challengeResetOption, setChallengeResetOption] = useState("all");

  const handleOpenResetAttemptsModal = (mctf) => {
    setResetAttemptsMctf(mctf);
    setResetAttemptsReason("Admin reset Mini CTF for new participant speedrun attempts");
    setResetAttemptsTargetStatus(mctf.status === "Completed" ? "Published" : mctf.status);
    setChallengeResetOption("all");
    setShowResetAttemptsModal(true);
  };

  const handleExecuteResetAttempts = async () => {
    if (!resetAttemptsMctf) return;
    try {
      const res = await apiAdmin.resetMiniCtfAttempts(
        resetAttemptsMctf.id,
        resetAttemptsReason,
        resetAttemptsTargetStatus,
        challengeResetOption
      );
      showToast(res.data.message, "success");
      setShowResetAttemptsModal(false);
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Participant Progress Reset Modal State
  const [showProgressResetModal, setShowProgressResetModal] = useState(false);
  const [resetProgressForm, setResetProgressForm] = useState({
    scope: "single_user_mini_ctf", // 'single_user_mini_ctf', 'all_users_mini_ctf', 'single_user_challenge', 'all_users_challenge'
    mini_ctf_id: "",
    challenge_id: "",
    user_id: "",
    reason: ""
  });

  // Preview Modal State
  const [previewMctf, setPreviewMctf] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const res = await apiAdmin.getOverview();
        setOverview(res.data);
      } else if (activeTab === "challenges") {
        const res = await apiAdmin.getChallenges();
        setChallenges(res.data.challenges || []);
      } else if (activeTab === "mini-ctfs") {
        const res = await apiAdmin.getMiniCtfs();
        setMiniCtfs(res.data.mini_ctfs || []);
        const chRes = await apiAdmin.getChallenges();
        setChallenges(chRes.data.challenges || []);
        const uRes = await apiAdmin.getUsers();
        setUsers(uRes.data.users || []);
      } else if (activeTab === "users") {
        const res = await apiAdmin.getUsers();
        setUsers(res.data.users || []);
      } else if (activeTab === "reset-logs") {
        const res = await apiAdmin.getResetLogs();
        setResetLogs(res.data.reset_logs || []);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- CHALLENGE RESET & REVIEW HANDLERS ---
  const handleResetChallengeReview = async (ch) => {
    const reason = window.prompt(`Reason for resetting '${ch.title}' to Review mode (suspends access for inspection/testing):`);
    if (reason === null) return;
    try {
      const res = await apiAdmin.resetChallengeReview(ch.id, reason);
      showToast(res.data.message, "info");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleActivateChallenge = async (ch) => {
    const reason = window.prompt(`Reason for re-activating '${ch.title}' (makes challenge available to users again):`);
    if (reason === null) return;
    try {
      const res = await apiAdmin.activateChallenge(ch.id, reason);
      showToast(res.data.message, "success");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleRevertToInspect = async (ch) => {
    const confirmMsg = "Are you sure you want to revert this challenge to Inspect Challenge? The challenge will be marked as incomplete and available for further inspection.";
    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt(`Reason for reverting '${ch.title}' to Inspect Challenge (optional):`, "Admin status reversal");

    try {
      const res = await apiAdmin.revertChallengeToInspect(ch.id, { scope: "all_users", reason: reason || "" });
      showToast(res.data.message, "success");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };


  const handleOpenCreateChallengeModal = () => {
    setEditingChallenge(null);
    setChForm({
      title: "",
      category_id: 1,
      difficulty: "Easy",
      points: 100,
      description: "",
      hints: "[]",
      flag: "XCTF{sample_flag_here}",
      author: "Admin",
      url: ""
    });
    setShowChallengeModal(true);
  };

  const handleOpenEditChallengeModal = (ch) => {
    setEditingChallenge(ch);
    setChForm({
      title: ch.title,
      category_id: ch.category_id || 1,
      difficulty: ch.difficulty,
      points: ch.points,
      description: ch.description,
      hints: typeof ch.hints === "string" ? ch.hints : JSON.stringify(ch.hints || []),
      flag: ch.flag,
      author: ch.author,
      url: ch.url || ""
    });
    setShowChallengeModal(true);
  };

  const handleSaveChallenge = async (e) => {
    e.preventDefault();
    try {
      if (editingChallenge) {
        await apiAdmin.updateChallenge(editingChallenge.id, chForm);
        showToast("Challenge updated successfully!", "success");
      } else {
        await apiAdmin.createChallenge(chForm);
        showToast("New challenge created successfully!", "success");
      }
      setShowChallengeModal(false);
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("Are you sure you want to delete this challenge?")) return;
    try {
      await apiAdmin.deleteChallenge(id);
      showToast("Challenge deleted.", "info");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // --- MINI CTF RESET & REVIEW HANDLERS ---
  const handleResetMiniCtfReview = async (mctf) => {
    const reason = window.prompt(`Reason for resetting Mini CTF '${mctf.title}' back to Draft/Review state:`);
    if (reason === null) return;
    try {
      const res = await apiAdmin.resetMiniCtfReview(mctf.id, reason);
      showToast(res.data.message, "info");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleOpenCreateMiniCtfModal = () => {
    setEditingMiniCtf(null);
    setMctfForm({
      title: "",
      description: "",
      difficulty: "Easy",
      category: "Web Exploitation",
      status: "Draft",
      visibility: "Public",
      time_mode: "normal",
      time_limit_minutes: 30,
      scheduled_start_time: "",
      scheduled_end_time: "",
      challenge_ids: challenges.length > 0 ? [challenges[0].id] : [],
      permitted_user_ids: []
    });
    setShowMiniCtfModal(true);
  };

  const handleOpenEditMiniCtfModal = (mctf) => {
    setEditingMiniCtf(mctf);
    setMctfForm({
      title: mctf.title,
      description: mctf.description,
      difficulty: mctf.difficulty,
      category: mctf.category,
      status: mctf.status,
      visibility: mctf.visibility,
      time_mode: mctf.time_mode || "normal",
      time_limit_minutes: mctf.time_limit_minutes || 30,
      scheduled_start_time: mctf.scheduled_start_time ? mctf.scheduled_start_time.slice(0, 16) : "",
      scheduled_end_time: mctf.scheduled_end_time ? mctf.scheduled_end_time.slice(0, 16) : "",
      challenge_ids: mctf.challenges ? mctf.challenges.map((c) => c.id) : [],
      permitted_user_ids: mctf.permitted_users ? mctf.permitted_users.map((u) => u.user_id) : []
    });
    setShowMiniCtfModal(true);
  };

  const handleSaveMiniCtf = async (e) => {
    e.preventDefault();
    if (!mctfForm.title.trim() || !mctfForm.description.trim()) {
      showToast("Title and description are required.", "error");
      return;
    }
    if (mctfForm.challenge_ids.length === 0) {
      showToast("At least one challenge must be selected for the Mini CTF sequence.", "error");
      return;
    }

    const payload = {
      ...mctfForm,
      time_limit_minutes: Math.max(1, parseInt(mctfForm.time_limit_minutes) || 30)
    };

    try {
      if (editingMiniCtf) {
        await apiAdmin.updateMiniCtf(editingMiniCtf.id, payload);
        showToast("Mini CTF updated successfully!", "success");
      } else {
        await apiAdmin.createMiniCtf(payload);
        showToast("New Mini CTF created successfully!", "success");
      }
      setShowMiniCtfModal(false);
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleToggleChallengeInSequence = (chId) => {
    setMctfForm((prev) => {
      const exists = prev.challenge_ids.includes(chId);
      if (exists) {
        return { ...prev, challenge_ids: prev.challenge_ids.filter((id) => id !== chId) };
      } else {
        return { ...prev, challenge_ids: [...prev.challenge_ids, chId] };
      }
    });
  };

  const handleMoveChallengeSequence = (index, direction) => {
    setMctfForm((prev) => {
      const arr = [...prev.challenge_ids];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= arr.length) return prev;
      const temp = arr[index];
      arr[index] = arr[targetIndex];
      arr[targetIndex] = temp;
      return { ...prev, challenge_ids: arr };
    });
  };

  const handleToggleUserPermission = (uId) => {
    setMctfForm((prev) => {
      const exists = prev.permitted_user_ids.includes(uId);
      if (exists) {
        return { ...prev, permitted_user_ids: prev.permitted_user_ids.filter((id) => id !== uId) };
      } else {
        return { ...prev, permitted_user_ids: [...prev.permitted_user_ids, uId] };
      }
    });
  };

  const handleOpenStatusModal = (mctf) => {
    setStatusModalMctf(mctf);
    const nextMap = {
      Draft: "Published",
      Published: "Active",
      Active: "Completed",
      Completed: "Archived",
      Archived: "Published"
    };
    setTargetStatus(nextMap[mctf.status] || "Published");
    setStatusReason("");
    setShowStatusModal(true);
  };

  const handleExecuteStatusTransition = async (e) => {
    e.preventDefault();
    if (!statusModalMctf) return;
    try {
      const res = await apiAdmin.updateMiniCtfStatus(statusModalMctf.id, targetStatus, statusReason);
      showToast(res.data.message, "success");
      setShowStatusModal(false);
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteMiniCtf = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Mini CTF? All user attempt records will be removed.")) return;
    try {
      await apiAdmin.deleteMiniCtf(id);
      showToast("Mini CTF deleted successfully.", "info");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handlePreviewMiniCtf = async (id) => {
    try {
      const res = await apiAdmin.previewMiniCtf(id);
      setPreviewMctf(res.data);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // --- PARTICIPANT PROGRESS RESET HANDLERS ---
  const handleOpenProgressResetModal = async () => {
    try {
      const mRes = await apiAdmin.getMiniCtfs();
      setMiniCtfs(mRes.data.mini_ctfs || []);
      const chRes = await apiAdmin.getChallenges();
      setChallenges(chRes.data.challenges || []);
      const uRes = await apiAdmin.getUsers();
      setUsers(uRes.data.users || []);

      setResetProgressForm({
        scope: "single_user_mini_ctf",
        mini_ctf_id: mRes.data.mini_ctfs.length > 0 ? mRes.data.mini_ctfs[0].id : "",
        challenge_id: chRes.data.challenges.length > 0 ? chRes.data.challenges[0].id : "",
        user_id: uRes.data.users.length > 0 ? uRes.data.users[0].id : "",
        reason: ""
      });
      setShowProgressResetModal(true);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleExecuteProgressReset = async (e) => {
    e.preventDefault();
    if (!resetProgressForm.reason.trim()) {
      showToast("Audit rationale reason is required before resetting progress.", "error");
      return;
    }

    if (!window.confirm("CONFIRMATION: Are you sure you want to execute this progress reset operation? Audit log will record this action.")) {
      return;
    }

    try {
      const res = await apiAdmin.resetParticipantProgress(resetProgressForm);
      showToast(res.data.message, "success");
      setShowProgressResetModal(false);
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // --- USER HANDLERS ---
  const handleToggleUserBan = async (userObj) => {
    try {
      await apiAdmin.toggleUserBan(userObj.id, !userObj.is_banned);
      showToast(`User ${userObj.username} ${userObj.is_banned ? "unbanned" : "banned"}.`, "info");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiAdmin.updateUserRole(userId, newRole);
      showToast("Role updated.", "success");
      fetchAdminData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="appPage">
      <div className="container">
        <div className="section-title">
          <div>
            <h2 style={{ fontSize: "2rem", color: "#ffb703" }}><Lock /> Administrator Operations Center</h2>
            <p className="subtitle">Platform monitoring, challenge review, Mini CTF governance, user progress resets, and audit trail logs.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-danger btn-sm" onClick={handleOpenProgressResetModal}>
              <RotateCcw size={16} /> Reset Participant Progress
            </button>
            <button className="btn btn-secondary btn-sm" onClick={fetchAdminData}>
              <RefreshCw size={16} /> Sync Metrics
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <button
            className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("overview")}
          >
            <Shield size={16} /> Overview Stats
          </button>
          <button
            className={`btn ${activeTab === "challenges" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("challenges")}
          >
            <Flag size={16} /> Manage Challenges
          </button>
          <button
            className={`btn ${activeTab === "mini-ctfs" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("mini-ctfs")}
          >
            <Trophy size={16} /> Manage Mini CTFs
          </button>
          <button
            className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={16} /> Manage Users
          </button>
          <button
            className={`btn ${activeTab === "reset-logs" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("reset-logs")}
          >
            <FileText size={16} /> Reset Audit Logs
          </button>
        </div>

        {/* TAB 1: OVERVIEW STATS */}
        {activeTab === "overview" && overview && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>TOTAL PARTICIPANTS</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", fontFamily: "'Fira Code', monospace" }}>
                  {overview.metrics.total_users}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>ACTIVE USERS (24H)</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#00ff9d", fontFamily: "'Fira Code', monospace" }}>
                  {overview.metrics.active_users_24h}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>TOTAL CHALLENGES</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#00f0ff", fontFamily: "'Fira Code', monospace" }}>
                  {overview.metrics.total_challenges}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>SUBMISSION SOLVE RATE</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ffb703", fontFamily: "'Fira Code', monospace" }}>
                  {overview.metrics.solve_rate}%
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: "1rem" }}>
                Platform Submission Audit Stream
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table className="xctf-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Challenge</th>
                      <th>Submitted Flag</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recent_submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td style={{ color: "#fff", fontWeight: 600 }}>{sub.username}</td>
                        <td style={{ color: "#00f0ff" }}>{sub.challenge_title}</td>
                        <td style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.85rem" }}>{sub.submitted_flag}</td>
                        <td>
                          {sub.is_correct === 1 ? (
                            <span className="badge" style={{ background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>CORRECT</span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(255,42,95,0.15)", color: "#ff2a5f" }}>INCORRECT</span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{new Date(sub.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHALLENGE REPOSITORY & REVIEW STATE */}
        {activeTab === "challenges" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ color: "#fff", fontSize: "1.25rem" }}>Challenge Repository ({challenges.length})</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  Inspect challenges, reset challenges to Review state for testing, or modify definitions.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreateChallengeModal}>
                <Plus size={16} /> Add New Challenge
              </button>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="xctf-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Difficulty</th>
                      <th>Points</th>
                      <th>State</th>
                      <th>Solves</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challenges.map((ch) => (
                      <tr key={ch.id}>
                        <td style={{ color: "#94a3b8", fontFamily: "'Fira Code', monospace" }}>#{ch.id}</td>
                        <td style={{ color: "#fff", fontWeight: 600 }}>{ch.title}</td>
                        <td style={{ color: "#00f0ff" }}>{ch.category_name || "General"}</td>
                        <td>
                          <span className={`badge difficulty-${ch.difficulty}`}>{ch.difficulty}</span>
                        </td>
                        <td style={{ fontFamily: "'Fira Code', monospace", color: "#ffb703" }}>{ch.points} PTS</td>
                        <td>
                          {ch.is_active === 1 ? (
                            <span className="badge" style={{ background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>ACTIVE</span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(255,183,3,0.15)", color: "#ffb703" }}>IN REVIEW</span>
                          )}
                        </td>
                        <td style={{ color: "#94a3b8" }}>{ch.solves_count} solves</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {ch.is_active === 1 ? (
                              <button className="btn btn-secondary btn-sm" title="Reset challenge to Review mode" onClick={() => handleResetChallengeReview(ch)}>
                                <RotateCcw size={14} /> Reset Review
                              </button>
                            ) : (
                              <button className="btn btn-primary btn-sm" title="Re-activate reviewed challenge" onClick={() => handleActivateChallenge(ch)}>
                                Re-Activate
                              </button>
                            )}
                            <button className="btn btn-warning btn-sm" title="Revert status to Inspect Challenge (Incomplete)" onClick={() => handleRevertToInspect(ch)}>
                              <RotateCcw size={14} /> Revert to Inspect
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditChallengeModal(ch)}>
                              <Edit size={14} /> Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteChallenge(ch.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MINI CTF GOVERNANCE & RESET TO REVIEW */}
        {activeTab === "mini-ctfs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ color: "#fff", fontSize: "1.25rem" }}>Mini CTF Competitions ({miniCtfs.length})</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  Manage Mini CTFs, execute status transitions, or reset Mini CTFs to Draft/Review for testing.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreateMiniCtfModal}>
                <Plus size={16} /> Create Mini CTF
              </button>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="xctf-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Difficulty / Domain</th>
                      <th>Status</th>
                      <th>Visibility</th>
                      <th>Challenges Sequence</th>
                      <th>Solves</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miniCtfs.map((mctf) => (
                      <tr key={mctf.id}>
                        <td style={{ color: "#94a3b8", fontFamily: "'Fira Code', monospace" }}>#{mctf.id}</td>
                        <td>
                          <div style={{ color: "#fff", fontWeight: 700 }}>{mctf.title}</div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{mctf.description.slice(0, 50)}...</div>
                        </td>
                        <td>
                          <span className={`badge difficulty-${mctf.difficulty}`}>{mctf.difficulty}</span>
                          <span className="badge" style={{ background: "rgba(0,240,255,0.1)", color: "#00f0ff", marginLeft: "0.3rem" }}>
                            {mctf.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge status-${mctf.status}`}>{mctf.status}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0" }}>
                            {mctf.visibility}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.82rem", color: "#00ff9d" }}>
                            {mctf.challenges ? mctf.challenges.length : 0} Targets
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            {mctf.challenges ? mctf.challenges.map((c) => c.title).join(" ➔ ") : ""}
                          </div>
                        </td>
                        <td style={{ color: "#ffb703" }}>{mctf.completed_count} finished</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                            <button className="btn btn-secondary btn-sm" title="Reset Mini CTF to Draft/Review state" onClick={() => handleResetMiniCtfReview(mctf)}>
                              <RotateCcw size={14} /> Reset Review
                            </button>
                            <button className="btn btn-primary btn-sm" style={{ background: "rgba(0,240,255,0.15)", color: "#00f0ff", border: "1px solid rgba(0,240,255,0.4)" }} title="Reset Mini CTF for new participant attempts" onClick={() => handleOpenResetAttemptsModal(mctf)}>
                              <RotateCcw size={14} /> Reset CTF
                            </button>
                            <button className="btn btn-secondary btn-sm" title="Change Status Workflow" onClick={() => handleOpenStatusModal(mctf)}>
                              <History size={14} /> Status
                            </button>
                            <button className="btn btn-secondary btn-sm" title="Edit Mini CTF" onClick={() => handleOpenEditMiniCtfModal(mctf)}>
                              <Edit size={14} /> Edit
                            </button>
                            <button className="btn btn-secondary btn-sm" title="Preview Mini CTF" onClick={() => handlePreviewMiniCtf(mctf.id)}>
                              <Eye size={14} /> Preview
                            </button>
                            <button className="btn btn-danger btn-sm" title="Delete Mini CTF" onClick={() => handleDeleteMiniCtf(mctf.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: USERS GOVERNANCE */}
        {activeTab === "users" && (
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "1rem" }}>Operative Governance</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="xctf-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ color: "#fff", fontWeight: 600 }}>{u.username}</td>
                      <td style={{ color: "#94a3b8" }}>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#0b0f19", color: "#00f0ff", border: "1px solid rgba(0,240,255,0.3)" }}
                        >
                          <option value="participant">participant</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td style={{ fontFamily: "'Fira Code', monospace", color: "#00ff9d" }}>{u.score} PTS</td>
                      <td>
                        {u.is_banned === 1 ? (
                          <span className="badge" style={{ background: "rgba(255,42,95,0.15)", color: "#ff2a5f" }}>BANNED</span>
                        ) : (
                          <span className="badge" style={{ background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>ACTIVE</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`btn ${u.is_banned ? "btn-primary" : "btn-danger"} btn-sm`}
                          onClick={() => handleToggleUserBan(u)}
                        >
                          {u.is_banned ? "Unban User" : "Ban User"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: RESET AUDIT TRAIL LOGS */}
        {activeTab === "reset-logs" && (
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Administrative Reset Audit Trail
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Permanent record of all challenge reset, Mini CTF review, and participant progress reset operations.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="xctf-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Administrator</th>
                    <th>Reset Type</th>
                    <th>Target Title</th>
                    <th>Affected User</th>
                    <th>Audit Rationale Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {resetLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: "#94a3b8", fontFamily: "'Fira Code', monospace" }}>#{log.id}</td>
                      <td style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ color: "#00f0ff", fontWeight: 600 }}>{log.admin_username || "Admin"}</td>
                      <td>
                        <span className="badge" style={{ background: "rgba(255,183,3,0.15)", color: "#ffb703" }}>
                          {log.reset_type}
                        </span>
                      </td>
                      <td style={{ color: "#fff", fontWeight: 500 }}>{log.target_title}</td>
                      <td style={{ color: "#94a3b8" }}>{log.affected_username || "N/A (All/System)"}</td>
                      <td style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PARTICIPANT PROGRESS RESET MODAL */}
        {showProgressResetModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#ff2a5f", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <RotateCcw size={22} /> Participant Progress Reset
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                Select a targeted scope to reset participant attempts or challenge completion states.
              </p>

              {/* SAFETY WARNING BANNER */}
              <div style={{ background: "rgba(255,42,95,0.1)", border: "1px solid rgba(255,42,95,0.3)", padding: "0.85rem 1rem", borderRadius: "8px", color: "#ff2a5f", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>⚠️ SAFETY NOTICE</div>
                Historical administrative logs are preserved. This operation resets active attempt states/solves as requested. Challenge definitions and source code will NOT be deleted.
              </div>

              <form onSubmit={handleExecuteProgressReset}>
                <div className="form-group">
                  <label>Reset Scope Option</label>
                  <select
                    value={resetProgressForm.scope}
                    onChange={(e) => setResetProgressForm({ ...resetProgressForm, scope: e.target.value })}
                  >
                    <option value="single_user_mini_ctf">Reset 1 User's Mini CTF Attempt</option>
                    <option value="all_users_mini_ctf">Reset ALL Users' Mini CTF Attempts</option>
                    <option value="single_user_challenge">Reset 1 User's Challenge Solve (Deduct points)</option>
                    <option value="all_users_challenge">Reset ALL Users' Challenge Solves (Deduct points)</option>
                  </select>
                </div>

                {(resetProgressForm.scope === "single_user_mini_ctf" || resetProgressForm.scope === "all_users_mini_ctf") && (
                  <div className="form-group">
                    <label>Target Mini CTF</label>
                    <select
                      value={resetProgressForm.mini_ctf_id}
                      onChange={(e) => setResetProgressForm({ ...resetProgressForm, mini_ctf_id: parseInt(e.target.value) })}
                    >
                      {miniCtfs.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(resetProgressForm.scope === "single_user_challenge" || resetProgressForm.scope === "all_users_challenge") && (
                  <div className="form-group">
                    <label>Target Challenge</label>
                    <select
                      value={resetProgressForm.challenge_id}
                      onChange={(e) => setResetProgressForm({ ...resetProgressForm, challenge_id: parseInt(e.target.value) })}
                    >
                      {challenges.map((c) => (
                        <option key={c.id} value={c.id}>{c.title} ({c.points} PTS)</option>
                      ))}
                    </select>
                  </div>
                )}

                {(resetProgressForm.scope === "single_user_mini_ctf" || resetProgressForm.scope === "single_user_challenge") && (
                  <div className="form-group">
                    <label>Target User Operative</label>
                    <select
                      value={resetProgressForm.user_id}
                      onChange={(e) => setResetProgressForm({ ...resetProgressForm, user_id: parseInt(e.target.value) })}
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Audit Rationale Reason (Mandatory)</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Provide reason for progress reset..."
                    value={resetProgressForm.reason}
                    onChange={(e) => setResetProgressForm({ ...resetProgressForm, reason: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProgressResetModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger">
                    Execute Progress Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE / EDIT MINI CTF MODAL */}
        {showMiniCtfModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#fff", marginBottom: "1.5rem" }}>
                {editingMiniCtf ? "Edit Mini CTF Specification" : "Create New Mini CTF"}
              </h2>

              <form onSubmit={handleSaveMiniCtf}>
                <div className="form-group">
                  <label>Mini CTF Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Security Speedrun"
                    value={mctfForm.title}
                    onChange={(e) => setMctfForm({ ...mctfForm, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select
                      value={mctfForm.difficulty}
                      onChange={(e) => setMctfForm({ ...mctfForm, difficulty: e.target.value })}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Insane">Insane</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Domain Category</label>
                    <input
                      type="text"
                      value={mctfForm.category}
                      onChange={(e) => setMctfForm({ ...mctfForm, category: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status Lifecycle</label>
                    <select
                      value={mctfForm.status}
                      onChange={(e) => setMctfForm({ ...mctfForm, status: e.target.value })}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Visibility</label>
                    <select
                      value={mctfForm.visibility}
                      onChange={(e) => setMctfForm({ ...mctfForm, visibility: e.target.value })}
                    >
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                      <option value="Hidden">Hidden</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>

                {/* TIME MODE SELECTION PANEL */}
                <div style={{ background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.2)", padding: "1.25rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
                  <div className="form-group" style={{ marginBottom: mctfForm.time_mode === "time_limited" ? "1rem" : 0 }}>
                    <label style={{ color: "#00f0ff", fontWeight: 700, fontSize: "0.9rem" }}>Mini CTF Time Mode</label>
                    <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fff", cursor: "pointer", fontSize: "0.9rem" }}>
                        <input
                          type="radio"
                          name="mctf_time_mode"
                          value="normal"
                          checked={mctfForm.time_mode === "normal"}
                          onChange={(e) => setMctfForm({ ...mctfForm, time_mode: e.target.value })}
                        />
                        <span>♾️ Normal Mode (Unlimited Time)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fff", cursor: "pointer", fontSize: "0.9rem" }}>
                        <input
                          type="radio"
                          name="mctf_time_mode"
                          value="time_limited"
                          checked={mctfForm.time_mode === "time_limited"}
                          onChange={(e) => setMctfForm({ ...mctfForm, time_mode: e.target.value })}
                        />
                        <span>⏱️ Time-Limited Mode (Countdown)</span>
                      </label>
                    </div>
                  </div>

                  {mctfForm.time_mode === "time_limited" && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Configured Time Limit (Minutes)</label>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" }}>
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          required
                          placeholder="e.g. 15"
                          value={mctfForm.time_limit_minutes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMctfForm({
                              ...mctfForm,
                              time_limit_minutes: val === "" ? "" : Math.max(1, parseInt(val) || 1)
                            });
                          }}
                          style={{ width: "130px", fontFamily: "'Fira Code', monospace" }}
                        />
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {[10, 30, 60, 120].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`btn btn-sm ${Number(mctfForm.time_limit_minutes) === preset ? "btn-primary" : "btn-secondary"}`}
                              style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem" }}
                              onClick={() => setMctfForm({ ...mctfForm, time_limit_minutes: preset })}
                            >
                              {preset} Mins
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Short description of this Mini CTF speedrun..."
                    value={mctfForm.description}
                    onChange={(e) => setMctfForm({ ...mctfForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Scheduled Start Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={mctfForm.scheduled_start_time}
                      onChange={(e) => setMctfForm({ ...mctfForm, scheduled_start_time: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Scheduled End Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={mctfForm.scheduled_end_time}
                      onChange={(e) => setMctfForm({ ...mctfForm, scheduled_end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(0,240,255,0.2)", marginBottom: "1.5rem" }}>
                  <h4 style={{ color: "#00f0ff", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                    Selected Challenges Sequence Order ({mctfForm.challenge_ids.length} Selected)
                  </h4>

                  {mctfForm.challenge_ids.length > 0 ? (
                    <div style={{ marginBottom: "1rem" }}>
                      {mctfForm.challenge_ids.map((chId, idx) => {
                        const chObj = challenges.find((c) => c.id === chId);
                        return (
                          <div
                            key={chId}
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              padding: "0.5rem 1rem",
                              borderRadius: "6px",
                              marginBottom: "0.4rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <span style={{ background: "#00f0ff", color: "#080b11", fontWeight: 800, fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                #{idx + 1}
                              </span>
                              <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>
                                {chObj ? chObj.title : `Challenge ID #${chId}`}
                              </span>
                              {chObj && <span className={`badge difficulty-${chObj.difficulty}`}>{chObj.difficulty}</span>}
                            </div>

                            <div style={{ display: "flex", gap: "0.25rem" }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "0.2rem 0.4rem" }}
                                disabled={idx === 0}
                                onClick={() => handleMoveChallengeSequence(idx, -1)}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "0.2rem 0.4rem" }}
                                disabled={idx === mctfForm.challenge_ids.length - 1}
                                onClick={() => handleMoveChallengeSequence(idx, 1)}
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: "0.2rem 0.4rem" }}
                                onClick={() => handleToggleChallengeInSequence(chId)}
                              >
                                ✖
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No challenges selected yet. Select from repository below.</p>
                  )}

                  <h5 style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    Select / Unselect Challenges from Repository:
                  </h5>
                  <div style={{ maxHeight: "180px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {challenges.map((ch) => {
                      const isSelected = mctfForm.challenge_ids.includes(ch.id);
                      return (
                        <label
                          key={ch.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.85rem",
                            color: isSelected ? "#00ff9d" : "#cbd5e1",
                            cursor: "pointer",
                            background: "rgba(0,0,0,0.2)",
                            padding: "0.4rem 0.6rem",
                            borderRadius: "4px"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleChallengeInSequence(ch.id)}
                          />
                          {ch.title} ({ch.difficulty})
                        </label>
                      );
                    })}
                  </div>
                </div>

                {mctfForm.visibility === "Private" && (
                  <div style={{ background: "rgba(255, 183, 3, 0.05)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(255,183,3,0.2)", marginBottom: "1.5rem" }}>
                    <h4 style={{ color: "#ffb703", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      Private Access Whitelist ({mctfForm.permitted_user_ids.length} Users Permitted)
                    </h4>
                    <div style={{ maxHeight: "140px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      {users.map((u) => {
                        const isPermitted = mctfForm.permitted_user_ids.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              fontSize: "0.85rem",
                              color: isPermitted ? "#00ff9d" : "#cbd5e1",
                              cursor: "pointer"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isPermitted}
                              onChange={() => handleToggleUserPermission(u.id)}
                            />
                            {u.username} ({u.email})
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowMiniCtfModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Mini CTF
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STATUS TRANSITION WORKFLOW MODAL */}
        {showStatusModal && statusModalMctf && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: "550px" }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#fff", marginBottom: "0.5rem" }}>
                Status Transition Workflow
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Transitioning status for <strong>{statusModalMctf.title}</strong> (Current Status: <span className={`badge status-${statusModalMctf.status}`}>{statusModalMctf.status}</span>).
              </p>

              <form onSubmit={handleExecuteStatusTransition}>
                <div className="form-group">
                  <label>Select Target Status</label>
                  <select value={targetStatus} onChange={(e) => setTargetStatus(e.target.value)}>
                    <option value="Draft">Draft (Being created / configured)</option>
                    <option value="Published">Published (Ready for audience)</option>
                    <option value="Active">Active (Currently running)</option>
                    <option value="Completed">Completed (Ended / results visible)</option>
                    <option value="Archived">Archived (Stored in records)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Transition Rationale / Audit Note</label>
                  <textarea
                    rows={2}
                    placeholder="Provide reason for changing status..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.5rem" }}>
                  <div style={{ color: "#ffb703", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    Recommended Transition Lifecycle Flow:
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontFamily: "'Fira Code', monospace" }}>
                    Draft ➔ Published ➔ Active ➔ Completed ➔ Archived
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Execute Status Transition
                  </button>
                </div>
              </form>

              {statusModalMctf.status_logs && statusModalMctf.status_logs.length > 0 && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <h4 style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    Status Audit Trail History
                  </h4>
                  <div style={{ maxHeight: "130px", overflowY: "auto" }}>
                    {statusModalMctf.status_logs.map((log) => (
                      <div key={log.id} style={{ fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "0.3rem", display: "flex", justifyContent: "space-between" }}>
                        <span>
                          <strong>{log.from_status || 'INIT'}</strong> ➔ <strong style={{ color: '#00f0ff' }}>{log.to_status}</strong> ({log.admin_username || 'System'})
                        </span>
                        <span style={{ color: "#94a3b8" }}>{new Date(log.changed_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADMIN PREVIEW MODAL */}
        {previewMctf && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span className="badge" style={{ background: "rgba(255,183,3,0.2)", color: "#ffb703" }}>
                  👁️ ADMIN PREVIEW MODE
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setPreviewMctf(null)}>
                  Close Preview
                </button>
              </div>

              <h2 style={{ color: "#fff", fontSize: "1.75rem" }}>{previewMctf.mini_ctf.title}</h2>
              <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>{previewMctf.mini_ctf.description}</p>

              <h4 style={{ color: "#00f0ff", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                Configured Challenge Sequence ({previewMctf.challenges.length} Targets):
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {previewMctf.challenges.map((c, idx) => (
                  <div key={c.id} style={{ background: "rgba(0,0,0,0.3)", padding: "0.75rem 1rem", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>
                      <strong style={{ color: "#00f0ff" }}>Step {idx + 1}:</strong> {c.title}
                    </span>
                    <span className={`badge difficulty-${c.difficulty}`}>{c.points} PTS</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CREATE / EDIT CHALLENGE MODAL */}
        {showChallengeModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#fff", marginBottom: "1.5rem" }}>
                {editingChallenge ? "Edit Challenge Specification" : "Create New Challenge"}
              </h2>

              <form onSubmit={handleSaveChallenge}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    required
                    value={chForm.title}
                    onChange={(e) => setChForm({ ...chForm, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={chForm.category_id}
                      onChange={(e) => setChForm({ ...chForm, category_id: parseInt(e.target.value) })}
                    >
                      <option value={1}>Web Exploitation</option>
                      <option value={2}>Cryptography</option>
                      <option value={3}>Digital Forensics</option>
                      <option value={4}>OSINT</option>
                      <option value={5}>Reverse Engineering</option>
                      <option value={6}>Binary Exploitation</option>
                      <option value={7}>Steganography</option>
                      <option value={8}>Miscellaneous</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Difficulty</label>
                    <select
                      value={chForm.difficulty}
                      onChange={(e) => setChForm({ ...chForm, difficulty: e.target.value })}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Insane">Insane</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Points</label>
                    <input
                      type="number"
                      required
                      value={chForm.points}
                      onChange={(e) => setChForm({ ...chForm, points: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    required
                    value={chForm.description}
                    onChange={(e) => setChForm({ ...chForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Flag String (Strict Case Match)</label>
                  <input
                    type="text"
                    required
                    value={chForm.flag}
                    onChange={(e) => setChForm({ ...chForm, flag: e.target.value })}
                    style={{ fontFamily: "'Fira Code', monospace" }}
                  />
                </div>

                <div className="form-group">
                  <label>Hints (JSON array of strings)</label>
                  <input
                    type="text"
                    value={chForm.hints}
                    onChange={(e) => setChForm({ ...chForm, hints: e.target.value })}
                    placeholder='["Hint 1 text", "Hint 2 text"]'
                  />
                </div>

                <div className="form-group">
                  <label>Hosted Challenge URL Folder (e.g. p01c01)</label>
                  <input
                    type="text"
                    value={chForm.url}
                    onChange={(e) => setChForm({ ...chForm, url: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowChallengeModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Challenge
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RESET MINI CTF ATTEMPT MODAL */}
        {showResetAttemptsModal && resetAttemptsMctf && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#fff", fontSize: "1.35rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <RotateCcw size={20} style={{ color: "#00f0ff" }} /> Reset Mini CTF Attempt?
              </h2>
              <div style={{ background: "rgba(0,240,255,0.08)", borderLeft: "4px solid #00f0ff", padding: "1rem", borderRadius: "6px", marginBottom: "1.25rem", color: "#e2e8f0", fontSize: "0.88rem", lineHeight: "1.5" }}>
                <strong style={{ color: "#00f0ff" }}>Target Mini CTF: '{resetAttemptsMctf.title}'</strong><br />
                Choose how you want to handle the challenges when restarting this Mini CTF for a new attempt. Previous attempt history, completion times, and user scores remain preserved.
              </div>

              {/* CHALLENGE RESET MODE RADIO OPTIONS */}
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label style={{ color: "#00f0ff", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.6rem", display: "block" }}>
                  Challenge Reset Mode
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", color: "#fff", cursor: "pointer", fontSize: "0.88rem" }}>
                    <input
                      type="radio"
                      name="challengeResetOption"
                      value="all"
                      checked={challengeResetOption === "all"}
                      onChange={(e) => setChallengeResetOption(e.target.value)}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ color: "#00f0ff" }}>Reset All Challenges</strong>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                        Reset all challenges in this Mini CTF to their initial Inspect Challenge / Incomplete state.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", color: "#fff", cursor: "pointer", fontSize: "0.88rem" }}>
                    <input
                      type="radio"
                      name="challengeResetOption"
                      value="keep"
                      checked={challengeResetOption === "keep"}
                      onChange={(e) => setChallengeResetOption(e.target.value)}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ color: "#00ff9d" }}>Keep Current Challenge States</strong>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                        Keep all challenge step states unchanged while restarting the Mini CTF timer.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", color: "#fff", cursor: "pointer", fontSize: "0.88rem" }}>
                    <input
                      type="radio"
                      name="challengeResetOption"
                      value="completed_only"
                      checked={challengeResetOption === "completed_only"}
                      onChange={(e) => setChallengeResetOption(e.target.value)}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ color: "#ffb703" }}>Reset Completed Challenges Only</strong>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                        Reset completed challenges to Inspect Challenge state; keep skipped or unfinished challenges.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* TIMER RESET CONFIGURATION INFO */}
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label style={{ color: "#00f0ff", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem", display: "block" }}>
                  Timer Reset Configuration
                </label>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.83rem", lineHeight: "1.5" }}>
                  {resetAttemptsMctf.time_mode === "time_limited" ? (
                    <>
                      <strong style={{ color: "#ffb703" }}>⏱️ Time-Limited Mode (Countdown):</strong><br />
                      The previous timer, start timestamp, and countdown session will be completely cleared. The remaining time will reset to the full limit ({resetAttemptsMctf.time_limit_minutes || 30} minutes). When a participant starts again, a fresh countdown will begin from {resetAttemptsMctf.time_limit_minutes || 30}:00.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: "#00ff9d" }}>♾️ Normal Mode (Unlimited Time):</strong><br />
                      The start timestamp and elapsed timer session will be completely cleared. When a participant starts again, a fresh count-up timer will begin from 00:00:00.
                    </>
                  )}
                </div>
              </div>

              {/* SCOPE RULE NOTICE BOX */}
              <div style={{ background: "rgba(255,183,3,0.08)", borderLeft: "4px solid #ffb703", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1.25rem", color: "#ffb703", fontSize: "0.8rem", lineHeight: "1.4" }}>
                <strong>Note:</strong> These changes will affect the challenges <strong>only within this Mini CTF</strong> and will not modify their global challenge status or status in other Mini CTFs.
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem", display: "block" }}>Target Status Post-Reset</label>
                <select
                  value={resetAttemptsTargetStatus}
                  onChange={(e) => setResetAttemptsTargetStatus(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#0b0f19", color: "#fff", border: "1px solid rgba(0,240,255,0.3)" }}
                >
                  <option value="Published">Published (Available for participants to start)</option>
                  <option value="Active">Active (In progress competition)</option>
                  <option value="Draft">Draft (Suspended under admin review)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem", display: "block" }}>Administrative Reset Rationale / Reason</label>
                <textarea
                  required
                  rows={3}
                  value={resetAttemptsReason}
                  onChange={(e) => setResetAttemptsReason(e.target.value)}
                  placeholder="State rationale for resetting Mini CTF attempts..."
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#0b0f19", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetAttemptsModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" style={{ background: "linear-gradient(135deg, #00f0ff 0%, #7000ff 100%)", color: "#fff", fontWeight: 700 }} onClick={handleExecuteResetAttempts}>
                  Confirm Reset CTF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
