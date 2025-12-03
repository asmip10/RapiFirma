// src/utils/authAdapter.js
/**
 * Adaptador para migración y compatibilidad entre sistemas de autenticación
 * Maneja la transición del sistema legacy al sistema de refresh tokens
 */

import { FEATURE_FLAGS } from '@/config/featureFlags';

/**
 * Estados de migración posibles
 */
export const MIGRATION_STATES = {
  LEGACY: 'legacy',           // Solo sistema antiguo
  HYBRID: 'hybrid',           // Ambos sistemas activos
  MIGRATING: 'migrating',     // En proceso de migración
  REFRESH_TOKEN: 'refresh'    // Solo nuevo sistema
};

/**
 * Detecta el estado actual de autenticación
 */
export const detectAuthState = (storageData) => {
  if (!storageData) return MIGRATION_STATES.LEGACY;

  const hasLegacyToken = storageData.token;
  const hasRefreshTokens = storageData.accessToken && storageData.refreshToken;

  if (hasRefreshTokens && FEATURE_FLAGS.REFRESH_TOKEN_ENABLED) {
    return MIGRATION_STATES.REFRESH_TOKEN;
  }

  if (hasLegacyToken && hasRefreshTokens) {
    return MIGRATION_STATES.HYBRID;
  }

  if (hasLegacyToken) {
    return MIGRATION_STATES.LEGACY;
  }

  return MIGRATION_STATES.MIGRATING;
};

/**
 * Adapta datos legacy al nuevo formato
 */
export const adaptLegacyToRefreshToken = (legacyData) => {
  if (!legacyData) return null;

  // Si ya está en nuevo formato, retornar tal cual
  if (legacyData.accessToken && legacyData.refreshToken) {
    return legacyData;
  }

  // Si es formato antiguo, adaptar
  if (legacyData.token) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días por default

    return {
      accessToken: legacyData.token,
      refreshToken: null, // No hay refresh token en sistema legacy
      expiresAt: expiresAt.toISOString(),
      requiresPasswordChange: false,
      // Mantener compatibilidad con datos legacy
      usernameFallback: legacyData.usernameFallback,
      _migrated: true,
      _migrationDate: now.toISOString()
    };
  }

  return null;
};

/**
 * Migra datos al nuevo formato de forma segura
 */
export const migrateToRefreshTokens = async (legacyData) => {
  try {
    const adapted = adaptLegacyToRefreshToken(legacyData);
    if (!adapted) {
      throw new Error('No se pudo adaptar datos legacy');
    }

    // Guardar en localStorage
    localStorage.setItem('rf_auth', JSON.stringify(adapted));

    return {
      success: true,
      data: adapted,
      migrated: adapted._migrated || false
    };
  } catch (error) {
    console.error('❌ Error en migración de autenticación:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Valida y sanitiza datos de autenticación
 */
export const validateAuthData = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Datos inválidos o nulos' };
  }

  const errors = [];

  // Validación para refresh tokens
  if (FEATURE_FLAGS.REFRESH_TOKEN_ENABLED) {
    if (data.accessToken && typeof data.accessToken !== 'string') {
      errors.push('accessToken debe ser string');
    }

    if (data.refreshToken && typeof data.refreshToken !== 'string') {
      errors.push('refreshToken debe ser string');
    }

    if (data.expiresAt) {
      const expiryDate = new Date(data.expiresAt);
      if (isNaN(expiryDate.getTime())) {
        errors.push('expiresAt debe ser una fecha válida');
      }
    }

    if (data.requiresPasswordChange !== undefined && typeof data.requiresPasswordChange !== 'boolean') {
      errors.push('requiresPasswordChange debe ser booleano');
    }
  }

  // Validación para legacy tokens
  if (FEATURE_FLAGS.LEGACY_TOKEN_SUPPORT) {
    if (data.token && typeof data.token !== 'string') {
      errors.push('token debe ser string');
    }
  }

  // Validación de campos adicionales
  if (data.usernameFallback && typeof data.usernameFallback !== 'string') {
    errors.push('usernameFallback debe ser string');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? data : null
  };
};

/**
 * Limpia datos corruptos o inválidos del storage
 */
export const cleanupCorruptedData = () => {
  try {
    const stored = localStorage.getItem('rf_auth');
    if (!stored) return null;

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch {
      // JSON inválido, limpiar
      localStorage.removeItem('rf_auth');
      return null;
    }

    const validation = validateAuthData(parsed);
    if (!validation.valid) {
      console.warn('⚠️ Datos de autenticación corruptos:', validation.errors);
      localStorage.removeItem('rf_auth');
      return null;
    }

    return validation.sanitized;
  } catch (error) {
    console.error('❌ Error en cleanup de datos:', error);
    localStorage.removeItem('rf_auth');
    return null;
  }
};

/**
 * Determina si el usuario necesita migración
 */
export const needsMigration = () => {
  const stored = localStorage.getItem('rf_auth');
  if (!stored) return false;

  try {
    const parsed = JSON.parse(stored);
    const state = detectAuthState(parsed);

    return state === MIGRATION_STATES.LEGACY || state === MIGRATION_STATES.HYBRID;
  } catch {
    return true; // Si hay error, mejor migrar
  }
};

/**
 * Rollback seguro al sistema legacy
 */
export const rollbackToLegacy = () => {
  try {
    const current = localStorage.getItem('rf_auth');
    if (!current) return false;

    const parsed = JSON.parse(current);

    // Si hay token legacy, preservarlo
    if (parsed.token || parsed._originalToken) {
      const legacyData = {
        token: parsed.token || parsed._originalToken,
        usernameFallback: parsed.usernameFallback
      };

      localStorage.setItem('rf_auth', JSON.stringify(legacyData));
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error en rollback:', error);
    return false;
  }
};

/**
 * Sistema de compatibilidad backward/forward
 */
export class AuthCompatibilityManager {
  constructor() {
    this.state = detectAuthState(this.getCurrentData());
    this.migrationAttempts = 0;
    this.maxMigrationAttempts = 3;
  }

  getCurrentData() {
    try {
      const stored = localStorage.getItem('rf_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async ensureCompatibility() {
    if (!FEATURE_FLAGS.MIGRATION_MODE_ENABLED) {
      return { success: true, action: 'no-migration-needed' };
    }

    const currentData = this.getCurrentData();
    const currentState = detectAuthState(currentData);

    switch (currentState) {
      case MIGRATION_STATES.LEGACY:
        return await this.migrateFromLegacy(currentData);

      case MIGRATION_STATES.HYBRID:
        return await this.resolveHybridState(currentData);

      case MIGRATION_STATES.MIGRATING:
        return await this.completeMigration(currentData);

      case MIGRATION_STATES.REFRESH_TOKEN:
        return { success: true, action: 'already-migrated' };

      default:
        return { success: false, error: 'Estado desconocido' };
    }
  }

  async migrateFromLegacy(legacyData) {
    if (this.migrationAttempts >= this.maxMigrationAttempts) {
      return { success: false, error: 'Máximo de intentos de migración alcanzado' };
    }

    this.migrationAttempts++;

    try {
      const result = await migrateToRefreshTokens(legacyData);
      if (result.success) {
        this.state = MIGRATION_STATES.REFRESH_TOKEN;
        return { success: true, action: 'migrated', data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resolveHybridState(hybridData) {
    // Priorizar refresh tokens si están habilitados
    if (FEATURE_FLAGS.REFRESH_TOKEN_ENABLED && hybridData.accessToken) {
      // Limpiar datos legacy
      delete hybridData.token;
      localStorage.setItem('rf_auth', JSON.stringify(hybridData));
      this.state = MIGRATION_STATES.REFRESH_TOKEN;
      return { success: true, action: 'hybrid-resolved' };
    } else {
      // Rollback a legacy
      return this.rollbackToLegacy();
    }
  }

  async completeMigration(partialData) {
    const adapted = adaptLegacyToRefreshToken(partialData);
    if (adapted) {
      localStorage.setItem('rf_auth', JSON.stringify(adapted));
      this.state = MIGRATION_STATES.REFRESH_TOKEN;
      return { success: true, action: 'migration-completed', data: adapted };
    }

    return { success: false, error: 'No se pudo completar migración' };
  }

  rollbackToLegacy() {
    const success = rollbackToLegacy();
    if (success) {
      this.state = MIGRATION_STATES.LEGACY;
      return { success: true, action: 'rollback-completed' };
    }

    return { success: false, error: 'Rollback falló' };
  }

  getMigrationStatus() {
    return {
      state: this.state,
      attempts: this.migrationAttempts,
      needsMigration: needsMigration(),
      featureFlags: {
        refreshEnabled: FEATURE_FLAGS.REFRESH_TOKEN_ENABLED,
        legacySupport: FEATURE_FLAGS.LEGACY_TOKEN_SUPPORT,
        migrationMode: FEATURE_FLAGS.MIGRATION_MODE_ENABLED
      }
    };
  }
}

// Instancia global del manejador
export const authCompatibility = new AuthCompatibilityManager();

// Auto-migración en desarrollo
if (import.meta.env.DEV && needsMigration()) {
  authCompatibility.ensureCompatibility().then(result => {
    if (result.success) {
      console.log('🔄 Auto-migración completada:', result.action);
    } else {
      console.warn('⚠️ Auto-migración falló:', result.error);
    }
  });
}

export default authCompatibility;