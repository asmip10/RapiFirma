// src/services/auth.service.js
import api from "./api";

export const AuthService = {
  async login({ username, password }) {
    // Backend: POST /api/auth/login -> { token }
    const { data } = await api.post("/api/auth/login", { username, password });
    return data;
  },
};
