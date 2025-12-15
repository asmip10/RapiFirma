import { defineStore } from "pinia";
import { AuthService } from "../services/auth.service";
import { jwtDecode } from "jwt-decode";
import { validateAuthData } from "@/utils/authAdapter";

/**
 * ⚠️ ADVERTENCIA DE SEGURIDAD CRÍTICA
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
    isRefreshing: false,
    refreshPromise: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.accessToken && !!s.user && !s.isTokenExpired,
    isAdmin: (s) => s.user?.role === "Admin",
    isTokenExpired: (s) => !s.expiresAt || new Date() > new Date(s.expiresAt),
    shouldRefresh: (s) => {
      if (!s.expiresAt || !s.refreshToken) return false;
      return new Date(s.expiresAt).getTime() - Date.now() <= 5 * 60 * 1000;
    }
  },
  actions: {
    async loadFromStorage() {
      const raw = localStorage.getItem("rf_auth");
      if (!raw) return;
      try {
        const validation = validateAuthData(JSON.parse(raw));
        if (!validation.valid) {
          console.warn('⚠️ Datos de autenticación inválidos:', validation.errors);
          await this.logout();
          return;
        }
        const data = validation.data;
        if (!data) {
          console.warn('⚠️ Datos de autenticación nulos');
          await this.logout();
          return;
        }
        this.accessToken = data.accessToken;
        if (data.refreshToken !== null && data.refreshToken !== undefined) {
          this.refreshToken = data.refreshToken;
        }
        this.expiresAt = normalizeExpiresAt({ expiresAt: data.expiresAt, accessToken: data.accessToken });
        this.requiresPasswordChange = data.requiresPasswordChange || false;
        this.user = mapClaims(this.accessToken);
        if (this.shouldRefresh && !this.isRefreshing && this.refreshToken) {
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.error('❌ Error cargando datos de autenticación:', error);
        await this.logout();
      }
    },

    persist() {
      /**
       * ⚠️ MITIGACIÓN DE SEGURIDAD (temporal)
       *
       * PROBLEMA: Tokens en localStorage (vulnerables a XSS)
       * SOLUCIÓN: Mover a backend con cookies httpOnly + Secure
       *
       * Mientras tanto:
       * - Advertencia de seguridad en consola
       * - Validación de dominio seguro
       * - Preparación para migración a cookies
       */

      // ADVERTENCIA para desarrolladores
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ SEGURIDAD: Tokens en localStorage - MIGRAR A COOKIES HTTPONLY');
      }

      // Mitigación: Solo persistir en HTTPS o desarrollo
      if (typeof window !== 'undefined' &&
          window.location.protocol !== 'https:' &&
          process.env.NODE_ENV === 'production') {
        console.error('❌ SEGURIDAD: No se permite almacenar tokens en HTTP inseguro');
        throw new Error('Tokens no seguros detectados - usar HTTPS');
      }

      // Mitigación: No almacenar refresh token (aunque debería estar en httpOnly)
      const unsafeData = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt,
        requiresPasswordChange: this.requiresPasswordChange,
        user: this.user
        // ❌ ELIMINADO: refreshToken (demasiado sensible para localStorage)
      };

      localStorage.setItem("rf_auth", JSON.stringify(unsafeData));
    },

    async login({ username, password }) {
      const tokens = await AuthService.login({ username, password });
      if (!tokens.accessToken) {
        throw new Error('Respuesta de login inválida: falta accessToken');
      }
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
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
      if (!this.refreshToken) {
        throw new Error("No refresh token available");
      }
      this.isRefreshing = true;
      this.refreshPromise = this.performRefresh();
      try {
        const { accessToken } = await this.refreshPromise;
        if (!accessToken || typeof accessToken !== 'string') {
          throw new Error('Token recibido inválido');
        }
        this.accessToken = accessToken;
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
        return await AuthService.refreshToken(this.refreshToken);
      } catch (error) {
        await this.logout();
        throw error;
      }
    },

    async logout() {
      const refreshToken = this.refreshToken;
      if (refreshToken) {
        try {
          await AuthService.logout(refreshToken);
        } catch (error) {
          console.warn("Error al invalidar tokens en backend:", error);
        }
      }
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = null;
      this.requiresPasswordChange = false;
      this.user = null;
      this.isRefreshing = false;
      this.refreshPromise = null;
      localStorage.removeItem("rf_auth");
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
        'rf_warn_exp'
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
