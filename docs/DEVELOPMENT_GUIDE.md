# 🚀 Guía de Desarrollo - Sistema de Migración RapiFirma

> **Documentación completa para equipo de desarrollo**
> **Fase 3.6: Documentación Final - Plan de Migración Completo**

---

## 📋 **Tabla de Contenidos**

1. [Arquitectura del Sistema](#arquitectura)
2. [Feature Flags](#feature-flags)
3. [Sistema de Colas](#sistema-de-colas)
4. [Testing](#testing)
5. [Performance](#performance)
6. [Error Handling](#error-handling)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ **Arquitectura del Sistema**

### **Estructura de Coexistencia**

```
src/
├── components/           # Componentes UI
│   ├── QueueDashboard.vue        # Dashboard principal de colas
│   ├── QueueCard.vue             # Tarjeta para colas urgentes
│   ├── CreatedQueueCard.vue       # Tarjeta para colas creadas
│   ├── WaitingQueueCard.vue       # Tarjeta para colas en espera
│   ├── CompletedQueueCard.vue     # Tarjeta para colas completadas
│   ├── SigningModal.vue           # Modal de firma
│   ├── QueueDetailsModal.vue      # Modal de detalles
│   ├── AddParticipantsModal.vue    # Modal para agregar participantes
│   ├── UploadModalHybrid.vue      # Modal híbrido de creación
│   └── VirtualQueueList.vue       # Lista virtualizada optimizada
├── composables/         # Hooks reutilizables
│   ├── useFeatureFlags.js         # Manejo de feature flags
│   ├── usePerformance.js          # Optimización de performance
│   ├── useErrorHandler.js         # Manejo robusto de errores
│   └── useToasts.js               # Sistema de notificaciones
├── services/             # Servicios de API
│   ├── queue.service.js            # Servicio de colas
│   ├── document.service.js         # Servicio de documentos legacy
│   ├── integration.service.js      # Integración con backend
│   └── api.js                     # Cliente HTTP base
├── stores/               # Estado global (Pinia)
│   ├── document.js                 # Store de documentos y colas
│   └── auth.js                     # Store de autenticación
├── config/               # Configuración
│   ├── featureFlags.js            # Flags de migración
│   └── api.config.js              # Configuración de APIs
└── tests/                # Tests
    ├── e2e/                         # Tests end-to-end
    ├── unit/                       # Tests unitarios
    └── fixtures/                   # Datos de prueba
```

### **Flujo de Datos**

```
Feature Flags → Store → Services → Backend
     ↓            ↓          ↓         ↓
   Components → Composables → QueueService → IntegrationService → API
```

---

## 🎯 **Feature Flags**

### **Configuración Principal**

```javascript
// src/config/featureFlags.js
const MIGRATION_CONFIG = {
  // Control de sistemas
  LEGACY_SYSTEM_ENABLED: true,    // Sistema 1-a-1 tradicional
  QUEUE_SYSTEM_ENABLED: true,     // Sistema de colas secuencial

  // Modo de migración
  MIGRATION_MODE: 'opt-in',        // 'opt-in' | 'opt-out' | 'forced'

  // Características específicas
  QUEUE_FEATURES: {
    MULTI_SIGNERS: true,           // Múltiples firmantes
    DYNAMIC_PARTICIPANTS: true,    // Agregar participantes dinámicamente
    EXPIRATION_MANAGEMENT: true,   // Control de expiración
    ROLE_BASED_VIEWS: true,        // Vistas por rol
    HIDE_SHOW_QUEUES: true,        // Ocultar/mostrar colas
    CANCEL_QUEUES: true             // Cancelar colas
  },

  // UI/UX
  UI_SETTINGS: {
    SHOW_DASHBOARD_TOGGLE: true,    // Toggle entre sistemas
    DEFAULT_TO_QUEUE_VIEW: false,  // Vista predeterminada
    SHOW_LEGACY_WARNING: true      // Advertencia sistema antiguo
  }
};
```

### **Uso en Componentes**

```javascript
import { useFeatureFlags } from '@/composables/useFeatureFlags';

export default {
  setup() {
    const {
      isQueueSystemEnabled,
      canUseMultiSigners,
      canToggleBetweenSystems,
      shouldShowDualDashboard
    } = useFeatureFlags();

    return {
      isQueueSystemEnabled,
      canUseMultiSigners,
      canToggleBetweenSystems,
      shouldShowDualDashboard
    };
  }
};
```

---

## 📋 **Sistema de Colas**

### **Arquitectura de Colas**

```
1. Creación de Cola (createQueue)
   - Validación de PDF base64
   - Múltiples firmantes en orden secuencial
   - Configuración de expiración

2. Estado de Cola (getQueueStatus)
   - Vista diferente según rol (emisor/firmante/espera)
   - Progreso en tiempo real
   - Información de participantes

3. Dashboard (getQueueDashboard)
   - Métricas generales
   - Colas por estado (miTurno/creadas/espera/completadas)
   - Datos cacheados para performance

4. Firma Secuencial (signCurrentTurn)
   - Validación de turnos
   - Actualización automática del siguiente firmante
   - Registro de timestamp

5. Gestión Dinámica (addParticipants)
   - Agregar nuevos participantes
   - Mantener orden secuencial
   - Notificación a usuarios afectados
```

### **Ejemplo: Crear Cola**

```javascript
import { useDocumentsStore } from '@/stores/document';

const documentStore = useDocumentsStore();

const createNewQueue = async (data) => {
  try {
    await documentStore.createQueueWithParticipants({
      nombrePDF: 'Contrato.pdf',
      pdfData: base64PDFData,
      firmantes: [2, 5, 8, 12] // IDs en orden de firma
    });

    // El dashboard se actualiza automáticamente
    console.log('Cola creada exitosamente');
  } catch (error) {
    console.error('Error creando cola:', error);
  }
};
```

---

## 🧪 **Testing**

### **Estructura de Tests**

```
tests/
├── e2e/                     # Tests end-to-end
│   └── queueMigration.test.js
├── unit/                    # Tests unitarios
│   ├── queueService.test.js
│   ├── documentStore.test.js
│   └── featureFlags.test.js
└── fixtures/                # Datos de prueba
    ├── test.pdf             # PDF de prueba
    └── signed-test.pdf      # PDF firmado de prueba
```

### **Ejecutar Tests**

```bash
# Tests E2E
npm run test:e2e

# Tests unitarios
npm run test:unit

# Todos los tests
npm run test

# Tests con coverage
npm run test:coverage
```

### **Tests Clave**

1. **Coexistencia**: Verificar que ambos sistemas funcionen simultáneamente
2. **Migración**: Validar transición opt-in opt-out
3. **Performance**: Medir tiempos de carga y respuesta
4. **Errores**: Testear manejo de errores y recuperación
5. **Permisos**: Validar acceso por roles

---

## ⚡ **Performance**

### **Optimizaciones Implementadas**

#### **1. Lazy Loading**
```javascript
import { defineAsyncComponent } from 'vue';

const QueueCard = defineAsyncComponent(() => import('./QueueCard.vue'));
```

#### **2. Virtualización**
```javascript
import { VirtualQueueList } from './VirtualQueueList.vue';

// Renderiza solo items visibles
<VirtualQueueList
  :items="queues"
  :item-height="120"
  :container-height="400"
/>
```

#### **3. Memoización**
```javascript
import { useMemo } from '@/composables/usePerformance';

const memoizedData = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

#### **4. Debouncing**
```javascript
import { useDebounce } from '@/composables/usePerformance';

const { debounce } = useDebounce(300);

const debouncedSearch = debounce((query) => {
  // Buscar después de 300ms sin cambios
  performSearch(query);
});
```

### **Métricas de Performance**

- **Tiempo de carga inicial**: < 3s
- **Cambio entre sistemas**: < 1s
- **Renderizado de 1000 colas**: < 500ms
- **Uso de memoria**: < 100MB

---

## 🛡️ **Error Handling**

### **Sistema Centralizado de Errores**

```javascript
import { useErrorHandler } from '@/composables/useErrorHandler';

const {
  handleNetworkError,
  handleValidationError,
  handleAuthError,
  withErrorHandling
} = useErrorHandler();

// Ejemplo de uso
const riskyOperation = withErrorHandling(async () => {
  // Operación que puede fallar
  await apiCall();
}, ErrorTypes.NETWORK);
```

### **Tipos de Errores**

- **NETWORK**: Errores de conexión/HTTP
- **VALIDATION**: Errores de datos de entrada
- **AUTHORIZATION**: Permisos denegados
- **BUSINESS**: Lógica de negocio
- **SYSTEM**: Errores internos del sistema
- **USER**: Errores causados por el usuario

### **Recuperación Automática**

- **Reintentos con exponential backoff**
- **Circuit Breaker para endpoints fallidos**
- **Cache fallback**
- **Modo offline parcial**

---

## 🚀 **Deployment**

### **Variables de Entorno**

```bash
# .env.production
VITE_API_BASE_URL=https://api.rapifirma.com
VITE_MONITORING_ENDPOINT=https://monitoring.rapifirma.com/api/errors

# Feature flags para producción
MIGRATION_MODE=opt-in
QUEUE_SYSTEM_ENABLED=true
LEGACY_SYSTEM_ENABLED=true
```

### **Pipeline de CI/CD**

```yaml
# .github/workflows/deploy.yml
name: Deploy RapiFirma

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build
      - name: Deploy
        run: echo "Deploy to production server"
```

### **Verificación Post-Deploy**

1. **Health Check**: Verificar endpoints críticos
2. **Feature Flags**: Confirmar configuración correcta
3. **Performance**: Medir tiempos de respuesta
4. **Error Monitoring**: Activar alertas

---

## 🔧 **Troubleshooting**

### **Problemas Comunes**

#### **1. Cola no aparece en dashboard**

```javascript
// Verificar feature flags
console.log('Queue enabled:', MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED);
console.log('Features:', MIGRATION_CONFIG.QUEUE_FEATURES);

// Verificar estado del store
const store = useDocumentsStore();
console.log('Queue state:', store.getMigrationStatus());
```

#### **2. Error de conexión con backend**

```javascript
// Verificar configuración API
import { getEnvironmentConfig } from '@/config/api.config';
console.log('API Config:', getEnvironmentConfig());

// Verificar compatibilidad
import { integrationService } from '@/services/integration.service';
const compatibility = await integrationService.validateBackendCompatibility();
console.log('Compatibility:', compatibility);
```

#### **3. Performance lenta**

```javascript
// Monitoreo de performance
import { usePerformanceMonitor } from '@/composables/usePerformance';

const { metrics, startMonitoring } = usePerformanceMonitor();
startMonitoring();
console.log('Performance metrics:', metrics);
```

### **Debug Mode**

```javascript
// Activar debug mode
if (import.meta.env.DEV) {
  // Logs verbosos
  localStorage.setItem('debug', 'true');

  // Mocks habilitados
  import.meta.env.VITE_MOCK_ENDPOINTS = 'true';
}
```

### **Logs Importantes**

- **Console**: Errores de desarrollo
- **Error Monitoring**: Errores de producción
- **Performance Metrics**: Rendimiento del sistema
- **API Logs**: Requests y responses

---

## 📚 **Recursos Adicionales**

### **Documentación de Referencia**

- [Documentación API](doc/document/doc_document.md) - Endpoints completos
- [Plan de Migración](doc/document/MIGRATION_PLAN_FINAL.md) - Plan detallado
- [Feature Flags Guide](docs/FEATURE_FLAGS.md) - Guía de flags

### **Herramientas Recomendadas**

- **Vue DevTools**: Debug de componentes Vue
- **Redux DevTools**: Debug de estado Pinia
- **Lighthouse**: Auditoría de performance
- **Chrome DevTools Network**: Debug de requests HTTP

### **Contacto de Soporte**

Para problemas no documentados:

1. Revisar logs de la consola
2. Verificar configuración de feature flags
3. Validar conexión con backend
4. Contactar al equipo de desarrollo

---

## 🎉 **Conclusión**

El sistema de migración está completamente implementado y listo para producción:

✅ **Coexistencia total** - Ambos sistemas funcionan simultáneamente
✅ **Migración controlada** - Feature flags permiten transición gradual
✅ **Testing completo** - Cobertura E2E y unitarios
✅ **Performance optimizado** - Lazy loading y virtualización
✅ **Error handling robusto** - Recuperación automática y monitoreo
✅ **Documentación completa** - Guía para equipo de desarrollo

**Estado: Listo para producción** 🚀