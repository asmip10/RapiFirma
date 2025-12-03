// tests/e2e/auth.spec.js
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page';
import { DashboardPage } from '../pages/dashboard-page';

test.describe('Authentication E2E Tests', () => {
  let authPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);

    // Limpiar localStorage antes de cada test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test.describe('Login Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      // Mock del backend API
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'test_access_token_' + Date.now(),
            refreshToken: 'test_refresh_token_' + Date.now(),
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      await page.goto('/login');

      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Esperar a que se cargue el dashboard
      await expect(page).toHaveURL('/');
      await expect(dashboardPage.getWelcomeMessage()).toBeVisible();

      // Verificar que los tokens se guardaron
      const stored = await page.evaluate(() => localStorage.getItem('rf_auth'));
      const parsed = JSON.parse(stored);

      expect(parsed.accessToken).toBeTruthy();
      expect(parsed.refreshToken).toBeTruthy();
      expect(parsed.expiresAt).toBeTruthy();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            title: "One or more validation errors occurred.",
            status: 400,
            errors: {
              "": ["Credenciales inválidas."]
            }
          })
        });
      });

      await page.goto('/login');

      await authPage.fillCredentials('11111111', 'wrongpassword');
      await authPage.submitLogin();

      await expect(authPage.getErrorMessage()).toBeVisible();
      await expect(authPage.getErrorMessage()).toContain('Credenciales inválidas');
      expect(page).toHaveURL('/login');
    });

    test('should redirect to change password when required', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'test_access_token',
            refreshToken: 'test_refresh_token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: true
          })
        });
      });

      await page.goto('/login');

      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      await expect(page).toHaveURL('/change-password');
      await expect(page.locator('h2')).toContainText('Cambiar Contraseña');
    });

    test('should preserve original destination URL', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'test_access_token',
            refreshToken: 'test_refresh_token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      // Intentar acceder a una ruta protegida
      await page.goto('/admin/users?filter=active');

      // Debería redirigir a login con la URL original
      await expect(page).toHaveURL(/\/login\?r=.+/);

      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Después del login, debería redirigir a la URL original
      await expect(page).toHaveURL('/admin/users?filter=active');
    });
  });

  test.describe('Change Password Flow', () => {
    test('should change password successfully', async ({ page }) => {
      // Mock del login y cambio de contraseña
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'test_access_token',
            refreshToken: 'test_refresh_token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: true
          })
        });
      });

      await page.route('/api/auth/change-password', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "Contraseña cambiada exitosamente",
            wasForcedChange: true,
            requiresNewLogin: true
          })
        });
      });

      await page.goto('/login');

      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Debería estar en change password
      await expect(page).toHaveURL('/change-password');

      // Llenar formulario de cambio de contraseña
      await page.fill('input[placeholder*="Ingresa tu contraseña actual"]', 'Admin#1111');
      await page.fill('input[placeholder*="Ingresa tu nueva contraseña"]', 'NewSecurePassword123');
      await page.fill('input[placeholder*="Confirma tu nueva contraseña"]', 'NewSecurePassword123');

      await page.click('button:has-text("Cambiar Contraseña")');

      // Esperar mensaje de éxito
      await expect(page.locator('.bg-green-50')).toBeVisible();
      await expect(page.locator('.bg-green-50')).toContainText('cambiada exitosamente');

      // Esperar redirección a login
      await page.waitForURL('/login');
      expect(page).toHaveURL('/login');
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/change-password');

      // Contraseñas no coinciden
      await page.fill('input[placeholder*="Ingresa tu nueva contraseña"]', 'Password123');
      await page.fill('input[placeholder*="Confirma tu nueva contraseña"]', 'Different456');
      await page.click('button:has-text("Cambiar Contraseña")');

      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.bg-red-50')).toContainText('no coinciden');

      // Contraseña muy corta
      await page.fill('input[placeholder*="Ingresa tu nueva contraseña"]', '123');
      await page.fill('input[placeholder*="Confirma tu nueva contraseña"]', '123');
      await page.click('button:has-text("Cambiar Contraseña")');

      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.bg-red-50')).toContainText('al menos 6 caracteres');
    });

    test('should handle password change error', async ({ page }) => {
      await page.route('/api/auth/change-password', (route) => {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            title: "One or more validation errors occurred.",
            status: 400,
            errors: {
              "": ["Credenciales inválidas para cambio de contraseña"]
            }
          })
        });
      });

      await page.goto('/change-password');

      await page.fill('input[placeholder*="Ingresa tu contraseña actual"]', 'wrongpass');
      await page.fill('input[placeholder*="Ingresa tu nueva contraseña"]', 'NewPass123');
      await page.fill('input[placeholder*="Confirma tu nueva contraseña"]', 'NewPass123');

      await page.click('button:has-text("Cambiar Contraseña")');

      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.bg-red-50')).toContainText('Credenciales inválidas');
    });
  });

  test.describe('Token Refresh', () => {
    test('should refresh token automatically before expiration', async ({ page }) => {
      let refreshCount = 0;

      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'expiring_access_token',
            refreshToken: 'test_refresh_token',
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(), // 4 minutos
            requiresPasswordChange: false
          })
        });
      });

      await page.route('/api/auth/refresh', (route) => {
        refreshCount++;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: `refreshed_token_${refreshCount}`,
          })
        });
      });

      // Mock API request para datos protegidos
      await page.route('/api/user/profile', (route) => {
        const token = route.request.headers().authorization;

        if (refreshCount > 0 && token.includes('expiring_access_token')) {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        }

        if (token.includes('refreshed_token_1')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ user: { name: 'Test User' } })
          });
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { name: 'Test User' } })
        });
      });

      // Login con token que expira pronto
      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Navegarar a página que requiere datos del usuario
      await page.goto('/dashboard');

      // Esperar a que se complete el refresh
      await page.waitForTimeout(2000);

      // Verificar que el refresh se realizó
      expect(refreshCount).toBe(1);

      // Verificar que podemos acceder a datos protegidos
      const response = await page.evaluate(async () => {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': 'Bearer ' + window.localStorage.getItem('access_token')
          }
        });
        return response.json();
      });

      expect(response.user.name).toBe('Test User');
    });

    test('should show loading state during refresh', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'expiring_access_token',
            refreshToken: 'test_refresh_token',
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      await page.route('/api/auth/refresh', (route) => {
        // Simular delay para mostrar loading
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                accessToken: 'refreshed_token'
              })
            });
          }, 1000); // 1 segundo de delay
        });
      });

      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Esperar a que aparezca el loading overlay
      await expect(page.locator('.fixed.top-0:has-text("Renovando")')).toBeVisible();

      // El loading debería desaparecer
      await expect(page.locator('.fixed.top-0:has-text("Renovando")')).not.toBeVisible();
    });
  });

  test.describe('Session Expiration', () => {
    test('should handle expired refresh token gracefully', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'access_token',
            refreshToken: 'expiring_refresh_token',
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      await page.route('/api/auth/refresh', (route) => {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: {
              "": ["Refresh token inválido"]
            }
          })
        });
      });

      await page.route('/api/user/profile', (route) => {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' })
        });
      });

      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Esperar a que el token expire (simulado por el API)
      await page.waitForTimeout(5000);

      // Intentar acceder a página protegida
      await page.goto('/dashboard');

      // Debería mostrar error de sesión expirada
      expect(page).toHaveURL('/login');
      await expect(authPage.getErrorMessage()).toContain('sesión ha expirado');
    });

    test('should clear all storage on logout', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      await page.route('/api/auth/logout', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: "Sesión cerrada exitosamente",
            tokensInvalidated: true
          })
        });
      });

      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Verificar que los datos se guardaron
      const storedBefore = await page.evaluate(() => localStorage.getItem('rf_auth'));
      expect(storedBefore).toBeTruthy();

      // Hacer logout
      await page.locator('button:has-text("Cerrar sesión")').click();

      // Verificar que los datos se eliminaron
      const storedAfter = await page.evaluate(() => localStorage.getItem('rf_auth'));
      expect(storedAfter).toBeNull();

      // Debería redirigir a login
      expect(page).toHaveURL('/login');
    });
  });

  test.describe('UI State Management', () => {
    test('should show password change banner when required', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: true
          })
        });
      });

      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Debería ver el banner de cambio de contraseña
      await expect(page.locator('.bg-yellow-50')).toBeVisible();
      await expect(page.locator('.bg-yellow-50')).toContainText('debes cambiar tu contraseña');
    });

    test('should disable logout button during refresh', async ({ page }) => {
      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      await page.route('/api/auth/refresh', (route) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                accessToken: 'refreshed_token'
              })
            });
          }, 1000);
        });
      });

      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // El refresh debería ocurrir automáticamente
      await page.waitForTimeout(500);

      const logoutButton = page.locator('button:has-text("Cerrar sesión")');

      // Verificar que el botón está deshabilitado durante refresh
      await expect(logoutButton).toBeDisabled();
    });

    test('should show token status in development mode', async ({ page }) => {
      // Simular modo desarrollo
      await page.addInitScript(() => {
        window.import.meta.env = { DEV: true };
      });

      await page.route('/api/auth/login', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            requiresPasswordChange: false
          })
        });
      });

      await page.goto('/login');
      await authPage.fillCredentials('11111111', 'Admin#1111');
      await authPage.submitLogin();

      // Verificar que muestra el estado del token
      const tokenStatus = page.locator('.text-xs.bg-gray-700');
      expect(tokenStatus).toBeVisible();
      expect(tokenStatus).toContainText('Válido');
    });
  });
});