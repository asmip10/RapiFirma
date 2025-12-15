/**
 * Tests E2E para Migración del Sistema de Colas
 * Basado en MIGRATION_PLAN_FINAL.md sección 3.2
 *
 * Tests para verificar:
 * 1. Coexistencia de sistemas
 * 2. Migración opt-in funcional
 * 3. Flujos completos de ambos sistemas
 * 4. No regresión del sistema legacy
 */

import { test, expect } from '@playwright/test';
import { QueueService } from '../../src/services/queue.service';
import { DocumentService } from '../../src/services/document.service';
import { MIGRATION_CONFIG } from '../../src/config/featureFlags';

describe('Queue Migration Flow', () => {

  // Test 1: Verificar que sistema legacy funciona sin cambios
  test('Legacy system still works', async ({ page }) => {
    // Configurar feature flags para modo legacy
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Verificar que estamos en dashboard legacy
    await expect(page.locator('[data-testid="legacy-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="received-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="sent-tab"]')).toBeVisible();

    // Test flujo legacy completo
    await legacyUploadFlow(page);
    await legacyDocumentManagement(page);
  });

  // Test 2: Verificar que nuevo sistema de colas funciona
  test('New queue system works', async ({ page }) => {
    // Login y navegar a dashboard
    await login(page);

    // Cambiar a sistema de colas
    await page.click('[data-testid="queue-system-toggle"]');
    await expect(page.locator('[data-testid="queue-dashboard"]')).toBeVisible();

    // Test flujos de cola
    await queueCreationFlow(page);
    await sequentialSigningFlow(page);
    await queueManagementFlow(page);
  });

  // Test 3: Verificar coexistencia de ambos sistemas
  test('Coexistence works', async ({ page }) => {
    await login(page);

    // Verificar toggle visible
    await expect(page.locator('[data-testid="system-toggle"]')).toBeVisible();

    // Crear documento en sistema legacy
    await page.click('[data-testid="legacy-tab"]');
    await legacyUploadFlow(page);

    // Cambiar a sistema de colas
    await page.click('[data-testid="queue-tab"]');
    await queueCreationFlow(page);

    // Verificar que ambos documentos aparecen en sus respectivas vistas
    await verifyDashboardShowsBoth(page);
  });

  // Test 4: Verificar migración opt-in voluntaria
  test('Migration opt-in works', async ({ page }) => {
    await login(page);

    // Por defecto debe mostrar sistema legacy
    await expect(page.locator('[data-testid="legacy-dashboard"]')).toBeVisible();

    // Usuario opta por nuevo sistema
    await page.click('[data-testid="try-queue-system"]');

    // Verificar que ahora tiene acceso a nuevas características
    await verifyNewFeaturesAvailable(page);

    // Verificar que puede volver al sistema antiguo
    await page.click('[data-testid="back-to-legacy"]');
    await expect(page.locator('[data-testid="legacy-dashboard"]')).toBeVisible();
  });

  // Test 5: Verificar feature flags
  test('Feature flags control functionality', async ({ page }) => {
    await login(page);

    // Test con diferentes configuraciones de flags
    const testCases = [
      { flags: { QUEUE_SYSTEM_ENABLED: false }, expected: 'legacy-only' },
      { flags: { QUEUE_SYSTEM_ENABLED: true, MULTI_SIGNERS: false }, expected: 'queue-basic' },
      { flags: { QUEUE_SYSTEM_ENABLED: true, MULTI_SIGNERS: true }, expected: 'queue-full' }
    ];

    for (const testCase of testCases) {
      await setFeatureFlags(page, testCase.flags);
      await verifyExpectedFunctionality(page, testCase.expected);
    }
  });

  // Test 6: Verificar permisos y roles
  test('Role-based access control', async ({ page }) => {
    // Test como emisor
    await loginAsRole(page, 'emitter');
    await testEmitterPermissions(page);

    // Test como firmante
    await loginAsRole(page, 'signer');
    await testSignerPermissions(page);
  });

  // Test 7: Verificar manejo de errores
  test('Error handling and rollback', async ({ page }) => {
    await login(page);

    // Simular errores de red
    await page.route('**/api/documents/create-with-queue', route => route.abort());

    // Intentar crear cola
    await page.click('[data-testid="queue-tab"]');
    await page.click('[data-testid="create-queue-button"]');

    // Verificar manejo de error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Error de conexión');

    // Verificar que sistema legacy aún funciona
    await page.click('[data-testid="legacy-tab"]');
    await expect(page.locator('[data-testid="legacy-dashboard"]')).toBeVisible();
  });

  // Test 8: Verificar performance
  test('Performance impact is minimal', async ({ page }) => {
    await login(page);

    // Medir tiempo de carga inicial
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const initialLoadTime = Date.now() - startTime;

    // Cambiar entre sistemas y medir
    const switchStart = Date.now();
    await page.click('[data-testid="queue-tab"]');
    await page.waitForSelector('[data-testid="queue-dashboard"]');
    const switchTime = Date.now() - switchStart;

    // Verificar que los tiempos son aceptables
    expect(initialLoadTime).toBeLessThan(3000); // 3 segundos
    expect(switchTime).toBeLessThan(1000); // 1 segundo
  });

  // Helper functions
  async function login(page) {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  }

  async function legacyUploadFlow(page) {
    await page.click('[data-testid="upload-button"]');
    await page.setInputFiles('[data-testid="file-input"] = 'tests/fixtures/test.pdf');
    await page.fill('[data-testid="recipient-search"]', 'testuser2');
    await page.click('[data-testid="recipient-option"]:first-child');
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  }

  async function legacyDocumentManagement(page) {
    // Verificar que el documento aparece en "Enviados"
    await page.click('[data-testid="sent-tab"]');
    await expect(page.locator('[data-testid="document-row"]:first-child')).toBeVisible();

    // Test descarga
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]:first-child');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  }

  async function queueCreationFlow(page) {
    await page.click('[data-testid="create-queue-button"]');
    await page.setInputFiles('[data-testid="file-input"]', 'tests/fixtures/test.pdf');

    // Agregar múltiples firmantes
    await page.fill('[data-testid="signer-search"]', 'user1');
    await page.click('[data-testid="signer-option"]:first-child');
    await page.fill('[data-testid="signer-search"]', 'user2');
    await page.click('[data-testid="signer-option"]:first-child');
    await page.fill('[data-testid="signer-search"]', 'user3');
    await page.click('[data-testid="signer-option"]:first-child');

    await page.click('[data-testid="create-queue-submit"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  }

  async function sequentialSigningFlow(page) {
    // Ir a sección "Mi Turno"
    await expect(page.locator('[data-testid="my-turn-section"]')).toBeVisible();

    if (await page.locator('[data-testid="queue-card"]').count() > 0) {
      await page.click('[data-testid="sign-button"]:first-child');

      // Verificar modal de firma
      await expect(page.locator('[data-testid="signing-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-list"]')).toBeVisible();

      // Simular firma (en testing real cargaríamos PDF firmado)
      await page.setInputFiles('[data-testid="signed-file-input"]', 'tests/fixtures/signed-test.pdf');
      await page.click('[data-testid="confirm-signature"]');

      await expect(page.locator('[data-testid="success-toast"]')).toContainText('firmado exitosamente');
    }
  }

  async function queueManagementFlow(page) {
    // Verificar sección de colas creadas
    await expect(page.locator('[data-testid="created-queues-section"]')).toBeVisible();

    // Test agregar participantes
    if (await page.locator('[data-testid="created-queue-card"]').count() > 0) {
      await page.click('[data-testid="add-participants-button"]:first-child');
      await page.fill('[data-testid="new-signer-search"]', 'newuser');
      await page.click('[data-testid="new-signer-option"]:first-child');
      await page.click('[data-testid="add-participants-submit"]');

      await expect(page.locator('[data-testid="success-toast"]')).toContainText('participantes agregados');
    }
  }

  async function verifyDashboardShowsBoth(page) {
    // Verificar documentos legacy
    await page.click('[data-testid="legacy-tab"]');
    await expect(page.locator('[data-testid="received-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="sent-tab"]')).toBeVisible();

    // Verificar colas
    await page.click('[data-testid="queue-tab"]');
    await expect(page.locator('[data-testid="queue-dashboard"]')).toBeVisible();
  }

  async function verifyNewFeaturesAvailable(page) {
    // Verificar nuevas características disponibles
    await expect(page.locator('[data-testid="multi-signer-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="sequential-ordering"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-metrics"]')).toBeVisible();
  }

  async function setFeatureFlags(page, flags) {
    // Esto normalmente se haría a través de una API de admin o config
    // Para testing, simulamos configuración local
    await page.evaluate((flags) => {
      window.MIGRATION_TEST_FLAGS = flags;
    }, flags);

    await page.reload();
  }

  async function verifyExpectedFunctionality(page, expected) {
    switch (expected) {
      case 'legacy-only':
        await expect(page.locator('[data-testid="queue-tab"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="legacy-dashboard"]')).toBeVisible();
        break;
      case 'queue-basic':
        await expect(page.locator('[data-testid="queue-tab"]')).toBeVisible();
        await expect(page.locator('[data-testid="multi-signer-option"]')).not.toBeVisible();
        break;
      case 'queue-full':
        await expect(page.locator('[data-testid="queue-tab"]')).toBeVisible();
        await expect(page.locator('[data-testid="multi-signer-option"]')).toBeVisible();
        break;
    }
  }

  async function loginAsRole(page, role) {
    // Login con credenciales de rol específico
    await page.goto('/login');
    await page.fill('[data-testid="username"]', `test${role}`);
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
  }

  async function testEmitterPermissions(page) {
    // Como emisor, debería poder crear colas y gestionar participantes
    await page.click('[data-testid="queue-tab"]');
    await expect(page.locator('[data-testid="create-queue-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-participants-button"]')).toBeVisible();
  }

  async function testSignerPermissions(page) {
    // Como firmante, debería poder ver colas donde participa y firmar
    await page.click('[data-testid="queue-tab"]');
    await expect(page.locator('[data-testid="my-turn-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="sign-button"]')).toBeVisible();
  }
});

// Tests de Unit Tests
describe('Queue Service Unit Tests', () => {
  test('QueueService validates PDF base64 correctly', () => {
    const validBase64 = 'JVBERi0xLjcKCjeLjz9M'; // PDF header en base64
    const invalidBase64 = 'invalid-base64-data';

    expect(QueueService.isValidPDFBase64(validBase64)).toBe(true);
    expect(QueueService.isValidPDFBase64(invalidBase64)).toBe(false);
  });

  test('QueueService calculates expiration correctly', () => {
    const baseDate = new Date('2023-01-01T00:00:00Z');
    const expiration = QueueService.calculateExpiration(baseDate);

    // Debe ser 5 días después
    const expected = new Date('2023-01-06T00:00:00Z');
    expect(expiration).toBe(expected.toISOString());
  });

  test('Feature flags control service behavior', () => {
    const originalConfig = { ...MIGRATION_CONFIG };

    // Test con feature flag deshabilitado
    MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED = false;

    expect(() => {
      QueueService.createQueue({
        nombrePDF: 'test.pdf',
        pdfData: 'base64data',
        firmantes: [1, 2, 3]
      });
    }).toThrow('Sistema de colas no habilitado');

    // Restaurar configuración
    Object.assign(MIGRATION_CONFIG, originalConfig);
  });
});

describe('Document Store Unit Tests', () => {
  test('Store maintains coexistence between systems', () => {
    const store = useDocumentsStore();

    // Verificar estado inicial
    expect(store.received).toEqual([]);
    expect(store.sent).toEqual([]);
    expect(store.queues.createdQueues).toEqual([]);
    expect(store.queues.signingQueues).toEqual([]);

    // Verificar getters
    expect(store.isQueueSystemEnabled).toBeDefined();
    expect(store.canUseMultiSigners).toBeDefined();
    expect(store.canToggleDashboard).toBeDefined();
  });

  test('Store validates migration configuration', () => {
    const store = useDocumentsStore();
    const validation = store.validateMigrationConfiguration();

    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('errors');
    expect(validation).toHaveProperty('warnings');
  });
});