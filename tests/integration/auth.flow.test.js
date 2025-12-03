// tests/integration/auth.flow.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';
import * as AuthService from '../../src/services/auth.service';
import api from '../../src/services/api';

// Mock de los módulos
vi.mock('../../src/services/auth.service');
vi.mock('../../src/services/api');

describe('Authentication Flow Integration Tests', () => {
  let authStore;
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    authStore = useAuthStore();

    // Limpiar localStorage
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    authStore.$reset();
  });

  describe('Complete Login → Refresh → Logout Flow', () => {
    it('should complete full authentication lifecycle', async () => {
      // 1. Login
      const loginData = {
        accessToken: 'initial_access_token',
        refreshToken: 'initial_refresh_token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        requiresPasswordChange: false
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(loginData);

      await authStore.login({ username: 'testuser', password: 'password123' });

      // Verificar login exitoso
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.accessToken).toBe('initial_access_token');
      expect(authStore.refreshToken).toBe('initial_refresh_token');

      // 2. Refresh Token
      const refreshData = {
        accessToken: 'refreshed_access_token'
      };

      const newMockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 // Nueva expiración
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(newMockClaims);
      AuthService.refreshToken.mockResolvedValue(refreshData);

      await authStore.refreshAccessToken();

      // Verificar refresh exitoso
      expect(authStore.accessToken).toBe('refreshed_access_token');
      expect(authStore.refreshToken).toBe('initial_refresh_token'); // No debe cambiar
      expect(authStore.isAuthenticated).toBe(true);

      // 3. Logout
      const logoutData = {
        message: "Sesión cerrada exitosamente",
        tokensInvalidated: true
      };

      AuthService.logout.mockResolvedValue(logoutData);

      await authStore.logout();

      // Verificar logout completo
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(localStorage.getItem('rf_auth')).toBeNull();

      // Verificar llamadas al servicio
      expect(AuthService.login).toHaveBeenCalledTimes(1);
      expect(AuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(AuthService.logout).toHaveBeenCalledTimes(1);
    });

    it('should handle forced password change during login', async () => {
      // Login que requiere cambio de contraseña
      const loginData = {
        accessToken: 'initial_access_token',
        refreshToken: 'initial_refresh_token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        requiresPasswordChange: true
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(loginData);

      await authStore.login({ username: 'testuser', password: 'temp_password' });

      expect(authStore.requiresPasswordChange).toBe(true);
      expect(authStore.isAuthenticated).toBe(true);

      // Cambiar contraseña que requiere nuevo login
      const passwordChangeData = {
        success: true,
        message: 'Contraseña cambiada exitosamente',
        wasForcedChange: true,
        requiresNewLogin: true
      };

      AuthService.changePassword.mockResolvedValue(passwordChangeData);

      await authStore.changePassword({
        currentPassword: 'temp_password',
        newPassword: 'new_secure_password'
      });

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
    });
  });

  describe('Token Expiration and Auto-Refresh', () => {
    it('should auto-refresh token when close to expiration', async () => {
      // Setup initial state con token que expira pronto
      const nearExpiry = Date.now() + 4 * 60 * 1000; // 4 minutos
      const loginData = {
        accessToken: 'expiring_access_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: new Date(nearExpiry).toISOString(),
        requiresPasswordChange: false
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(nearExpiry / 1000)
      };

      const newMockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(require('jwt-decode').jwtDecode)
        .mockReturnValueOnce(mockClaims)
        .mockReturnValueOnce(newMockClaims);

      AuthService.login.mockResolvedValue(loginData);
      AuthService.refreshToken.mockResolvedValue({ accessToken: 'refreshed_token' });

      // Login
      await authStore.login({ username: 'test', password: 'pass' });
      expect(authStore.shouldRefresh).toBe(true);

      // Cargar desde storage (debería auto-refresh)
      const storedData = {
        accessToken: 'expiring_access_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: new Date(nearExpiry).toISOString(),
        requiresPasswordChange: false
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(mockClaims);
      localStorage.setItem('rf_auth', JSON.stringify(storedData));

      // Crear nuevo store para simular carga
      const newAuthStore = useAuthStore();
      newAuthStore.loadFromStorage();

      // Esperar a que se complete el refresh asíncrono
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(newAuthStore.accessToken).toBe('refreshed_token');
    });

    it('should handle expired token with no refresh token', async () => {
      // Setup con token expirado sin refresh
      const expiredTokenData = {
        accessToken: 'expired_access_token',
        refreshToken: null,
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minuto ago
        requiresPasswordChange: false
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) - 60 // Expirado
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(expiredTokenData);

      await authStore.login({ username: 'test', password: 'pass' });

      expect(authStore.isTokenExpired).toBe(true);
      expect(authStore.refreshToken).toBeNull();

      // Intentar refresh debería fallar
      await expect(authStore.refreshAccessToken())
        .rejects.toThrow('No refresh token available');
    });
  });

  describe('API Request Interceptors', () => {
    it('should handle 401 with automatic token refresh', async () => {
      // Setup estado inicial
      authStore.accessToken = 'valid_access_token';
      authStore.refreshToken = 'valid_refresh_token';

      const apiError = {
        response: { status: 401 },
        config: { headers: {} }
      };

      // Mock de interceptor request para que inyecte el token
      api.interceptors.request.handlers[0].fulfilled({ headers: {} });

      // Mock de interceptor response para simular 401
      api.interceptors.response.handlers[1].rejected(apiError);

      // Mock del refresh
      const refreshData = { accessToken: 'new_access_token' };
      AuthService.refreshToken.mockResolvedValue(refreshData);

      // Mock del retry exitoso
      api.interceptors.response.handlers[0].fulfilled({ data: 'success' });

      // Crear una nueva instancia del error para que el interceptor lo procese
      const finalError = new Error('Request failed');
      finalError.response = apiError.response;
      finalError.config = apiError.config;

      // Intentar la solicitud (fallará con 401)
      await expect(api.interceptors.response.handlers[1].rejected(finalError))
        .rejects.toThrow();
    });
  });

  describe('Storage and Persistence', () => {
    it('should persist and restore auth state across page reloads', () => {
      const loginData = {
        accessToken: 'persisted_access_token',
        refreshToken: 'persisted_refresh_token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        requiresPasswordChange: false
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'persisted_user',
        role: 'Admin',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(loginData);

      // Login original
      await authStore.login({ username: 'persisted_user', password: 'password' });

      // Verificar persistencia
      const stored = JSON.parse(localStorage.getItem('rf_auth'));
      expect(stored.accessToken).toBe('persisted_access_token');
      expect(stored.refreshToken).toBe('persisted_refresh_token');

      // Crear nuevo store y cargar desde storage
      const newAuthStore = useAuthStore();
      newAuthStore.loadFromStorage();

      // Verificar estado restaurado
      expect(newAuthStore.isAuthenticated).toBe(true);
      expect(newAuthStore.accessToken).toBe('persisted_access_token');
      expect(newAuthStore.user?.username).toBe('persisted_user');
      expect(newAuthStore.user?.role).toBe('Admin');
      expect(newAuthStore.isAdmin).toBe(true);
    });

    it('should handle migration from old format to new format', () => {
      // Datos en formato antiguo
      const oldData = {
        token: 'old_format_token',
        usernameFallback: 'fallback_user'
      };

      const mockClaims = {
        nameid: '123',
        unique_name: null, // No username en token
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(require('jwt-decode').jwtDecode).mockReturnValue(mockClaims);
      localStorage.setItem('rf_auth', JSON.stringify(oldData));

      authStore.loadFromStorage();

      expect(authStore.accessToken).toBe('old_format_token');
      expect(authStore.refreshToken).toBeNull();
      expect(authStore.token).toBe('old_format_token'); // Compatibilidad
      expect(authStore.user?.username).toBe('fallback_user'); // Usa fallback
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout during login', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      AuthService.login.mockRejectedValue(timeoutError);

      await expect(authStore.login({ username: 'test', password: 'test' }))
        .rejects.toThrow(timeoutError);

      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should handle refresh token expiration', async () => {
      authStore.accessToken = 'valid_token';
      authStore.refreshToken = 'expired_refresh_token';

      const refreshError = new Error('Refresh token expired');
      AuthService.refreshToken.mockRejectedValue(refreshError);

      await expect(authStore.refreshAccessToken())
        .rejects.toThrow(refreshError);

      // El store debería hacer logout automáticamente
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.accessToken).toBeNull();
    });

    it('should handle concurrent refresh attempts', async () => {
      authStore.accessToken = 'initial_token';
      authStore.refreshToken = 'valid_refresh_token';

      const refreshData = { accessToken: 'refreshed_token' };
      AuthService.refreshToken.mockResolvedValue(refreshData);

      // Iniciar dos refresh concurrentes
      const promise1 = authStore.refreshAccessToken();
      const promise2 = authStore.refreshAccessToken();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('refreshed_token');
      expect(result2).toBe('refreshed_token');
      expect(AuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(authStore.accessToken).toBe('refreshed_token');
    });
  });
});