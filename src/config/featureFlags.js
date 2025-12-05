// src/config/featureFlags.js
/**
 * Sistema de Feature Flags simplificado
 * Solo funcionalidades esenciales sin variables de entorno
 */

const FLAGS = {
  REFRESH_TOKEN_ENABLED: true,        // Mantener funcionalidad core
  FORCED_PASSWORD_CHANGE: true,       // Mantener seguridad
  AUTO_REFRESH: true                  // Mantener UX
};

export const isFeatureEnabled = (flag) => FLAGS[flag] ?? false;
export const getAllFlags = () => ({...FLAGS});

// Valores individuales para compatibilidad
export const REFRESH_TOKEN_ENABLED = FLAGS.REFRESH_TOKEN_ENABLED;
export const FORCED_PASSWORD_CHANGE_ENABLED = FLAGS.FORCED_PASSWORD_CHANGE;
export const AUTO_REFRESH_ENABLED = FLAGS.AUTO_REFRESH;