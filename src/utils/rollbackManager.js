// src/utils/rollbackManager.js
/**
 * Sistema de Rollback Seguro para Refresh Tokens
 * Permite revertir cambios de forma controlada y segura
 */

import { isFeatureEnabled } from '@/config/featureFlags';
import { authCompatibility } from './authAdapter';
import authMonitor from './authMonitoring';

export class RollbackManager {
  static instance = null;

  constructor() {
    if (RollbackManager.instance) {
      return RollbackManager.instance;
    }

    this.rollbackStates = {
      CURRENT: 'current',     // Estado actual
      ROLLING_BACK: 'rolling_back', // En proceso de rollback
      ROLLED_BACK: 'rolled_back',   // Rollback completado
      FAILED: 'failed'        // Rollback falló
    };

    this.rollbackHistory = [];
    this.currentRollback = null;
    this.rollbackTriggers = [];

    // 🚨 FIX CRÍTICO: Grace period para auto-rollback
    this.consecutiveHealthChecks = {
      bad: 0,
      good: 0,
      lastCheck: Date.now()
    };
    this.GRACE_PERIOD_CHECKS = 3; // Requerir 3 checks consecutivos malos
    this.GRACE_PERIOD_RESET = 60000; // Reset después de 1 minuto de bueno

    RollbackManager.instance = this;
  }

  // 🚨 Iniciar Rollback
  static async initiateRollback(options = {}) {
    if (!isFeatureEnabled('ROLLBACK_SUPPORT_ENABLED')) {
      throw new Error('Rollback support is not enabled');
    }

    const manager = RollbackManager.getInstance();

    try {
      const rollbackId = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const rollback = {
        id: rollbackId,
        timestamp: Date.now(),
        reason: options.reason || 'Manual rollback triggered',
        initiatedBy: options.initiatedBy || 'system',
        targetState: options.targetState || 'LEGACY',
        status: manager.rollbackStates.ROLLING_BACK,
        progress: 0,
        steps: [],
        metadata: options.metadata || {}
      };

      manager.currentRollback = rollback;

      authMonitor.trackAnalytics('rollback_initiated', {
        rollbackId,
        reason: rollback.reason,
        targetState: rollback.targetState
      });

      if (import.meta.env.DEV) {
        console.log('🚨 initiating Rollback:', rollback);
      }

      // Ejecutar rollback
      const result = await manager.executeRollback(rollback);

      manager.rollbackHistory.push(rollback);
      return result;

    } catch (error) {
      authMonitor.trackError(error, { context: 'rollback_initiation' });
      throw error;
    }
  }

  // 🔧 Ejecutar Rollback
  async executeRollback(rollback) {
    const steps = [
      { name: 'disable_refresh_tokens', weight: 20 },
      { name: 'migrate_to_legacy', weight: 30 },
      { name: 'clear_new_storage', weight: 20 },
      { name: 'validate_legacy_state', weight: 20 },
      { name: 'update_feature_flags', weight: 10 }
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const progress = Math.round(((i + 1) / steps.length) * 100);

        rollback.progress = progress;
        rollback.steps.push({
          name: step.name,
          status: 'running',
          timestamp: Date.now()
        });

        await this.executeRollbackStep(step, rollback);

        rollback.steps[rollback.steps.length - 1].status = 'completed';

        if (import.meta.env.DEV) {
          console.log(`✅ Rollback step completed: ${step.name} (${progress}%)`);
        }
      }

      rollback.status = this.rollbackStates.ROLLED_BACK;

      authMonitor.trackAnalytics('rollback_completed', {
        rollbackId: rollback.id,
        success: true,
        totalSteps: steps.length
      });

      return {
        success: true,
        rollbackId: rollback.id,
        message: 'Rollback completed successfully'
      };

    } catch (error) {
      rollback.status = this.rollbackStates.FAILED;

      authMonitor.trackError(error, {
        context: 'rollback_execution',
        rollbackId: rollback.id,
        step: rollback.steps[rollback.steps.length - 1]?.name
      });

      // Intentar recuperación
      await this.attemptRecovery(rollback);

      throw error;
    }
  }

  // 📋 Ejecutar paso específico de rollback
  async executeRollbackStep(step, rollback) {
    switch (step.name) {
      case 'disable_refresh_tokens':
        await this.disableRefreshTokens();
        break;

      case 'migrate_to_legacy':
        await this.migrateToLegacy();
        break;

      case 'clear_new_storage':
        await this.clearNewStorage();
        break;

      case 'validate_legacy_state':
        await this.validateLegacyState();
        break;

      case 'update_feature_flags':
        await this.updateFeatureFlags();
        break;

      default:
        throw new Error(`Unknown rollback step: ${step.name}`);
    }
  }

  // 🔒 Deshabilitar Refresh Tokens
  async disableRefreshTokens() {
    // Actualizar feature flags en runtime
    if (typeof window !== 'undefined') {
      // Esto requeriría implementación de hot reload de feature flags
      localStorage.setItem('rollback_flags', JSON.stringify({
        REFRESH_TOKEN_ENABLED: false,
        AUTO_REFRESH_ENABLED: false,
        ROLLBACK_MODE: true
      }));
    }

    // Notificar al sistema que está en modo rollback
    authMonitor.trackAnalytics('rollback_step_disable_refresh', {
      timestamp: Date.now()
    });
  }

  // 🔄 Migrar a Legacy
  async migrateToLegacy() {
    const success = await authCompatibility.rollbackToLegacy();

    if (!success) {
      throw new Error('Failed to migrate to legacy auth system');
    }

    authMonitor.trackMigration('refresh', 'legacy', true);
  }

  // 🧹 Limpiar Storage Nuevo
  async clearNewStorage() {
    const stored = localStorage.getItem('rf_auth');
    if (!stored) return;

    try {
      const data = JSON.parse(stored);

      // Preservar solo datos legacy
      const legacyData = {
        token: data.token || data._originalToken,
        usernameFallback: data.usernameFallback
      };

      if (legacyData.token) {
        localStorage.setItem('rf_auth', JSON.stringify(legacyData));
      } else {
        localStorage.removeItem('rf_auth');
      }

      // Limpiar datos adicionales del nuevo sistema
      localStorage.removeItem('rf_refresh_state');
      localStorage.removeItem('rf_migration_data');

      authMonitor.trackAnalytics('rollback_step_clear_storage', {
        itemsCleared: ['rf_refresh_state', 'rf_migration_data']
      });

    } catch (error) {
      authMonitor.trackError(error, { context: 'rollback_clear_storage' });
      throw new Error('Failed to clear new storage data');
    }
  }

  // ✅ Validar Estado Legacy
  async validateLegacyState() {
    const stored = localStorage.getItem('rf_auth');
    if (!stored) {
      throw new Error('No auth data found after rollback');
    }

    try {
      const data = JSON.parse(stored);

      // Verificar que solo existan datos legacy
      if (!data.token) {
        throw new Error('Legacy token not found after rollback');
      }

      // Verificar que no existan datos del nuevo sistema
      if (data.accessToken || data.refreshToken) {
        throw new Error('New auth system data still present after rollback');
      }

      authMonitor.trackAnalytics('rollback_step_validate_legacy', {
        hasToken: !!data.token,
        hasUsername: !!data.usernameFallback
      });

    } catch (error) {
      authMonitor.trackError(error, { context: 'rollback_validate_legacy' });
      throw error;
    }
  }

  // 🔧 Actualizar Feature Flags
  async updateFeatureFlags() {
    // Esto requeriría integración con un sistema de feature flags
    // que permita actualización en runtime

    const rollbackFlags = {
      VITE_FF_REFRESH_TOKEN: 'false',
      VITE_FF_AUTO_REFRESH: 'false',
      VITE_FF_ROLLBACK_MODE: 'true',
      ROLLBACK_TIMESTAMP: Date.now()
    };

    // Guardar flags de rollback
    sessionStorage.setItem('rollback_flags', JSON.stringify(rollbackFlags));

    authMonitor.trackAnalytics('rollback_step_update_flags', rollbackFlags);
  }

  // 🔄 Intentar Recuperación
  async attemptRecovery(rollback) {
    try {
      // Implementar lógica de recuperación automática
      rollback.recoveryAttempted = true;
      rollback.recoveryTimestamp = Date.now();

      // Intentar volver a un estado estable
      await this.clearNewStorage();
      await this.validateLegacyState();

      rollback.recoverySuccessful = true;

      authMonitor.trackAnalytics('rollback_recovery', {
        rollbackId: rollback.id,
        success: true
      });

    } catch (error) {
      rollback.recoverySuccessful = false;
      authMonitor.trackError(error, {
        context: 'rollback_recovery',
        rollbackId: rollback.id
      });
    }
  }

  // 📊 Estado del Rollback
  static getRollbackStatus() {
    const manager = RollbackManager.getInstance();

    return {
      currentRollback: manager.currentRollback,
      history: manager.rollbackHistory,
      canRollback: isFeatureEnabled('ROLLBACK_SUPPORT_ENABLED'),
      lastRollback: manager.rollbackHistory[manager.rollbackHistory.length - 1]
    };
  }

  // 🔍 Verificar si se puede hacer rollback
  static canRollback() {
    return isFeatureEnabled('ROLLBACK_SUPPORT_ENABLED') &&
           !RollbackManager.getInstance().currentRollback?.status === 'rolling_back';
  }

  // 🎯 Auto-Rollback basado en métricas con GRACE PERIOD
  static checkAutoRollback() {
    if (!isFeatureEnabled('AUTO_ROLLBACK_ENABLED')) return;

    const health = authMonitor.getHealthStatus();
    const manager = this.getInstance();
    const now = Date.now();

    // 🚨 FIX CRÍTICO: Implementar grace period
    const isHealthBad = health.status === 'unhealthy' || health.score < 50;

    if (isHealthBad) {
      manager.consecutiveHealthChecks.bad++;
      manager.consecutiveHealthChecks.good = 0;
      manager.consecutiveHealthChecks.lastCheck = now;

      // Solo activar rollback después de N checks consecutivos malos
      if (manager.consecutiveHealthChecks.bad >= manager.GRACE_PERIOD_CHECKS) {
        const issues = health.issues.join(', ');

        // Verificar que no haya un rollback ya en curso
        if (!manager.currentRollback || manager.currentRollback.status !== 'rolling_back') {
          console.warn(`🚨 Auto-rollback triggered after ${manager.consecutiveHealthChecks.bad} consecutive bad health checks`);

          this.initiateRollback({
            reason: 'Auto-rollback triggered by health monitoring',
            initiatedBy: 'auto_monitor',
            targetState: 'LEGACY',
            metadata: {
              healthScore: health.score,
              issues,
              healthStatus: health.status,
              consecutiveBadChecks: manager.consecutiveHealthChecks.bad
            }
          });
        }
      }
    } else {
      // Reset contador si el sistema está bien
      manager.consecutiveHealthChecks.good++;
      if (manager.consecutiveHealthChecks.good > 0 && now - manager.consecutiveHealthChecks.lastCheck > manager.GRACE_PERIOD_RESET) {
        manager.consecutiveHealthChecks.bad = 0;
        manager.consecutiveHealthChecks.good = 0;
      }
    }

    // Log para debugging en desarrollo
    if (import.meta.env.DEV) {
      console.log(`📊 Health check: Score=${health.score}, Bad=${manager.consecutiveHealthChecks.bad}/${manager.GRACE_PERIOD_CHECKS}`);
    }
  }

  // 🔔 Configurar Triggers de Rollback
  static configureAutoRollbackTriggers(triggers = []) {
    const manager = RollbackManager.getInstance();
    manager.rollbackTriggers = [
      {
        name: 'high_error_rate',
        condition: (metrics) => {
          const totalLogins = metrics.logins.success + metrics.logins.failed;
          return totalLogins > 100 && (metrics.logins.failed / totalLogins) > 0.2;
        },
        enabled: true
      },
      {
        name: 'slow_refresh',
        condition: (metrics) => {
          return metrics.performance.refresh_avg > 15000; // 15 segundos
        },
        enabled: true
      },
      {
        name: 'refresh_failure_rate',
        condition: (metrics) => {
          const totalRefreshs = metrics.refreshs.success + metrics.refreshs.failed;
          return totalRefreshs > 50 && (metrics.refreshs.failed / totalRefreshs) > 0.3;
        },
        enabled: true
      },
      ...triggers
    ];
  }

  // 🔄 Evaluar Triggers
  static evaluateRollbackTriggers() {
    const manager = RollbackManager.getInstance();
    const metrics = authMonitor.getMetrics();

    for (const trigger of manager.rollbackTriggers) {
      if (!trigger.enabled) continue;

      try {
        const shouldTrigger = trigger.condition(metrics);
        if (shouldTrigger) {
          this.initiateRollback({
            reason: `Auto-rollback triggered: ${trigger.name}`,
            initiatedBy: 'auto_trigger',
            targetState: 'LEGACY',
            metadata: {
              triggerName: trigger.name,
              metrics,
              timestamp: Date.now()
            }
          });
          break; // Solo hacer el primer trigger que se active
        }
      } catch (error) {
        authMonitor.trackError(error, {
          context: 'rollback_trigger_evaluation',
          triggerName: trigger.name
        });
      }
    }
  }

  // 🔧 Utility Methods
  static getInstance() {
    if (!RollbackManager.instance) {
      RollbackManager.instance = new RollbackManager();
    }
    return RollbackManager.instance;
  }

  // 🧹 Limpiar Historia
  static clearRollbackHistory(keepLast = 5) {
    const manager = RollbackManager.getInstance();
    manager.rollbackHistory = manager.rollbackHistory.slice(-keepLast);
  }

  // 📋 Historial de Rollbacks
  static getRollbackHistory() {
    const manager = RollbackManager.getInstance();
    return [...manager.rollbackHistory].reverse(); // Más reciente primero
  }
}

// Auto-configure triggers
RollbackManager.configureAutoRollbackTriggers();

// Verificar auto-rollbacks periódicamente
if (typeof window !== 'undefined') {
  setInterval(() => {
    RollbackManager.evaluateRollbackTriggers();
    RollbackManager.checkAutoRollback();
  }, 60000); // Cada minuto
}

export default RollbackManager;