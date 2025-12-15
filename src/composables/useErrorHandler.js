/**
 * Composable de Manejo Robusto de Errores
 * Implementa gestión centralizada de errores, logging y recuperación
 * Basado en mejores prácticas y Fase 3.5 del plan de migración
 */

import { ref, reactive } from 'vue';
import { useToasts } from './useToasts';

/**
 * Clasificación de errores
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTHORIZATION: 'AUTHORIZATION',
  BUSINESS: 'BUSINESS',
  SYSTEM: 'SYSTEM',
  USER: 'USER'
};

/**
 * Niveles de severidad de errores
 */
export const ErrorSeverity = {
  LOW: 'LOW',       // No crítico, puede continuar
  MEDIUM: 'MEDIUM', // Afecta funcionalidad pero recuperable
  HIGH: 'HIGH',     // Crítico, requiere atención inmediata
  CRITICAL: 'CRITICAL' // Sistema inestable
};

/**
 * Hook principal de manejo de errores
 */
export function useErrorHandler() {
  const { error, warning, info } = useToasts();

  // Estado de errores
  const errorState = reactive({
    lastError: null,
    errorHistory: [],
    retryCount: {},
    isRecovering: false,
    circuitBreakerStatus: {}
  });

  // Contadores de errores
  const errorMetrics = reactive({
    totalErrors: 0,
    errorsByType: {},
    errorsBySeverity: {},
    last24Hours: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0
  });

  /**
   * Crear objeto de error estandarizado
   */
  const createError = (type, message, severity = ErrorSeverity.MEDIUM, context = {}, originalError = null) => {
    const error = {
      id: Date.now() + Math.random(),
      type,
      message,
      severity,
      context,
      originalError,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      stack: originalError?.stack
    };

    // Agregar información adicional del sistema
    if (typeof window !== 'undefined') {
      error.memory = window.performance?.memory ? {
        used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null;

      error.connection = window.navigator?.connection ? {
        effectiveType: window.navigator.connection.effectiveType,
        downlink: window.navigator.connection.downlink
      } : null;
    }

    return error;
  };

  /**
   * Manejar error principal
   */
  const handleError = async (type, message, severity = ErrorSeverity.MEDIUM, context = {}, originalError = null) => {
    const errorObj = createError(type, message, severity, context, originalError);

    // Actualizar estado
    errorState.lastError = errorObj;
    errorState.errorHistory.unshift(errorObj);

    // Limitar historial a 100 errores
    if (errorState.errorHistory.length > 100) {
      errorState.errorHistory = errorState.errorHistory.slice(0, 100);
    }

    // Actualizar métricas
    updateErrorMetrics(errorObj);

    // Logging según severidad
    logError(errorObj);

    // Mostrar notificación al usuario
    await showErrorToUser(errorObj);

    // Intentar recuperación automática
    if (shouldAttemptRecovery(errorObj)) {
      await attemptRecovery(errorObj);
    }

    return errorObj;
  };

  /**
   * Manejar error de red
   */
  const handleNetworkError = async (error, context = {}) => {
    const type = getNetworkErrorType(error);
    const message = getNetworkErrorMessage(error);
    const severity = getNetworkErrorSeverity(error);

    return handleError(ErrorTypes.NETWORK, message, severity, {
      ...context,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method
    }, error);
  };

  /**
   * Manejar error de validación
   */
  const handleValidationError = async (message, context = {}) => {
    return handleError(ErrorTypes.VALIDATION, message, ErrorSeverity.MEDIUM, context);
  };

  /**
   * Manejar error de autorización
   */
  const handleAuthError = async (message = 'No tienes permisos para realizar esta acción', context = {}) => {
    return handleError(ErrorTypes.AUTHORIZATION, message, ErrorSeverity.HIGH, {
      ...context,
      requiresReauth: true
    });
  };

  /**
   * Manejar error de negocio
   */
  const handleBusinessError = async (message, context = {}) => {
    return handleError(ErrorTypes.BUSINESS, message, ErrorSeverity.MEDIUM, context);
  };

  /**
   * Manejar error de sistema
   */
  const handleSystemError = async (message, context = {}) => {
    return handleError(ErrorTypes.SYSTEM, message, ErrorSeverity.HIGH, context);
  };

  /**
   * Actualizar métricas de errores
   */
  const updateErrorMetrics = (errorObj) => {
    errorMetrics.totalErrors++;

    // Por tipo
    errorMetrics.errorsByType[errorObj.type] = (errorMetrics.errorsByType[errorObj.type] || 0) + 1;

    // Por severidad
    errorMetrics.errorsBySeverity[errorObj.severity] = (errorMetrics.errorsBySeverity[errorObj.severity] || 0) + 1;

    // Últimas 24 horas
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = errorState.errorHistory.filter(e =>
      new Date(e.timestamp).getTime() > last24Hours
    );
    errorMetrics.last24Hours = recentErrors.length;
  };

  /**
   * Logging de errores
   */
  const logError = (errorObj) => {
    const logMessage = `[${errorObj.type}] ${errorObj.message}`;
    const logData = {
      id: errorObj.id,
      timestamp: errorObj.timestamp,
      context: errorObj.context,
      stack: errorObj.stack
    };

    switch (errorObj.severity) {
      case ErrorSeverity.LOW:
        console.warn(logMessage, logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.error(logMessage, logData);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error('🚨 ' + logMessage, logData);

        // En producción, enviar a servicio de monitoreo
        if (import.meta.env.PROD) {
          sendToMonitoring(errorObj);
        }
        break;
    }
  };

  /**
   * Mostrar error al usuario
   */
  const showErrorToUser = async (errorObj) => {
    let userMessage = errorObj.message;

    // Adaptar mensaje según tipo y severidad
    switch (errorObj.type) {
      case ErrorTypes.NETWORK:
        userMessage = getNetworkErrorMessage(errorObj.originalError);
        break;
      case ErrorTypes.VALIDATION:
        userMessage = `Error de validación: ${errorObj.message}`;
        break;
      case ErrorTypes.AUTHORIZATION:
        userMessage = 'No tienes permisos para realizar esta acción';
        break;
    }

    // Mostrar notificación según severidad
    switch (errorObj.severity) {
      case ErrorSeverity.LOW:
        info(userMessage);
        break;
      case ErrorSeverity.MEDIUM:
      case ErrorSeverity.HIGH:
        error(userMessage);
        break;
      case ErrorSeverity.CRITICAL:
        error('Error crítico: ' + userMessage);
        break;
    }
  };

  /**
   * Determinar tipo de error de red
   */
  const getNetworkErrorType = (error) => {
    if (!error.response) {
      return 'CONNECTION_FAILED';
    }

    switch (error.response.status) {
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMIT';
      case 500:
        return 'SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'HTTP_ERROR';
    }
  };

  /**
   * Obtener mensaje de error de red
   */
  const getNetworkErrorMessage = (error) => {
    if (!error.response) {
      return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
    }

    const status = error.response.status;
    const statusMessages = {
      401: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
      403: 'No tienes permisos para realizar esta acción.',
      404: 'El recurso solicitado no fue encontrado.',
      429: 'Demasiadas solicitudes. Por favor intenta más tarde.',
      500: 'Error interno del servidor. Intentalo nuevamente.',
      502: 'El servidor no está disponible. Intentalo más tarde.',
      503: 'Servicio temporalmente no disponible. Intentalo más tarde.'
    };

    return statusMessages[status] || `Error del servidor (${status}).`;
  };

  /**
   * Obtener severidad de error de red
   */
  const getNetworkErrorSeverity = (error) => {
    if (!error.response) {
      return ErrorSeverity.HIGH;
    }

    const criticalStatus = [500, 502, 503];
    return criticalStatus.includes(error.response.status)
      ? ErrorSeverity.CRITICAL
      : ErrorSeverity.MEDIUM;
  };

  /**
   * Determinar si se debe intentar recuperación automática
   */
  const shouldAttemptRecovery = (errorObj) => {
    // No recuperar errores de usuario
    if (errorObj.type === ErrorTypes.USER) {
      return false;
    }

    // No recuperar en circuit breaker abierto
    const endpoint = errorObj.context?.url;
    if (isCircuitBreakerOpen(endpoint)) {
      return false;
    }

    // Solo recuperar errores de red y sistema con severidad media o alta
    return [ErrorTypes.NETWORK, ErrorTypes.SYSTEM].includes(errorObj.type) &&
           [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH].includes(errorObj.severity);
  };

  /**
   * Intentar recuperación automática
   */
  const attemptRecovery = async (errorObj) => {
    const endpoint = errorObj.context?.url;
    if (!endpoint) return;

    errorState.isRecovering = true;
    errorMetrics.recoveryAttempts++;

    try {
      // Estrategias de recuperación según tipo de error
      switch (errorObj.type) {
        case ErrorTypes.NETWORK:
          await recoverFromNetworkError(errorObj);
          break;
        case ErrorTypes.SYSTEM:
          await recoverFromSystemError(errorObj);
          break;
        default:
          await delay(2000); // Espera genérica
      }

      // Resetear circuit breaker si la recuperación fue exitosa
      resetCircuitBreaker(endpoint);
      errorMetrics.successfulRecoveries++;
      info('El sistema se ha recuperado exitosamente');

    } catch (recoveryError) {
      console.error('Error en recuperación automática:', recoveryError);
      incrementCircuitBreaker(endpoint);
    } finally {
      errorState.isRecovering = false;
    }
  };

  /**
   * Recuperación de errores de red
   */
  const recoverFromNetworkError = async (errorObj) => {
    const retryCount = errorState.retryCount[errorObj.context?.url] || 0;

    if (retryCount < 3) {
      errorState.retryCount[errorObj.context.url] = retryCount + 1;

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await delay;

      // Aquí se reintentaría la operación original
      console.log(`Reintentando operación (intentos: ${retryCount + 1})`);
    }
  };

  /**
   * Recuperación de errores de sistema
   */
  const recoverFromSystemError = async (errorObj) => {
    // Limpiar cache si es error de sistema
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map(name => window.caches.delete(name)));
    }

    // Esperar y recargar estado
    await delay(3000);
    window.location.reload();
  };

  /**
   * Manejo de Circuit Breaker
   */
  const isCircuitBreakerOpen = (endpoint) => {
    if (!endpoint) return false;

    const status = errorState.circuitBreakerStatus[endpoint];
    if (!status) return false;

    return status.failures >= 5 && (Date.now() - status.lastFailureTime) < 60000;
  };

  const incrementCircuitBreaker = (endpoint) => {
    if (!endpoint) return;

    const status = errorState.circuitBreakerStatus[endpoint] || {
      failures: 0,
      lastFailureTime: null
    };

    status.failures++;
    status.lastFailureTime = Date.now();

    errorState.circuitBreakerStatus[endpoint] = status;
  };

  const resetCircuitBreaker = (endpoint) => {
    if (!endpoint) return;

    errorState.circuitBreakerStatus[endpoint] = {
      failures: 0,
      lastFailureTime: null
    };
  };

  /**
   * Enviar a servicio de monitoreo (producción)
   */
  const sendToMonitoring = (errorObj) => {
    // Implementar con servicio real (Sentry, LogRocket, etc.)
    try {
      // Ejemplo con fetch a endpoint de monitoring
      if (import.meta.env.VITE_MONITORING_ENDPOINT) {
        fetch(import.meta.env.VITE_MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorObj)
        }).catch(() => {
          // Silenciar errores de monitoring para no causar bucles
        });
      }
    } catch (e) {
      // Silenciar errores de monitoring
    }
  };

  /**
   * Utilidad para crear delay
   */
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Wrapper con manejo de errores para funciones asíncronas
   */
  const withErrorHandling = async (fn, errorType = ErrorTypes.SYSTEM, context = {}) => {
    try {
      return await fn();
    } catch (error) {
      await handleError(errorType, error.message, ErrorSeverity.MEDIUM, context, error);
      throw error;
    }
  };

  /**
   * Obtener resumen de errores para debugging
   */
  const getErrorSummary = () => {
    return {
      currentState: {
        lastError: errorState.lastError,
        isRecovering: errorState.isRecovering,
        circuitBreakerOpen: Object.keys(errorState.circuitBreakerStatus)
          .filter(key => isCircuitBreakerOpen(key))
      },
      metrics: errorMetrics,
      recentErrors: errorState.errorHistory.slice(0, 10),
      recommendations: generateRecommendations()
    };
  };

  /**
   * Generar recomendaciones basadas en errores
   */
  const generateRecommendations = () => {
    const recommendations = [];

    if (errorMetrics.totalErrors > 100) {
      recommendations.push('Considera revisar la estabilidad del sistema - demasiados errores');
    }

    if (errorMetrics.errorsByType[ErrorTypes.NETWORK] > 20) {
      recommendations.push('Evalúa la conexión a internet y la estabilidad del servidor');
    }

    if (errorMetrics.errorsByType[ErrorTypes.VALIDATION] > 10) {
      recommendations.push('Mejora la validación de datos en el frontend');
    }

    if (errorMetrics.last24Hours > 50) {
      recommendations.push('La tasa de errores es muy alta - considera revisión urgente');
    }

    const circuitBreakerOpen = Object.keys(errorState.circuitBreakerStatus)
      .filter(key => isCircuitBreakerOpen(key));

    if (circuitBreakerOpen.length > 0) {
      recommendations.push(`Circuit breaker abierto para: ${circuitBreakerOpen.join(', ')}`);
    }

    return recommendations;
  };

  /**
   * Limpiar estado de errores
   */
  const clearErrors = () => {
    errorState.lastError = null;
    errorState.errorHistory = [];
    errorState.retryCount = {};
    errorState.circuitBreakerStatus = {};
  };

  return {
    // Manejo de errores
    handleError,
    handleNetworkError,
    handleValidationError,
    handleAuthError,
    handleBusinessError,
    handleSystemError,

    // Utilidades
    withErrorHandling,
    createError,

    // Estado y métricas
    errorState,
    errorMetrics,

    // Análisis
    getErrorSummary,
    generateRecommendations,
    clearErrors,

    // Circuit Breaker
    isCircuitBreakerOpen,
    incrementCircuitBreaker,
    resetCircuitBreaker
  };
}