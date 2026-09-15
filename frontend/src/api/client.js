import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("xctf_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified Error Formatter
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response && error.response.data && error.response.data.error
        ? error.response.data.error
        : "An unexpected network or server error occurred.";
    return Promise.reject(new Error(message));
  }
);

export const apiAuth = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (username, email, password) => api.post("/auth/register", { username, email, password }),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data)
};

export const apiChallenges = {
  list: (params) => api.get("/challenges", { params }),
  get: (id) => api.get(`/challenges/${id}`),
  submitFlag: (id, flag) => api.post(`/challenges/${id}/submit`, { flag })
};

export const apiLeaderboard = {
  get: (params) => api.get("/leaderboard", { params })
};

export const apiDashboard = {
  getStats: () => api.get("/dashboard/stats")
};

export const apiMiniCtfs = {
  list: () => api.get("/mini-ctfs"),
  get: (id) => api.get(`/mini-ctfs/${id}`),
  start: (id) => api.post(`/mini-ctfs/${id}/start`),
  updateStep: (id, challenge_id, action) => api.post(`/mini-ctfs/${id}/step`, { challenge_id, action }),
  submitFlag: (id, challenge_id, flag) => api.post(`/mini-ctfs/${id}/submit-flag`, { challenge_id, flag }),
  getResults: (id) => api.get(`/mini-ctfs/${id}/results`),
  getLeaderboard: (id) => api.get(`/mini-ctfs/${id}/leaderboard`)
};

export const apiAdmin = {
  getOverview: () => api.get("/admin/overview"),
  getChallenges: () => api.get("/admin/challenges"),
  createChallenge: (data) => api.post("/admin/challenges", data),
  updateChallenge: (id, data) => api.put(`/admin/challenges/${id}`, data),
  deleteChallenge: (id) => api.delete(`/admin/challenges/${id}`),
  getUsers: () => api.get("/admin/users"),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  toggleUserBan: (id, is_banned) => api.put(`/admin/users/${id}/ban`, { is_banned }),
  updateConfig: (data) => api.post("/admin/config", data),
  getCategories: () => api.get("/admin/categories"),
  createCategory: (data) => api.post("/admin/categories", data),
  getMiniCtfs: () => api.get("/admin/mini-ctfs"),
  createMiniCtf: (data) => api.post("/admin/mini-ctfs", data),
  updateMiniCtf: (id, data) => api.put(`/admin/mini-ctfs/${id}`, data),
  updateMiniCtfStatus: (id, status, reason) => api.put(`/admin/mini-ctfs/${id}/status`, { status, reason }),
  deleteMiniCtf: (id) => api.delete(`/admin/mini-ctfs/${id}`),
  previewMiniCtf: (id) => api.get(`/admin/mini-ctfs/${id}/preview`),
  resetChallengeReview: (id, reason) => api.put(`/admin/challenges/${id}/reset-review`, { reason }),
  activateChallenge: (id, reason) => api.put(`/admin/challenges/${id}/activate`, { reason }),
  resetMiniCtfReview: (id, reason) => api.put(`/admin/mini-ctfs/${id}/reset-review`, { reason }),
  resetMiniCtfAttempts: (id, reason, target_status, challenge_reset_option) => api.post(`/admin/mini-ctfs/${id}/reset-attempts`, { reason, target_status, challenge_reset_option }),
  resetParticipantProgress: (data) => api.post("/admin/reset/participant-progress", data),
  revertChallengeToInspect: (id, data) => api.post(`/admin/challenges/${id}/revert-to-inspect`, data || {}),
  getResetLogs: () => api.get("/admin/reset-logs")
};

export const apiPlatform = {
  getInfo: () => api.get("/info")
};

export default api;
