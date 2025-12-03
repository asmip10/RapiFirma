// tests/services/auth.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import api from '../../src/services/api';

// Mock de Axios
vi.mock('../../src/services/api');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should send correct credentials to login endpoint', async () => {
      const mockResponse = {
        data: {
          accessToken: 'test_access_token',
          refreshToken: 'test_refresh_token',
          expiresAt: '2024-12-03T23:00:00Z',
          requiresPasswordChange: false
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.login({
        username: '11111111',
        password: 'Admin#1111'
      });

      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        username: '11111111',
        password: 'Admin#1111'
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle login requiring password change', async () => {
      const mockResponse = {
        data: {
          accessToken: 'test_access_token',
          refreshToken: 'test_refresh_token',
          expiresAt: '2024-12-03T23:00:00Z',
          requiresPasswordChange: true
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.login({
        username: '11111111',
        password: 'Admin#1111'
      });

      expect(result.requiresPasswordChange).toBe(true);
    });

    it('should handle API errors correctly', async () => {
      const errorResponse = {
        status: 400,
        data: {
          type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
          title: "One or more validation errors occurred.",
          status: 400,
          errors: {
            "": ["Credenciales inválidas."]
          }
        }
      };

      api.post.mockRejectedValue({ response: errorResponse });

      await expect(AuthService.login({
        username: 'invalid',
        password: 'invalid'
      })).rejects.toEqual(errorResponse);
    });
  });

  describe('refreshToken', () => {
    it('should send refresh token to refresh endpoint', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new_access_token'
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      const result = await AuthService.refreshToken(refreshToken);

      expect(api.post).toHaveBeenCalledWith('/api/auth/refresh', {
        refreshToken
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle invalid refresh token', async () => {
      const errorResponse = {
        status: 400,
        data: {
          type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
          title: "One or more validation errors occurred.",
          status: 400,
          errors: {
            "": ["Refresh token inválido."]
          }
        }
      };

      api.post.mockRejectedValue({ response: errorResponse });

      await expect(AuthService.refreshToken('invalid_token'))
        .rejects.toEqual(errorResponse);
    });

    it('should not return new refresh token', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new_access_token'
          // Notar: no refreshToken field
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.refreshToken('valid_token');

      expect(result).toEqual({
        accessToken: 'new_access_token'
      });

      expect(result.refreshToken).toBeUndefined();
    });
  });

  describe('logout', () => {
    it('should send refresh token to logout endpoint', async () => {
      const mockResponse = {
        data: {
          message: "Sesión cerrada exitosamente. Todos los tokens han sido invalidados.",
          tokensInvalidated: true
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      const result = await AuthService.logout(refreshToken);

      expect(api.post).toHaveBeenCalledWith('/api/auth/logout', {
        refreshToken
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle invalid refresh token during logout', async () => {
      const errorResponse = {
        status: 400,
        data: {
          type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
          title: "One or more validation errors occurred.",
          status: 400,
          errors: {
            "": ["Refresh token inválido."]
          }
        }
      };

      api.post.mockRejectedValue({ response: errorResponse });

      await expect(AuthService.logout('invalid_token'))
        .rejects.toEqual(errorResponse);
    });

    it('should confirm tokens were invalidated', async () => {
      const mockResponse = {
        data: {
          message: "Sesión cerrada exitosamente. Todos los tokens han sido invalidados.",
          tokensInvalidated: true
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.logout('valid_token');

      expect(result.tokensInvalidated).toBe(true);
      expect(result.message).toContain("invalidados");
    });
  });

  describe('changePassword', () => {
    it('should send password change request with Authorization header', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "Contraseña cambiada exitosamente",
          wasForcedChange: true,
          requiresNewLogin: true
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.changePassword({
        currentPassword: '11111111',
        newPassword: 'NuevaPassword123'
      });

      expect(api.post).toHaveBeenCalledWith('/api/auth/change-password', {
        currentPassword: '11111111',
        newPassword: 'NuevaPassword123'
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle forced password change correctly', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "Contraseña cambiada exitosamente. Por favor inicie sesión nuevamente.",
          wasForcedChange: true,
          requiresNewLogin: true
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.changePassword({
        currentPassword: '11111111',
        newPassword: 'NuevaPassword123'
      });

      expect(result.wasForcedChange).toBe(true);
      expect(result.requiresNewLogin).toBe(true);
      expect(result.message).toContain("inicie sesión nuevamente");
    });

    it('should handle regular password change', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "Contraseña cambiada exitosamente",
          wasForcedChange: false,
          requiresNewLogin: false
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await AuthService.changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass'
      });

      expect(result.wasForcedChange).toBe(false);
      expect(result.requiresNewLogin).toBe(false);
    });

    it('should handle validation errors', async () => {
      const errorResponse = {
        status: 400,
        data: {
          type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
          title: "One or more validation errors occurred.",
          status: 400,
          errors: {
            "": ["El cambio de contraseña solo está permitido después de un reset."]
          }
        }
      };

      api.post.mockRejectedValue({ response: errorResponse });

      await expect(AuthService.changePassword({
        currentPassword: 'invalid',
        newPassword: 'invalid'
      })).rejects.toEqual(errorResponse);
    });

    it('should handle network errors', async () => {
      api.post.mockRejectedValue(new Error('Network error'));

      await expect(AuthService.changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass'
      })).rejects.toThrow('Network error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty credentials gracefully', async () => {
      const errorResponse = {
        status: 400,
        data: {
          errors: {
            username: ['El nombre de usuario es requerido'],
            password: ['La contraseña es requerida']
          }
        }
      };

      api.post.mockRejectedValue({ response: errorResponse });

      await expect(AuthService.login({
        username: '',
        password: ''
      })).rejects.toEqual(errorResponse);
    });

    it('should handle malformed API responses', async () => {
      api.post.mockResolvedValue({
        data: null // Respuesta malformada
      });

      const result = await AuthService.login({
        username: 'test',
        password: 'test'
      });

      expect(result).toBeNull();
    });

    it('should handle missing fields in responses', async () => {
      const incompleteResponse = {
        data: {
          accessToken: 'test_token'
          // Missing refreshToken, expiresAt, requiresPasswordChange
        }
      };

      api.post.mockResolvedValue(incompleteResponse);

      const result = await AuthService.login({
        username: 'test',
        password: 'test'
      });

      expect(result.accessToken).toBe('test_token');
      expect(result.refreshToken).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
      expect(result.requiresPasswordChange).toBeUndefined();
    });
  });
});