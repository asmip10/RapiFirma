// src/utils/authMonitoring.js
/**
 * Sistema simplificado de monitoreo para autenticación
 * Solo logs básicos para desarrollo
 */

export const authMonitor = {
  trackLogin: (success, details = {}) => {
    if (import.meta.env.DEV) {
      console.log(`🔐 Login ${success ? '✅' : '❌'}:`, details);
    }
  },

  trackRefresh: (success, details = {}) => {
    if (import.meta.env.DEV) {
      console.log(`🔄 Refresh ${success ? '✅' : '❌'}:`, details);
    }
  },

  trackLogout: (reason, details = {}) => {
    if (import.meta.env.DEV) {
      console.log(`🚪 Logout: ${reason}`, details);
    }
  },

  trackError: (error, details = {}) => {
    if (import.meta.env.DEV) {
      console.error(`❌ Auth Error: ${error}`, details);
    }
  },

  trackPerformance: (operation, duration, details = {}) => {
    if (import.meta.env.DEV && duration > 1000) {
      console.warn(`⚡ Slow operation: ${operation} (${duration}ms)`, details);
    }
  }
};

export default authMonitor;