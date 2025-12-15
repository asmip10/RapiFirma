// src/config/featureFlags.js
/**
 * Sistema de Feature Flags
 * Maneja tanto flags de autenticación existentes como flags de migración de documentos
 */

// Flags existentes de autenticación (mantener compatibilidad)
const AUTH_FLAGS = {
  REFRESH_TOKEN_ENABLED: true,        // Mantener funcionalidad core
  FORCED_PASSWORD_CHANGE: true,       // Mantener seguridad
  AUTO_REFRESH: true                  // Mantener UX
};

// Flags de migración del sistema de documentos
const MIGRATION_CONFIG = {
  // Control principal de sistemas
  LEGACY_SYSTEM_ENABLED: false,      // ❌ ELIMINADO: Sistema legacy desactivado
  QUEUE_SYSTEM_ENABLED: true,        // ✅ ACTIVO: Solo sistema de colas

  // Control de funcionalidades específicas
  QUEUE_FEATURES: {
    MULTI_SIGNERS: true,             // Múltiples firmantes en cola
    DYNAMIC_PARTICIPANTS: true,      // Agregar participantes dinámicamente
    EXPIRATION_MANAGEMENT: true,     // Control de expiración automática
    ROLE_BASED_VIEWS: true,          // Vistas diferenciadas por rol
    HIDE_SHOW_QUEUES: true,          // Ocultar/mostrar colas
    CANCEL_QUEUES: true              // Cancelación de colas por emisor
  },

  // Modo de migración para usuarios
  MIGRATION_MODE: 'forced',          // ✅ FORZADO: Solo sistema de colas

  // Control de UI/UX
  UI_SETTINGS: {
    SHOW_DASHBOARD_TOGGLE: false,    // ❌ ELIMINADO: Sin toggle
    DEFAULT_TO_QUEUE_VIEW: true,     // ✅ Por defecto: solo colas
    SHOW_LEGACY_WARNING: false       // ❌ ELIMINADO: Sin advertencias
  },

  // Control de APIs
  API_CONFIG: {
    ENABLE_QUEUE_ENDPOINTS: true,    // Habilitar endpoints de colas
    DEPRECATE_LEGACY_ENDPOINTS: false, // Marcar endpoints antiguos como deprecados
    BACKWARD_COMPATIBILITY: true     // Mantener compatibilidad con clientes antiguos
  }
};

// Combinar todos los flags
const ALL_FLAGS = {
  ...AUTH_FLAGS,
  ...MIGRATION_CONFIG,
  ...MIGRATION_CONFIG.QUEUE_FEATURES,
  ...MIGRATION_CONFIG.UI_SETTINGS,
  ...MIGRATION_CONFIG.API_CONFIG
};

export const isFeatureEnabled = (flag) => {
  // Primero buscar en flags de autenticación
  if (flag in AUTH_FLAGS) {
    return AUTH_FLAGS[flag];
  }

  // Luego buscar en flags de migración
  return ALL_FLAGS[flag] ?? false;
};

export const getAllFlags = () => ({...ALL_FLAGS});

// Valores individuales para compatibilidad existente
export const REFRESH_TOKEN_ENABLED = AUTH_FLAGS.REFRESH_TOKEN_ENABLED;
export const FORCED_PASSWORD_CHANGE_ENABLED = AUTH_FLAGS.FORCED_PASSWORD_CHANGE;
export const AUTO_REFRESH_ENABLED = AUTH_FLAGS.AUTO_REFRESH;

// Helper específico para flags de migración
export function getMigrationConfig() {
  return MIGRATION_CONFIG;
}

// Helper para verificar funcionalidades de cola
export function isQueueFeatureEnabled(feature) {
  return MIGRATION_CONFIG.QUEUE_FEATURES[feature] && MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED;
}

// Composable para Vue - acceso fácil a feature flags de migración
export function useMigrationFlags() {
  return {
    // Sistema principal
    isLegacyEnabled: MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED,
    isQueueEnabled: MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED,

    // Funcionalidades
    canUseMultiSigners: isQueueFeatureEnabled('MULTI_SIGNERS'),
    canManageParticipants: isQueueFeatureEnabled('DYNAMIC_PARTICIPANTS'),
    hasExpirationManagement: isQueueFeatureEnabled('EXPIRATION_MANAGEMENT'),
    hasRoleBasedViews: isQueueFeatureEnabled('ROLE_BASED_VIEWS'),
    canHideShowQueues: isQueueFeatureEnabled('HIDE_SHOW_QUEUES'),
    canCancelQueues: isQueueFeatureEnabled('CANCEL_QUEUES'),

    // Modo de migración
    isOptInMode: MIGRATION_CONFIG.MIGRATION_MODE === 'opt-in',
    isOptOutMode: MIGRATION_CONFIG.MIGRATION_MODE === 'opt-out',
    isForcedMode: MIGRATION_CONFIG.MIGRATION_MODE === 'forced',

    // Configuración UI
    showDashboardToggle: MIGRATION_CONFIG.UI_SETTINGS.SHOW_DASHBOARD_TOGGLE,
    defaultToQueueView: MIGRATION_CONFIG.UI_SETTINGS.DEFAULT_TO_QUEUE_VIEW,
    showLegacyWarning: MIGRATION_CONFIG.UI_SETTINGS.SHOW_LEGACY_WARNING,

    // APIs
    queueEndpointsEnabled: MIGRATION_CONFIG.API_CONFIG.ENABLE_QUEUE_ENDPOINTS,
    legacyEndpointsDeprecated: MIGRATION_CONFIG.API_CONFIG.DEPRECATE_LEGACY_ENDPOINTS,
    backwardCompatible: MIGRATION_CONFIG.API_CONFIG.BACKWARD_COMPATIBILITY,

    // Helper general
    getMigrationConfig,
    isQueueFeatureEnabled
  };
}

// Exportar configuración completa para acceso directo
export { MIGRATION_CONFIG };