import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, ArrowRight, ShieldAlert } from "lucide-react";

const SignUp = () => {
  const history = useHistory();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await register(username, email, password);
      history.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="appPage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="container" style={{ maxWidth: "440px" }}>
        <div className="glass-panel" style={{ padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ background: "rgba(0, 255, 157, 0.1)", display: "inline-flex", padding: "1rem", borderRadius: "50%", color: "#00ff9d", marginBottom: "1rem" }}>
              <UserPlus size={32} />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#fff" }}>Operative Registration</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>Create your account to join XCTF competition arena.</p>
          </div>

          {error && (
            <div style={{ background: "rgba(255, 42, 95, 0.15)", border: "1px solid #ff2a5f", color: "#ff2a5f", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldAlert size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Handle / Username</label>
              <input
                type="text"
                required
                placeholder="cyber_hacker"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                required
                placeholder="hacker@xctf.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem" }} disabled={submitting}>
              {submitting ? "Registering Profile..." : "Register Operative"} <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            Already registered? <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
