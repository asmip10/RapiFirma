// src/stores/auth.js
import { defineStore } from "pinia";
import { AuthService } from "../services/auth.service";
import { jwtDecode } from "jwt-decode";
import { isFeatureEnabled } from "@/config/featureFlags";
import { authCompatibility, validateAuthData, MIGRATION_STATES } from "@/utils/authAdapter";

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
    // Nueva estructura de tokens
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    requiresPasswordChange: false,
    user: null,

    // Estado de refresh
    isRefreshing: false,
    refreshPromise: null, // Para evitar múltiples refresh concurrentes

    // Compatibilidad temporal con código antiguo
    token: null, // Se mantendrá sincronizado con accessToken
  }),
  getters: {
    isAuthenticated: (s) => {
      // Check con feature flags
      if (isFeatureEnabled('REFRESH_TOKEN_ENABLED')) {
        return !!s.accessToken && !!s.user && !s.isTokenExpired;
      }
      // Fallback a legacy
      return !!s.token && !!s.user;
    },
    isAdmin: (s) => s.user?.role === "Admin",
    tokenExpiry: (s) => s.expiresAt ? new Date(s.expiresAt).getTime() : null,
    isTokenExpired: (s) => {
      if (!s.expiresAt) return true;
      return new Date() > new Date(s.expiresAt);
    },
    shouldRefresh: (s) => {
      if (!isFeatureEnabled('AUTO_REFRESH_ENABLED')) return false;
      if (!s.expiresAt || !s.refreshToken) return false;

      const now = new Date();
      const expires = new Date(s.expiresAt);
      const diff = expires.getTime() - now.getTime();

      // Refresh configurable por feature flags
      const refreshWindow = isFeatureEnabled('ENHANCED_SECURITY_ENABLED') ? 10 * 60 * 1000 : 5 * 60 * 1000;
      return diff <= refreshWindow;
    },
    // Nuevos getters para feature flags
    canUseRefreshTokens: () => isFeatureEnabled('REFRESH_TOKEN_ENABLED'),
    requiresPasswordChangeEnabled: () => isFeatureEnabled('FORCED_PASSWORD_CHANGE_ENABLED'),
    hasEnhancedSecurity: () => isFeatureEnabled('ENHANCED_SECURITY_ENABLED'),
  },
  actions: {
    async loadFromStorage() {
      const raw = localStorage.getItem("rf_auth");
      if (!raw) return;

      try {
        // Validar y sanitizar datos primero
        const validation = validateAuthData(JSON.parse(raw));
        if (!validation.valid) {
          console.warn('⚠️ Datos de autenticación inválidos:', validation.errors);
          this.logout();
          return;
        }

        const data = validation.sanitized;

        // Auto-migración si está habilitada
        if (isFeatureEnabled('MIGRATION_MODE_ENABLED')) {
          const migrationResult = await authCompatibility.ensureCompatibility();
          if (!migrationResult.success && migrationResult.error) {
            console.warn('⚠️ Error en migración:', migrationResult.error);
          }
        }

        // Compatibilidad: si vienen los datos antiguos, adaptar
        if (data.token && !data.accessToken) {
          this.accessToken = data.token;
          this.refreshToken = null;
          this.expiresAt = null;
          this.requiresPasswordChange = false;
          this.token = data.token; // Mantener compatibilidad
        } else {
          // Nueva estructura
          this.accessToken = data.accessToken;
          this.refreshToken = data.refreshToken;
          this.expiresAt = data.expiresAt;
          this.requiresPasswordChange = data.requiresPasswordChange || false;
          this.token = data.accessToken; // Mantener compatibilidad
        }

        const mapped = mapClaims(this.accessToken);
        if (!mapped.username && data.usernameFallback) {
          mapped.username = data.usernameFallback;
        }
        this.user = mapped;

        // Verificar si necesita refresh automático (con feature flags)
        if (this.shouldRefresh && !this.isRefreshing && this.refreshToken) {
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.error('❌ Error cargando datos de autenticación:', error);
        this.logout();
      }
    },

    persist(usernameFallback) {
      localStorage.setItem("rf_auth", JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt,
        requiresPasswordChange: this.requiresPasswordChange,
        usernameFallback,
        token: this.accessToken // Mantener compatibilidad
      }));
    },

    async login({ username, password }) {
      // Verificar feature flag antes de login
      if (!isFeatureEnabled('REFRESH_TOKEN_ENABLED')) {
        throw new Error('Login con refresh tokens no está habilitado');
      }

      const tokens = await AuthService.login({ username, password });

      // Validar respuesta
      if (!tokens.accessToken) {
        throw new Error('Respuesta de login inválida: falta accessToken');
      }

      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.expiresAt = tokens.expiresAt;
      this.requiresPasswordChange = tokens.requiresPasswordChange || false;
      this.token = tokens.accessToken; // Mantener compatibilidad

      const mapped = mapClaims(tokens.accessToken);
      if (!mapped.username) mapped.username = username;
      this.user = mapped;

      this.persist(username);
      return tokens;
    },

    async refreshAccessToken() {
      // Verificar feature flags
      if (!isFeatureEnabled('REFRESH_TOKEN_ENABLED') || !isFeatureEnabled('AUTO_REFRESH_ENABLED')) {
        return this.accessToken;
      }

      // Prevención de concurrencia con feature flag
      if (isFeatureEnabled('CONCURRENT_REFRESH_PREVENTION')) {
        if (this.isRefreshing && this.refreshPromise) {
          return this.refreshPromise;
        }
      }

      if (!this.refreshToken) {
        throw new Error("No refresh token available");
      }

      this.isRefreshing = true;
      this.refreshPromise = this.performRefresh();

      try {
        const { accessToken } = await this.refreshPromise;

        // Validar nuevo token
        if (!accessToken || typeof accessToken !== 'string') {
          throw new Error('Token recibido inválido');
        }

        this.accessToken = accessToken;
        this.token = accessToken; // Mantener compatibilidad

        // Actualizar expiresAt del nuevo access token
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
        // Refresh falló: limpiar y forzar logout
        this.logout();
        throw error;
      }
    },

    async logout() {
      const refreshToken = this.refreshToken;

      // Intentar invalidar en backend
      if (refreshToken) {
        try {
          await AuthService.logout(refreshToken);
        } catch (error) {
          console.warn("Error al invalidar tokens en backend:", error);
        }
      }

      // Limpiar estado local
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = null;
      this.requiresPasswordChange = false;
      this.user = null;
      this.token = null; // Mantener compatibilidad
      this.isRefreshing = false;
      this.refreshPromise = null;

      localStorage.removeItem("rf_auth");
      sessionStorage.removeItem("rf_warn_exp");

      // Limpiar caché relacionado
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("rf_fullname_")) {
          localStorage.removeItem(k);
        }
      }
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
    }
  },
});
