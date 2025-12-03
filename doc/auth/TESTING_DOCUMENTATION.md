# Documentación de Testing - Sistema Refresh Token

## 📋 Tabla de Contenidos

1. [Estrategia de Testing](#estrategia-de-testing)
2. [Tipos de Tests](#tipos-de-tests)
3. [Configuración del Entorno](#configuración-del-entorno)
4. [Scripts de Ejecución](#scripts-de-ejecución)
5. [Estructura de Tests](#estructura-de-tests)
6. [Guía de Ejecución](#guía-de-ejecución)
7. [Métricas de Cobertura](#métricas-de-cobertura)

---

## 🎯 Estrategia de Testing

### Pirámide de Testing

```
    /\     E2E Tests (Playwright)
   /  \    • Flujos completos de autenticación
  /____\   • Validación UI
 /      \  Integration Tests (Vitest)
/        \ • Store + Service + API
/__________\ Unit Tests (Vitest)
             • Funciones individuales
             • Módulos aislados
```

### Principios

- **Principio de Responsabilidad Única**: Cada test valida un comportamiento específico
- **Principio FIRST**: Fast, Independent, Repeatable, Self-Validating, Timely
- **Principio DRY**: Helpers reutilizables para setup y teardown
- **Test Driven Development**: Escribir tests antes o durante el desarrollo

---

## 🧪 Tipos de Tests

### 1. Unit Tests
**Responsabilidad**: Validar comportamiento de unidades individuales

**Archivos**:
- `tests/stores/auth.test.js` - AuthStore
- `tests/services/auth.service.test.js` - AuthService

**Cobertura**:
- Métodos del store (login, logout, refresh)
- Lógica de negocio pura
- Validaciones y manejo de errores
- Estados y propiedades computadas

### 2. Integration Tests
**Responsabilidad**: Validar interacción entre componentes

**Archivo**:
- `tests/integration/auth.flow.test.js`

**Cobertura**:
- Store + Service + API interactions
- Flujos completos de autenticación
- Manejo de tokens y estado
- Intercepción de requests

### 3. E2E Tests
**Responsabilidad**: Validar comportamiento del sistema completo

**Archivo**:
- `tests/e2e/auth.spec.js`

**Cobertura**:
- UI real + API backend
- User journeys completos
- Navegación y routing
- Estado visual de la aplicación

---

## ⚙️ Configuración del Entorno

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@vitest/coverage-v8": "^2.1.8",
    "@vitest/ui": "^2.1.8",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.8"
  }
}
```

### Archivos de Configuración

#### Vitest Configuration
- `tests/setup/vitest.config.js` - Configuración principal
- `tests/setup/vitest.setup.js` - Setup global y mocks

#### Playwright Configuration
- `playwright.config.js` - Configuración de E2E tests

### Mocks Configurados

```javascript
// Browser APIs
window.localStorage
window.sessionStorage
window.location
window.navigator
window.crypto
window.performance

// Vue específicos
$translate (i18n)
router-link y router-view
transitions

// Web APIs
IntersectionObserver
ResizeObserver
matchMedia
requestAnimationFrame
```

---

## 🚀 Scripts de Ejecución

### Unit & Integration Tests

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar con UI interactiva
npm run test:ui

# Ejecutar una sola vez (sin watch)
npm run test:run

# Ejecutar con reporte de cobertura
npm run test:coverage

# Ejecutar tests específicos
npm run test -- auth.test.js
npm run test -- -t "should login successfully"
```

### E2E Tests

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar con UI de Playwright
npm run test:e2e:ui

# Ejecutar en modo debug
npm run test:e2e:debug

# Ejecutar en navegador específico
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=webkit
```

---

## 📁 Estructura de Tests

```
tests/
├── setup/
│   ├── vitest.config.js     # Configuración Vitest
│   └── vitest.setup.js      # Setup global
├── stores/
│   └── auth.test.js         # Unit tests AuthStore
├── services/
│   └── auth.service.test.js # Unit tests AuthService
├── integration/
│   └── auth.flow.test.js    # Integration tests
├── e2e/
│   └── auth.spec.js         # E2E tests
└── pages/
    ├── auth-page.js         # Page Object Model
    └── dashboard-page.js    # Page Object Model
```

### Page Object Pattern

```javascript
// tests/pages/auth-page.js
export class AuthPage {
  constructor(page) {
    this.page = page;
  }

  async fillCredentials(username, password) {
    await this.page.fill('input[placeholder*="DNI"]', username);
    await this.page.fill('input[placeholder*="contraseña"]', password);
  }

  async submitLogin() {
    await this.page.click('button:has-text("Iniciar sesión")');
  }

  getErrorMessage() {
    return this.page.locator('.bg-red-50 span');
  }
}
```

---

## 📖 Guía de Ejecución

### Ejecución Local

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Ejecutar unit tests**
   ```bash
   npm run test:run
   ```

3. **Ejecutar E2E tests** (requiere servidor corriendo)
   ```bash
   # Terminal 1: Iniciar servidor
   npm run dev

   # Terminal 2: Ejecutar E2E tests
   npm run test:e2e
   ```

### Ejecución en CI

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
```

---

## 📊 Métricas de Cobertura

### Umbrales Configurados

```javascript
coverage: {
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Reportes Generados

- **Texto**: En consola durante ejecución
- **HTML**: `coverage/index.html` - Interactivo
- **JSON**: `coverage/coverage-final.json` - Para CI

### Archivos Prioritarios

```
src/services/auth.service.js    100% cobertura requerida
src/stores/auth.js             100% cobertura requerida
src/guards/authGuard.js        90% cobertura mínima
src/components/layout/*.vue    85% cobertura mínima
```

---

## 🛠️ Buenas Prácticas

### 1. Nomenclatura de Tests

```javascript
describe('Feature Being Tested', () => {
  describe('Specific Scenario', () => {
    it('should do X when Y', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### 2. Estructura AAA

```javascript
it('should login successfully with valid credentials', async () => {
  // Arrange: Setup y mocks
  const mockResponse = { accessToken: 'token' };
  vi.spyOn(AuthService, 'login').mockResolvedValue(mockResponse);

  // Act: Ejecutar acción
  await authStore.login({ username: 'test', password: 'test' });

  // Assert: Verificar resultado
  expect(authStore.isAuthenticated).toBe(true);
});
```

### 3. Tests Independientes

```javascript
beforeEach(() => {
  // Limpiar estado
  authStore.$reset();
  localStorage.clear();
  vi.clearAllMocks();
});
```

### 4. Mocks Específicos

```javascript
// Mock de API
vi.mock('../../src/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] }
    }
  }
}));
```

---

## 🔬 Debugging de Tests

### Vitest

```bash
# Ejecutar en modo watch
npm run test

# Ejecutar test específico
npm run test -- -t "should login"

# Ejecutar con debugger
npm run test -- --inspect-brk

# Ver coverage en detalle
open coverage/index.html
```

### Playwright

```bash
# Modo debug paso a paso
npm run test:e2e:debug

# Generar screenshots
npm run test:e2e -- --project=chromium --screenshot

# Grabar video
npm run test:e2e -- --project=chromium --video=on
```

### Code Generation

```bash
# Generar código de test con Playwright
npx playwright codegen http://localhost:5173
```

---

## 📋 Checklist de Testing

### Antes de Commit

- [ ] Unit tests pasan localmente
- [ ] Integration tests pasan localmente
- [ ] Cobertura >= 80%
- [ ] No tests con `only` o `skip`
- [ ] Tests son determinísticos
- [ ] Mocks son correctos y limpios

### Antes de Deploy

- [ ] Todos los tests pasan en CI
- [ ] E2E tests pasan en todos los navegadores
- [ ] Cobertura mantiene umbrales
- [ ] Tests de performance aceptables
- [ ] No flakiness detectado

---

## 📚 Referencias

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)