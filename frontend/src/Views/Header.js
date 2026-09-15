import React from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Terminal, Trophy, LogOut, Lock, LayoutDashboard, Flag } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const history = useHistory();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    history.push("/");
  };

  return (
    <header className="xctf-header">
      <div className="container nav-container">
        <Link to="/" className="brand">
          <Shield className="brand-glow" size={26} />
          <span>X<span className="brand-glow">CTF</span></span>
          <div className="status-badge" title="Live Competition Engine Active">
            <span className="dot"></span>
            LIVE
          </div>
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              <Terminal size={16} /> Home
            </Link>
          </li>
          <li>
            <Link
              to="/challenges"
              className={location.pathname.startsWith("/challenges") || location.pathname.startsWith("/packages") ? "active" : ""}
            >
              <Flag size={16} /> Challenges
            </Link>
          </li>
          <li>
            <Link
              to="/leaderboard"
              className={location.pathname === "/leaderboard" ? "active" : ""}
            >
              <Trophy size={16} /> Leaderboard
            </Link>
          </li>
          {user && (
            <li>
              <Link
                to="/dashboard"
                className={location.pathname === "/dashboard" ? "active" : ""}
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            </li>
          )}
          {isAdmin && (
            <li>
              <Link
                to="/admin"
                className={`admin-link ${location.pathname.startsWith("/admin") ? "active" : ""}`}
              >
                <Lock size={16} /> Admin Ops
              </Link>
            </li>
          )}
        </ul>

        <div className="user-controls">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Link to="/dashboard" className="user-pill">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.username}
                  className="avatar"
                />
                <div className="user-info">
                  <span className="uname">{user.username}</span>
                  <span className="uscore">{user.score || 0} PTS</span>
                </div>
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
