// tests/stores/auth.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';
import * as AuthService from '../../src/services/auth.service';

// Mock del servicio de autenticación
vi.mock('../../src/services/auth.service', () => ({
  AuthService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  }
}));

// Mock de jwtDecode
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn()
}));

describe('Auth Store v2.0 - Refresh Tokens', () => {
  let authStore;
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    authStore = useAuthStore();

    // Limpiar localStorage antes de cada test
    localStorage.clear();
    sessionStorage.clear();

    // Limpiar mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    authStore.$reset();
  });

  describe('Login', () => {
    it('should handle successful login with refresh tokens', async () => {
      const mockTokens = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 horas
        requiresPasswordChange: false
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(mockTokens);

      await authStore.login({ username: 'testuser', password: 'password123' });

      expect(authStore.accessToken).toBe('access_token_123');
      expect(authStore.refreshToken).toBe('refresh_token_456');
      expect(authStore.expiresAt).toBe(mockTokens.expiresAt);
      expect(authStore.requiresPasswordChange).toBe(false);
      expect(authStore.user?.username).toBe('testuser');
      expect(authStore.user?.role).toBe('User');
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.isAdmin).toBe(false);
    });

    it('should handle login requiring password change', async () => {
      const mockTokens = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
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

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(mockTokens);

      await authStore.login({ username: 'testuser', password: 'password123' });

      expect(authStore.requiresPasswordChange).toBe(true);
    });

    it('should handle admin login', async () => {
      const mockTokens = {
        accessToken: 'access_token_admin',
        refreshToken: 'refresh_token_admin',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        requiresPasswordChange: false
      };

      const mockClaims = {
        nameid: '456',
        unique_name: 'adminuser',
        role: 'Admin',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(mockTokens);

      await authStore.login({ username: 'adminuser', password: 'adminpass' });

      expect(authStore.user?.role).toBe('Admin');
      expect(authStore.isAdmin).toBe(true);
    });

    it('should throw error if no token returned', async () => {
      AuthService.login.mockResolvedValue({});

      await expect(authStore.login({ username: 'test', password: 'test' }))
        .rejects.toThrow('Respuesta de login inválida: falta accessToken');
    });

    it('should persist login data to localStorage', async () => {
      const mockTokens = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
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

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.login.mockResolvedValue(mockTokens);

      await authStore.login({ username: 'testuser', password: 'password123' });

      const stored = JSON.parse(localStorage.getItem('rf_auth'));
      expect(stored.accessToken).toBe('access_token_123');
      expect(stored.refreshToken).toBe('refresh_token_456');
      expect(stored.expiresAt).toBe(mockTokens.expiresAt);
      expect(stored.user.username).toBe('testuser');
    });
  });

  describe('Refresh Token', () => {
    beforeEach(() => {
      // Setup initial state
      authStore.accessToken = 'initial_access_token';
      authStore.refreshToken = 'initial_refresh_token';
      authStore.expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    });

    it('should refresh access token successfully', async () => {
      const newAccessToken = 'new_access_token_789';
      const newExp = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // 8 horas desde ahora

      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: newExp
      };

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.refreshToken.mockResolvedValue({ accessToken: newAccessToken });

      const result = await authStore.refreshAccessToken();

      expect(result).toBe(newAccessToken);
      expect(authStore.accessToken).toBe(newAccessToken);
      expect(authStore.refreshToken).toBe('initial_refresh_token'); // No cambia
      expect(authStore.expiresAt).toBe(new Date(newExp * 1000).toISOString());
    });

    it('should handle concurrent refresh requests', async () => {
      const newAccessToken = 'new_access_token_789';
      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.refreshToken.mockResolvedValue({ accessToken: newAccessToken });

      // Iniciar dos refresh concurrentes
      const refresh1 = authStore.refreshAccessToken();
      const refresh2 = authStore.refreshAccessToken();

      const [result1, result2] = await Promise.all([refresh1, refresh2]);

      // Deberían retornar el mismo resultado
      expect(result1).toBe(newAccessToken);
      expect(result2).toBe(newAccessToken);

      // AuthService.refreshToken debe llamarse solo una vez
      expect(AuthService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should throw error if no refresh token available', async () => {
      authStore.refreshToken = null;

      await expect(authStore.refreshAccessToken())
        .rejects.toThrow('No refresh token available');
    });

    it('should logout if refresh fails', async () => {
      AuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(authStore.refreshAccessToken())
        .rejects.toThrow('Invalid refresh token');

      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
    });
  });

  describe('Token Expiration', () => {
    it('should detect when token should be refreshed', () => {
      // Token que expira en 3 minutos
      const threeMinutesFromNow = Date.now() + 3 * 60 * 1000;
      authStore.expiresAt = new Date(threeMinutesFromNow).toISOString();

      expect(authStore.shouldRefresh).toBe(true);
    });

    it('should not refresh if token has more than 5 minutes', () => {
      // Token que expira en 10 minutos
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
      authStore.expiresAt = new Date(tenMinutesFromNow).toISOString();

      expect(authStore.shouldRefresh).toBe(false);
    });

    it('should detect when token is expired', () => {
      // Token que ya expiró
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      authStore.expiresAt = new Date(oneHourAgo).toISOString();

      expect(authStore.isTokenExpired).toBe(true);
    });

    it('should detect when token is not expired', () => {
      // Token que expira en 1 hora
      const oneHourFromNow = Date.now() + 60 * 60 * 1000;
      authStore.expiresAt = new Date(oneHourFromNow).toISOString();

      expect(authStore.isTokenExpired).toBe(false);
    });
  });

  describe('Load from Storage', () => {
    it('should load new format from localStorage', () => {
      const storedData = {
        accessToken: 'stored_access_token',
        refreshToken: 'stored_refresh_token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        requiresPasswordChange: false,
        user: {
          id: '123',
          username: 'testuser',
          role: 'User',
          tipo: 'Normal'
        }
      };

      const mockClaims = {
        nameid: '123',
        unique_name: 'actual_username',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      localStorage.setItem('rf_auth', JSON.stringify(storedData));

      authStore.loadFromStorage();

      expect(authStore.accessToken).toBe('stored_access_token');
      expect(authStore.refreshToken).toBe('stored_refresh_token');
      expect(authStore.user?.username).toBe('actual_username'); // Usa el del token
      expect(authStore.requiresPasswordChange).toBe(false);
    });

    it('should handle invalid data in localStorage', () => {
      localStorage.setItem('rf_auth', 'invalid_json');

      authStore.loadFromStorage();

      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(authStore.user).toBeNull();
    });

    it('should handle missing accessToken in validation', () => {
      const invalidData = {
        refreshToken: 'refresh_token',
        expiresAt: new Date().toISOString(),
        requiresPasswordChange: false
      };

      localStorage.setItem('rf_auth', JSON.stringify(invalidData));

      authStore.loadFromStorage();

      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should trigger auto-refresh if needed', async () => {
      const storedData = {
        accessToken: 'expiring_soon_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3 minutos
        requiresPasswordChange: false
      };

      const newAccessToken = 'refreshed_access_token';
      const mockClaims = {
        nameid: '123',
        unique_name: 'testuser',
        role: 'User',
        tipo: 'Interno',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
      };

      vi.mocked(jwtDecode).mockReturnValue(mockClaims);
      AuthService.refreshToken.mockResolvedValue({ accessToken: newAccessToken });
      localStorage.setItem('rf_auth', JSON.stringify(storedData));

      authStore.loadFromStorage();

      // Esperar a que se complete el refresh asíncrono
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(authStore.accessToken).toBe(newAccessToken);
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Setup authenticated state
      authStore.accessToken = 'access_token_123';
      authStore.refreshToken = 'refresh_token_456';
      authStore.expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      authStore.user = { username: 'testuser', role: 'User' };
    });

    it('should clear all auth state and call backend logout', async () => {
      await authStore.logout();

      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(authStore.user).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorage.getItem('rf_auth')).toBeNull();

      expect(AuthService.logout).toHaveBeenCalledWith('refresh_token_456');
    });

    it('should handle backend logout error gracefully', async () => {
      AuthService.logout.mockRejectedValue(new Error('Network error'));

      // No debería lanzar error
      await expect(authStore.logout()).resolves.toBeUndefined();

      // Pero debe limpiar el estado local
      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
    });

    it('should clear session storage', () => {
      sessionStorage.setItem('rf_warn_exp', '1');

      authStore.logout();

      expect(sessionStorage.getItem('rf_warn_exp')).toBeNull();
    });

    it('should clear cache entries', () => {
      localStorage.setItem('rf_auth', JSON.stringify({ token: 'test' }));
      localStorage.setItem('rf_fullname_123', 'John Doe');
      localStorage.setItem('rf_fullname_456', 'Jane Smith');
      localStorage.setItem('other_key', 'should_not_be_removed');

      authStore.logout();

      expect(localStorage.getItem('rf_auth')).toBeNull();
      expect(localStorage.getItem('rf_fullname_123')).toBeNull();
      expect(localStorage.getItem('rf_fullname_456')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('should_not_be_removed');
    });
  });

  describe('Change Password', () => {
    beforeEach(() => {
      authStore.accessToken = 'current_access_token';
      authStore.refreshToken = 'current_refresh_token';
      authStore.user = { username: 'testuser', role: 'User' };
    });

    it('should handle password change that requires new login', async () => {
      const result = {
        success: true,
        message: 'Contraseña cambiada exitosamente',
        wasForcedChange: true,
        requiresNewLogin: true
      };

      AuthService.changePassword.mockResolvedValue(result);

      const response = await authStore.changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      });

      expect(response).toEqual(result);
      expect(authStore.accessToken).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should handle password change that does not require new login', async () => {
      const result = {
        success: true,
        message: 'Contraseña cambiada exitosamente',
        wasForcedChange: false,
        requiresNewLogin: false
      };

      AuthService.changePassword.mockResolvedValue(result);

      const response = await authStore.changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      });

      expect(response).toEqual(result);
      expect(authStore.accessToken).toBe('current_access_token');
      expect(authStore.isAuthenticated).toBe(true);
    });
  });
});