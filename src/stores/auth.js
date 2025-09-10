// src/stores/auth.js
import { defineStore } from "pinia";
import { AuthService } from "../services/auth.service";
import { jwtDecode } from "jwt-decode";

function mapClaims(token) {
  const c = jwtDecode(token) || {};
  const pick = (...keys) => keys.map(k => c[k]).find(v => v !== undefined && v !== null);
  return {
    id: pick("nameid", "sub", "userid", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"),
    username: pick("unique_name", "name", "username", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"),
    role: pick("role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"),
    tipo: pick("tipo", "Tipo", "user_tipo"),
    exp: pick("exp"),
    _raw: c,
  };
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === "Admin",
  },
  actions: {
    loadFromStorage() {
      const raw = localStorage.getItem("rf_auth");
      if (!raw) return;
      try {
        const { token, usernameFallback } = JSON.parse(raw) || {};
        if (!token) return;
        this.token = token;
        const mapped = mapClaims(token);
        // ⬇️ si el token NO trae username, usa el que guardamos al iniciar sesión
        if (!mapped.username && usernameFallback) mapped.username = usernameFallback;
        this.user = mapped;
      } catch {
        this.logout();
      }
    },
    persist(usernameFallback) {
      // guarda también el username usado al loguear, por si el token no lo trae
      localStorage.setItem("rf_auth", JSON.stringify({ token: this.token, usernameFallback }));
    },
    async login({ username, password }) {
      const { token } = await AuthService.login({ username, password });
      if (!token) throw new Error("Sin token");
      this.token = token;
      const mapped = mapClaims(token);
      if (!mapped.username) mapped.username = username; // ⬅️ fallback inmediato
      this.user = mapped;
      this.persist(username); // ⬅️ guarda el username para futuros reloads
      // console.log("[claims]", this.user); // debug opcional
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("rf_auth");
      // 🔥 borra todos los caches rf_fullname_*
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("rf_fullname_")) localStorage.removeItem(k);
      }
      // y el aviso de expiración si lo usas
      sessionStorage.removeItem("rf_warn_exp");
    }
  },
});
