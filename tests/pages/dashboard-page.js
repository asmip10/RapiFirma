// tests/pages/dashboard-page.js
export class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  getWelcomeMessage() {
    return this.page.locator('text=Usuario: *, User');
  }

  getLogoutButton() {
    return this.page.locator('button:has-text("Cerrar sesión")');
  }

  getAdminLink() {
    return this.page.locator('a:has-text("Ir a Admin")');
  }

  getRefreshStatus() {
    return this.page.locator('.text-xs.bg-gray-700');
  }

  getPasswordChangeBanner() {
    return this.page.locator('.bg-yellow-50');
  }

  getLoadingOverlay() {
    return this.page.locator('.fixed.top-0:has-text("Renovando")');
  }
}