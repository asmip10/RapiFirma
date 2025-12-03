// src/utils/authMonitoring.js
/**
 * Sistema de Monitoreo para Authentication Refresh Tokens
 * Métricas, tracking y alertas para el sistema de autenticación
 */

import { isFeatureEnabled } from '@/config/featureFlags';

export class AuthMonitor {
  static instance = null;

  constructor() {
    if (AuthMonitor.instance) {
      return AuthMonitor.instance;
    }

    this.metrics = {
      logins: { success: 0, failed: 0 },
      refreshs: { success: 0, failed: 0 },
      logouts: { manual: 0, expired: 0, forced: 0 },
      errors: {},
      performance: {},
      migration: { legacy: 0, refresh: 0, hybrid: 0 }
    };

    this.startTime = Date.now();
    this.sessionMetrics = new Map();

    // 🚨 FIX CRÍTICO: Memory leak prevention
    this.lastCleanup = Date.now();
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutos
    this.maxSessionAge = 30 * 60 * 1000; // 30 minutos máximo por sesión

    AuthMonitor.instance = this;
  }

  // 📊 Login Metrics
  static trackLogin(success, details = {}) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const timestamp = Date.now();
    const method = details.method || 'refresh';

    if (success) {
      monitor.metrics.logins.success++;
    } else {
      monitor.metrics.logins.failed++;
    }

    // Track specific error types
    if (!success && details.error) {
      const errorKey = details.error.toLowerCase().replace(/\s+/g, '_');
      monitor.metrics.errors[errorKey] = (monitor.metrics.errors[errorKey] || 0) + 1;
    }

    // Log para debugging
    if (import.meta.env.DEV) {
      console.log(`🔐 Login ${success ? '✅' : '❌'}:`, {
        method,
        timestamp,
        details: success ? 'Login successful' : details.error
      });
    }

    // Track en analytics si está disponible
    this.trackAnalytics('auth_login', {
      success,
      method,
      error: details.error,
      timestamp,
      userId: details.userId
    });

    // Alertas automáticas
    this.checkAlerts('login', { success, method, error: details.error });
  }

  // 🔄 Refresh Metrics
  static trackRefresh(success, details = {}) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const timestamp = Date.now();
    const duration = details.duration || 0;

    if (success) {
      monitor.metrics.refreshs.success++;
      monitor.metrics.performance.refresh_avg =
        this.calculateAverage(monitor.metrics.performance.refresh_avg, duration, monitor.metrics.refreshs.success);
    } else {
      monitor.metrics.refreshs.failed++;
    }

    // Track performance issues
    if (duration > 5000) { // 5 segundos
      monitor.metrics.errors.slow_refresh = (monitor.metrics.errors.slow_refresh || 0) + 1;
    }

    if (import.meta.env.DEV) {
      console.log(`🔄 Refresh ${success ? '✅' : '❌'}:`, {
        duration: `${duration}ms`,
        timestamp,
        details
      });
    }

    this.trackAnalytics('auth_refresh', {
      success,
      duration,
      timestamp,
      automatic: details.automatic,
      userId: details.userId
    });

    this.checkAlerts('refresh', { success, duration });

    // 🚨 FIX CRÍTICO: Memory leak prevention cleanup
    this.performCleanupIfNeeded();
  }

  // 🚪 Logout Metrics
  static trackLogout(reason = 'manual', details = {}) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const timestamp = Date.now();

    monitor.metrics.logouts[reason] = (monitor.metrics.logouts[reason] || 0) + 1;

    if (import.meta.env.DEV) {
      console.log(`🚪 Logout:`, { reason, timestamp, details });
    }

    this.trackAnalytics('auth_logout', {
      reason,
      timestamp,
      sessionDuration: details.sessionDuration,
      userId: details.userId
    });
  }

  // 🔄 Migration Metrics
  static trackMigration(from, to, success = true) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const timestamp = Date.now();

    monitor.metrics.migration[from] = (monitor.metrics.migration[from] || 0) + 1;

    if (import.meta.env.DEV) {
      console.log(`🔄 Migration ${success ? '✅' : '❌'}:`, { from, to, timestamp });
    }

    this.trackAnalytics('auth_migration', {
      from,
      to,
      success,
      timestamp
    });
  }

  // ⚠️ Error Tracking
  static trackError(error, context = {}) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const errorKey = error.name || error.type || 'unknown_error';
    const timestamp = Date.now();

    monitor.metrics.errors[errorKey] = (monitor.metrics.errors[errorKey] || 0) + 1;

    if (import.meta.env.DEV) {
      console.error(`❌ Auth Error:`, { error: errorKey, message: error.message, context, timestamp });
    }

    this.trackAnalytics('auth_error', {
      error: errorKey,
      message: error.message,
      context,
      timestamp
    });

    // Alertas críticas
    if (this.isCriticalError(error)) {
      this.sendCriticalAlert(error, context);
    }
  }

  // 📈 Performance Metrics
  static trackPerformance(operation, duration, details = {}) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const timestamp = Date.now();

    monitor.metrics.performance[operation] = monitor.metrics.performance[operation] || {
      count: 0,
      total: 0,
      avg: 0,
      min: Infinity,
      max: 0
    };

    const perf = monitor.metrics.performance[operation];
    perf.count++;
    perf.total += duration;
    perf.avg = perf.total / perf.count;
    perf.min = Math.min(perf.min, duration);
    perf.max = Math.max(perf.max, duration);

    if (import.meta.env.DEV) {
      console.log(`⚡ Performance:`, { operation, duration: `${duration}ms`, avg: `${perf.avg.toFixed(2)}ms` });
    }
  }

  // 🎯 Session Metrics
  static startSession(userId, sessionId) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const timestamp = Date.now();

    monitor.sessionMetrics.set(sessionId, {
      userId,
      startTime: timestamp,
      lastActivity: timestamp,
      refreshCount: 0,
      errorCount: 0
    });
  }

  static updateSession(sessionId, activity = {}) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const session = monitor.sessionMetrics.get(sessionId);

    if (session) {
      session.lastActivity = Date.now();

      if (activity.refresh) {
        session.refreshCount++;
      }

      if (activity.error) {
        session.errorCount++;
      }
    }
  }

  static endSession(sessionId) {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    const session = monitor.sessionMetrics.get(sessionId);

    if (session) {
      const duration = Date.now() - session.startTime;

      // Track session metrics
      this.trackAnalytics('auth_session_end', {
        userId: session.userId,
        duration,
        refreshCount: session.refreshCount,
        errorCount: session.errorCount
      });

      monitor.sessionMetrics.delete(sessionId);
    }
  }

  // 📊 Get Metrics
  static getMetrics() {
    const monitor = AuthMonitor.getInstance();
    const uptime = Date.now() - monitor.startTime;

    return {
      uptime,
      ...monitor.metrics,
      activeSessions: monitor.sessionMetrics.size,
      timestamp: Date.now()
    };
  }

  static getSessionMetrics() {
    const monitor = AuthMonitor.getInstance();
    return Array.from(monitor.sessionMetrics.entries()).map(([sessionId, session]) => ({
      sessionId,
      ...session
    }));
  }

  // 🔄 Reset Metrics
  static resetMetrics() {
    if (!isFeatureEnabled('AUTH_MONITORING_ENABLED')) return;

    const monitor = AuthMonitor.getInstance();
    monitor.metrics = {
      logins: { success: 0, failed: 0 },
      refreshs: { success: 0, failed: 0 },
      logouts: { manual: 0, expired: 0, forced: 0 },
      errors: {},
      performance: {},
      migration: { legacy: 0, refresh: 0, hybrid: 0 }
    };
    monitor.sessionMetrics.clear();
    monitor.startTime = Date.now();
  }

  // 🔧 Utility Methods
  static getInstance() {
    if (!AuthMonitor.instance) {
      AuthMonitor.instance = new AuthMonitor();
    }
    return AuthMonitor.instance;
  }

  static calculateAverage(currentAvg, newValue, count) {
    if (count === 1) return newValue;
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  static isCriticalError(error) {
    const criticalErrors = [
      'RefreshTokenExpired',
      'InvalidToken',
      'AuthenticationFailed',
      'SecurityViolation'
    ];
    return criticalErrors.includes(error.name || error.type);
  }

  // 🚨 FIX CRÍTICO: Memory leak prevention method
  static performCleanupIfNeeded() {
    const monitor = AuthMonitor.getInstance();
    const now = Date.now();

    // Ejecutar cleanup cada 5 minutos
    if (now - monitor.lastCleanup > monitor.cleanupInterval) {
      monitor.cleanupExpiredSessions();
      monitor.lastCleanup = now;

      if (import.meta.env.DEV) {
        const activeSessions = monitor.sessionMetrics.size;
        console.log(`🧹 AuthMonitor cleanup: ${activeSessions} active sessions`);
      }
    }
  }

  // 🚨 FIX CRÍTICO: Cleanup de sesiones expiradas
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    this.sessionMetrics.forEach((sessionData, sessionId) => {
      if (now - sessionData.startTime > this.maxSessionAge) {
        this.sessionMetrics.delete(sessionId);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  // 🚨 Alert System
  static checkAlerts(type, data) {
    const monitor = AuthMonitor.getInstance();

    // Alerta de alto error rate
    if (type === 'login' && !data.success) {
      const errorRate = monitor.metrics.logins.failed / (monitor.metrics.logins.success + monitor.metrics.logins.failed);
      if (errorRate > 0.1 && monitor.metrics.logins.failed > 10) { // >10% error rate
        this.sendAlert('HIGH_LOGIN_ERROR_RATE', { errorRate, totalFailures: monitor.metrics.logins.failed });
      }
    }

    // Alerta de refresh lento
    if (type === 'refresh' && data.duration > 10000) { // >10 segundos
      this.sendAlert('SLOW_REFRESH', { duration: data.duration });
    }

    // Alerta de refresh failures
    if (type === 'refresh' && !data.success) {
      const refreshErrorRate = monitor.metrics.refreshs.failed / (monitor.metrics.refreshs.success + monitor.metrics.refreshs.failed);
      if (refreshErrorRate > 0.2 && monitor.metrics.refreshs.failed > 5) { // >20% error rate
        this.sendAlert('HIGH_REFRESH_ERROR_RATE', { errorRate: refreshErrorRate });
      }
    }
  }

  static sendAlert(type, data) {
    console.warn(`🚨 Auth Alert: ${type}`, data);

    // Aquí se podría integrar con sistemas de alertas reales
    // como Slack, Discord, Sentry, etc.

    this.trackAnalytics('auth_alert', {
      alertType: type,
      data,
      timestamp: Date.now()
    });
  }

  static sendCriticalAlert(error, context) {
    console.error(`🚨🚨 CRITICAL Auth Error:`, { error, context });

    this.trackAnalytics('auth_critical_alert', {
      error: error.name,
      message: error.message,
      context,
      timestamp: Date.now()
    });
  }

  // 📊 Analytics Integration
  static trackAnalytics(event, data) {
    // Integración con Google Analytics, Mixpanel, etc.
    if (window.gtag) {
      window.gtag('event', event, data);
    }

    if (window.mixpanel) {
      window.mixpanel.track(event, data);
    }

    // Placeholder para otros sistemas de analytics
  }

  // 📋 Health Check
  static getHealthStatus() {
    const metrics = this.getMetrics();
    const health = {
      status: 'healthy',
      issues: [],
      score: 100
    };

    // Check login error rate
    const totalLogins = metrics.logins.success + metrics.logins.failed;
    if (totalLogins > 50) {
      const errorRate = metrics.logins.failed / totalLogins;
      if (errorRate > 0.1) {
        health.issues.push('High login error rate');
        health.score -= 20;
      }
    }

    // Check refresh error rate
    const totalRefreshs = metrics.refreshs.success + metrics.refreshs.failed;
    if (totalRefreshs > 20) {
      const refreshErrorRate = metrics.refreshs.failed / totalRefreshs;
      if (refreshErrorRate > 0.2) {
        health.issues.push('High refresh error rate');
        health.score -= 25;
      }
    }

    // Check performance
    if (metrics.performance.refresh_avg > 5000) {
      health.issues.push('Slow refresh performance');
      health.score -= 15;
    }

    if (health.score < 80) {
      health.status = 'degraded';
    } else if (health.score < 60) {
      health.status = 'unhealthy';
    }

    return health;
  }
}

// Auto-initialize
const authMonitor = AuthMonitor.getInstance();

export default authMonitor;