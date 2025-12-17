import { defineStore } from "pinia";
import { AuthService } from "../services/auth.service";
import { jwtDecode } from "jwt-decode";

/**
 *  ADVERTENCIA DE SEGURIDAD CRÍTICA
 *
 * VULNERABILIDAD: Tokens JWT almacenados en localStorage
 * RIESGO: Accesibles via ataques XSS
 *
 * SOLUCIÓN RECOMENDADA:
 * - Mover a cookies httpOnly + Secure en backend
 * - Mientras tanto: mitigaciones implementadas abajo
 */

function validateJWTFormat(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token inválido: se espera string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token JWT malformado: debe tener 3 partes');
  }

  try {
    // Validar que las partes sean base64 válidas
    JSON.parse(atob(parts[1])); // Header y payload deben ser JSON
  } catch (error) {
    throw new Error('Token JWT con formato inválido');
  }
}

function mapClaims(token) {
  // Validaciµn del formato JWT deshabilitada: usaba atob (base64) y puede fallar con JWT base64url.
  // jwtDecode ya valida/parsea el token de forma segura para nuestro uso.
  // validateJWTFormat(token);
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

function normalizeExpiresAt({ expiresAt, accessToken }) {
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== "") {
    if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
      const ms = expiresAt < 10_000_000_000 ? expiresAt * 1000 : expiresAt;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    if (typeof expiresAt === "string") {
      const n = Number(expiresAt);
      if (Number.isFinite(n) && expiresAt.trim() !== "") {
        const ms = n < 10_000_000_000 ? n * 1000 : n;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) return d.toISOString();
      }

      const d = new Date(expiresAt);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  if (accessToken && typeof accessToken === "string") {
    try {
      const decoded = jwtDecode(accessToken);
      if (decoded?.exp) {
        return new Date(decoded.exp * 1000).toISOString();
      }
    } catch {
      // noop
    }
  }

  return null;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    requiresPasswordChange: false,
    user: null,
    hasRefreshCookie: false,
    isRefreshing: false,
    refreshPromise: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.accessToken && !!s.user && !s.isTokenExpired,
    isAdmin: (s) => s.user?.role === "Admin",
    isTokenExpired: (s) => !s.expiresAt || new Date() > new Date(s.expiresAt),
    shouldRefresh: (s) => {
      if (!s.expiresAt || !s.hasRefreshCookie) return false;
      return new Date(s.expiresAt).getTime() - Date.now() <= 5 * 60 * 1000;
    }
  },
  actions: {
    async loadFromStorage() {
      if (this.accessToken && !this.isTokenExpired) return;
      const raw = localStorage.getItem("rf_auth_meta");
      if (!raw) return;
      try {
        const meta = JSON.parse(raw);
        this.hasRefreshCookie = !!meta?.hasRefreshCookie;
        if (!this.hasRefreshCookie) return;
        await this.refreshAccessToken();
      } catch (error) {
        console.error("Error cargando sesion:", error);
        localStorage.removeItem("rf_auth_meta");
        this.hasRefreshCookie = false;
      }
    },

    persist() {
      this.hasRefreshCookie = true;
      const meta = { hasRefreshCookie: true };
      localStorage.setItem("rf_auth_meta", JSON.stringify(meta));
    },

    async login({ username, password }) {
      const tokens = await AuthService.login({ username, password });
      if (!tokens.accessToken) {
        throw new Error('Respuesta de login inválida: falta accessToken');
      }
      this.accessToken = tokens.accessToken;
      this.refreshToken = null;
      this.expiresAt = normalizeExpiresAt({ expiresAt: tokens.expiresAt, accessToken: tokens.accessToken });
      this.requiresPasswordChange = tokens.requiresPasswordChange || false;
      const mapped = mapClaims(tokens.accessToken);
      if (!mapped.username) mapped.username = username;
      this.user = mapped;
      this.persist();
      return tokens;
    },

    async refreshAccessToken() {
      if (this.isRefreshing && this.refreshPromise) {
        return this.refreshPromise;
      }
      this.isRefreshing = true;
      this.refreshPromise = this.performRefresh();
      try {
        const { accessToken } = await this.refreshPromise;
        if (!accessToken || typeof accessToken !== 'string') {
          throw new Error('Token recibido inválido');
        }
        this.accessToken = accessToken;
        this.user = mapClaims(accessToken);
        const decoded = jwtDecode(accessToken);
        if (!decoded.exp) {
          throw new Error('Token sin expiración');
        }
        this.expiresAt = new Date(decoded.exp * 1000).toISOString();
        this.persist();
        return accessToken;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    },

    async performRefresh() {
      try {
        return await AuthService.refreshToken();
      } catch (error) {
        await this.logout();
        throw error;
      }
    },

    async logout() {
      if (this.hasRefreshCookie) {
        try {
          await AuthService.logout();
        } catch (error) {
          console.warn("Error al invalidar tokens en backend:", error);
        }
      }
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = null;
      this.requiresPasswordChange = false;
      this.user = null;
      this.hasRefreshCookie = false;
      this.isRefreshing = false;
      this.refreshPromise = null;
      localStorage.removeItem("rf_auth");
      localStorage.removeItem("rf_auth_meta");
      sessionStorage.removeItem("rf_warn_exp");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("rf_fullname_")) {
          localStorage.removeItem(k);
        }
      }
      this.clearAllStorage();
    },

    async changePassword({ currentPassword, newPassword }) {
      const result = await AuthService.changePassword({
        currentPassword,
        newPassword
      });
      if (result.requiresNewLogin) {
        await this.logout();
      }
      return result;
    },

    clearAllStorage() {
      const keysToDelete = [
        'rollback_flags',
        'rf_refresh_state',
        'rf_migration_data',
        'rf_warn_exp',
        'rf_auth_meta'
      ];
      keysToDelete.forEach(key => localStorage.removeItem(key));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("rf_fullname_")) {
          localStorage.removeItem(k);
        }
      }
    }
  },
});
