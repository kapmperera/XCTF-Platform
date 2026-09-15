import React, { createContext, useContext, useState, useEffect } from "react";
import { apiAuth } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", duration = 4000) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const fetchUser = async () => {
    const token = localStorage.getItem("xctf_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiAuth.me();
      setUser(res.data.user);
    } catch (err) {
      console.warn("Auth token invalid or expired:", err.message);
      localStorage.removeItem("xctf_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await apiAuth.login(email, password);
    const { token, user: userData } = res.data;
    localStorage.setItem("xctf_token", token);
    setUser(userData);
    showToast(`Welcome back, agent ${userData.username}!`, "success");
    return userData;
  };

  const register = async (username, email, password) => {
    const res = await apiAuth.register(username, email, password);
    const { token, user: userData } = res.data;
    localStorage.setItem("xctf_token", token);
    setUser(userData);
    showToast(`Account created! Welcome to XCTF, ${userData.username}.`, "success");
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("xctf_token");
    setUser(null);
    showToast("Logged out successfully.", "info");
  };

  const isAdmin = user && user.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser: fetchUser,
        showToast,
        toast
      }}
    >
      {children}
      {toast && (
        <div className={`xctf-toast xctf-toast-${toast.type}`}>
          <div className="xctf-toast-content">
            <span className="xctf-toast-icon">
              {toast.type === "success" && "✅"}
              {toast.type === "error" && "⚠️"}
              {toast.type === "info" && "ℹ️"}
            </span>
            <span className="xctf-toast-msg">{toast.message}</span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
