// src/services/auth.service.js
import api from "./api";

export const AuthService = {
  async login({ username, password }) {
    // Backend: POST /api/auth/login -> { accessToken, refreshToken, expiresAt, requiresPasswordChange }
    const { data } = await api.post("/api/auth/login", { username, password });
    return data;
  },

  async refreshToken(refreshToken) {
    // Backend: POST /api/auth/refresh -> { accessToken }
    const payload = refreshToken ? { refreshToken } : {};
    const { data } = await api.post("/api/auth/refresh", payload);
    return data;
  },

  async logout(refreshToken) {
    // Backend: POST /api/auth/logout -> { message, tokensInvalidated }
    const payload = refreshToken ? { refreshToken } : {};
    const { data } = await api.post("/api/auth/logout", payload);
    return data;
  },

  async changePassword({ newPassword }) {
    // Backend: POST /api/auth/change-password -> { success, message, wasForcedChange, requiresNewLogin }
    const { data } = await api.post("/api/auth/change-password", {
      newPassword
    });
    return data;
  }
};
