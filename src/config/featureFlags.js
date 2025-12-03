// src/config/featureFlags.js
/**
 * Sistema de Feature Flags para migración gradual al sistema de Refresh Tokens
 * Permite habilitar/deshabilitar funcionalidades de forma segura
 */

// Configuración segura desde variables de entorno
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const allowDevFeatures = import.meta.env.VITE_ALLOW_DEV_FEATURES === 'true';

// 🚨 SEGURIDAD: Validación explícita de feature flags críticos
const validateProductionFlag = (envValue, devFallback = false) => {
  if (isProduction) {
    return envValue === 'true'; // Solo true si explícitamente configurado
  }
  return isDevelopment && (envValue === 'true' || devFallback);
};

export const FEATURE_FLAGS = {
  // 🔄 Refresh Token System - CRÍTICO: Sin fallback automático en producción
  REFRESH_TOKEN_ENABLED: validateProductionFlag(import.meta.env.VITE_FF_REFRESH_TOKEN, true),

  // 🔐 Enhanced Security - CRÍTICO: Sin fallback automático en producción
  ENHANCED_SECURITY_ENABLED: validateProductionFlag(import.meta.env.VITE_FF_ENHANCED_SECURITY, true),

  // 📊 Monitoring y Logs - Menos crítico,允许 fallback
  AUTH_MONITORING_ENABLED: import.meta.env.VITE_FF_AUTH_MONITORING === 'true' || isDevelopment,

  // 🔄 Backward Compatibility - Necesario para migración
  LEGACY_TOKEN_SUPPORT: import.meta.env.VITE_FF_LEGACY_TOKEN_SUPPORT !== 'false',

  // 🚨 Forced Password Changes - Security crítico
  FORCED_PASSWORD_CHANGE_ENABLED: validateProductionFlag(import.meta.env.VITE_FF_FORCED_PASSWORD_CHANGE, true),

  // ⚡ Auto Refresh - Depende de refresh tokens
  AUTO_REFRESH_ENABLED: validateProductionFlag(import.meta.env.VITE_FF_AUTO_REFRESH, false),

  // 🎭 UI Enhancements - Menos críticos
  TOKEN_STATUS_BADGE_ENABLED: import.meta.env.VITE_FF_TOKEN_STATUS_BADGE === 'true' || allowDevFeatures,
  PASSWORD_CHANGE_BANNER_ENABLED: import.meta.env.VITE_FF_PASSWORD_CHANGE_BANNER === 'true' || allowDevFeatures,

  // 🛡️ Security Enhancements - CRÍTICO: Sin fallback automático
  CONCURRENT_REFRESH_PREVENTION: validateProductionFlag(import.meta.env.VITE_FF_CONCURRENT_REFRESH, true),
  TOKEN_VALIDATION_STRICT: validateProductionFlag(import.meta.env.VITE_FF_TOKEN_VALIDATION_STRICT, true),

  // 📱 Migration Controls - CRÍTICO: Control explícito
  MIGRATION_MODE_ENABLED: validateProductionFlag(import.meta.env.VITE_FF_MIGRATION_MODE, false),
  ROLLBACK_SUPPORT_ENABLED: validateProductionFlag(import.meta.env.VITE_FF_ROLLBACK_SUPPORT, true),
};

// Grupos de features para facilitar la configuración
export const FEATURE_GROUPS = {
  // 🔰 Starter Features (Básico, bajo riesgo)
  STARTER: [
    'LEGACY_TOKEN_SUPPORT',
    'TOKEN_STATUS_BADGE_ENABLED',
    'AUTH_MONITORING_ENABLED'
  ],

  // 🚀 Core Features (Funcionalidad principal)
  CORE: [
    'REFRESH_TOKEN_ENABLED',
    'AUTO_REFRESH_ENABLED',
    'CONCURRENT_REFRESH_PREVENTION'
  ],

  // 🛡️ Security Features (Seguridad enhanced)
  SECURITY: [
    'ENHANCED_SECURITY_ENABLED',
    'TOKEN_VALIDATION_STRICT',
    'FORCED_PASSWORD_CHANGE_ENABLED'
  ],

  // 🎨 UI Features (Mejoras visuales)
  UI: [
    'PASSWORD_CHANGE_BANNER_ENABLED',
    'TOKEN_STATUS_BADGE_ENABLED'
  ],

  // 📊 Migration Features (Control de migración)
  MIGRATION: [
    'MIGRATION_MODE_ENABLED',
    'ROLLBACK_SUPPORT_ENABLED'
  ]
};

// Estrategias de rollout
export const ROLLOUT_STRATEGIES = {
  // Porcentaje de usuarios
  PERCENTAGE: {
    10: ['TOKEN_STATUS_BADGE_ENABLED'],
    25: ['REFRESH_TOKEN_ENABLED', 'AUTO_REFRESH_ENABLED'],
    50: ['FORCED_PASSWORD_CHANGE_ENABLED'],
    75: ['ENHANCED_SECURITY_ENABLED'],
    100: Object.keys(FEATURE_FLAGS)
  },

  // Por grupos de features
  PHASES: {
    PHASE_1: FEATURE_GROUPS.STARTER,
    PHASE_2: [...FEATURE_GROUPS.STARTER, ...FEATURE_GROUPS.CORE],
    PHASE_3: [...FEATURE_GROUPS.STARTER, ...FEATURE_GROUPS.CORE, ...FEATURE_GROUPS.SECURITY],
    PHASE_4: Object.keys(FEATURE_FLAGS)
  },

  // Por entorno
  ENVIRONMENT: {
    development: Object.keys(FEATURE_FLAGS),
    staging: [...FEATURE_GROUPS.STARTER, ...FEATURE_GROUPS.CORE, ...FEATURE_GROUPS.UI],
    production: FEATURE_GROUPS.STARTER // Empezar con features básicas
  }
};

// Utilidades para verificar flags
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] || false;
};

export const isGroupEnabled = (groupName) => {
  const group = FEATURE_GROUPS[groupName];
  if (!group) return false;

  return group.every(feature => isFeatureEnabled(feature));
};

export const getActiveFeatures = () => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name);
};

// Validación de configuración
export const validateFeatureFlags = () => {
  const issues = [];

  // Validar dependencias entre features
  if (isFeatureEnabled('AUTO_REFRESH_ENABLED') && !isFeatureEnabled('REFRESH_TOKEN_ENABLED')) {
    issues.push('AUTO_REFRESH_ENABLED requiere REFRESH_TOKEN_ENABLED');
  }

  if (isFeatureEnabled('FORCED_PASSWORD_CHANGE_ENABLED') && !isFeatureEnabled('REFRESH_TOKEN_ENABLED')) {
    issues.push('FORCED_PASSWORD_CHANGE_ENABLED requiere REFRESH_TOKEN_ENABLED');
  }

  if (isFeatureEnabled('PASSWORD_CHANGE_BANNER_ENABLED') && !isFeatureEnabled('FORCED_PASSWORD_CHANGE_ENABLED')) {
    issues.push('PASSWORD_CHANGE_BANNER_ENABLED requiere FORCED_PASSWORD_CHANGE_ENABLED');
  }

  return issues;
};

// Logs para debugging (solo en development)
if (isDevelopment) {
  console.group('🚩 Feature Flags Status');
  console.table(FEATURE_FLAGS);
  console.log('📊 Active Features:', getActiveFeatures());

  const issues = validateFeatureFlags();
  if (issues.length > 0) {
    console.warn('⚠️ Feature Flags Issues:', issues);
  } else {
    console.log('✅ Feature Flags Configuration Valid');
  }
  console.groupEnd();
}

export default FEATURE_FLAGS;