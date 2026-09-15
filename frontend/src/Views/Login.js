import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, ArrowRight, ShieldAlert } from "lucide-react";

const Login = () => {
  const history = useHistory();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
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
            <div style={{ background: "rgba(0, 240, 255, 0.1)", display: "inline-flex", padding: "1rem", borderRadius: "50%", color: "#00f0ff", marginBottom: "1rem" }}>
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#fff" }}>Operative Sign In</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>Enter your credentials to access CTF telemetry.</p>
          </div>

          {error && (
            <div style={{ background: "rgba(255, 42, 95, 0.15)", border: "1px solid #ff2a5f", color: "#ff2a5f", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldAlert size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email or Username</label>
              <input
                type="text"
                required
                placeholder="operative@xctf.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem" }} disabled={submitting}>
              {submitting ? "Authenticating..." : "Sign In"} <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            Need an account? <Link to="/signup">Register operative profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
