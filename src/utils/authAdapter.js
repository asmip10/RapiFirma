// src/utils/authAdapter.js
/**
 * Sistema de validación simplificado para datos de autenticación
 * Sin migración ni compatibilidad con sistemas antiguos
 */

export const validateAuthData = (data) => {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Datos inválidos: se espera objeto']
    };
  }

  const errors = [];

  // Validar accessToken (requerido)
  if (!data.accessToken || typeof data.accessToken !== 'string') {
    errors.push('AccessToken es requerido y debe ser string');
  }

  // Validar refreshToken (opcional)
  if (data.refreshToken && typeof data.refreshToken !== 'string') {
    errors.push('RefreshToken debe ser string si está presente');
  }

  // Validar expiresAt (opcional)
  if (data.expiresAt) {
    const expiresDate = new Date(data.expiresAt);
    if (isNaN(expiresDate.getTime())) {
      errors.push('ExpiresAt debe ser una fecha válida');
    }
  }

  // Validar requiresPasswordChange (opcional)
  if (data.requiresPasswordChange !== undefined && typeof data.requiresPasswordChange !== 'boolean') {
    errors.push('RequiresPasswordChange debe ser booleano');
  }

  // Validar user (opcional)
  if (data.user && typeof data.user !== 'object') {
    errors.push('User debe ser objeto si está presente');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      data: null
    };
  }

  return {
    valid: true,
    data: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || null,
      expiresAt: data.expiresAt || null,
      requiresPasswordChange: data.requiresPasswordChange || false,
      user: data.user || null
    }
  };
};

// Exportar funciones básicas para compatibilidad
export const authCompatibility = {
  ensureCompatibility: async () => ({ success: true, message: 'No migration needed' })
};

export const MIGRATION_STATES = {
  REFRESH_TOKEN: 'refresh'
};