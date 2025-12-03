// tests/pages/auth-page.js
export class AuthPage {
  constructor(page) {
    this.page = page;
  }

  async fillCredentials(username, password) {
    await this.page.fill('input[placeholder*="Ingresa tu DNI"]', username);
    await this.page.fill('input[placeholder*="Ingresa tu contraseña"]', password);
  }

  async submitLogin() {
    await this.page.click('button:has-text("Iniciar sesión")');
  }

  getErrorMessage() {
    return this.page.locator('.bg-red-50 span');
  }

  getSuccessMessage() {
    return this.page.locator('.bg-green-50 span');
  }

  getWarningMessage() {
    return this.page.locator('.bg-yellow-50 span');
  }
}