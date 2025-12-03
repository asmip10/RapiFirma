// src/utils/deploymentManager.js
/**
 * Sistema de Deployment Controlado para Refresh Tokens
 * Maneja phases de rollout gradual con checks automáticos
 */

import { isFeatureEnabled, getActiveFeatures } from '@/config/featureFlags';
import { validateFeatureFlags } from '@/config/featureFlags';
import authMonitor from './authMonitoring';
import RollbackManager from './rollbackManager';

export class DeploymentManager {
  static instance = null;

  constructor() {
    if (DeploymentManager.instance) {
      return DeploymentManager.instance;
    }

    this.deploymentPhases = {
      PREPARING: 'preparing',
      PHASE_1: 'phase_1',  // 10% usuarios
      PHASE_2: 'phase_2',  // 25% usuarios
      PHASE_3: 'phase_3',  // 50% usuarios
      PHASE_4: 'phase_4',  // 100% usuarios
      COMPLETED: 'completed',
      ROLLBACK: 'rollback'
    };

    this.currentPhase = this.deploymentPhases.PREPARING;
    this.deploymentMetrics = {
      startTime: null,
      currentPhaseStartTime: null,
      userCount: 0,
      successRate: 0,
      errorRate: 0,
      performanceScore: 100
    };

    this.phaseThresholds = {
      [this.deploymentPhases.PHASE_1]: { userPercentage: 10, duration: 300000, successThreshold: 95 }, // 5 min
      [this.deploymentPhases.PHASE_2]: { userPercentage: 25, duration: 600000, successThreshold: 93 }, // 10 min
      [this.deploymentPhases.PHASE_3]: { userPercentage: 50, duration: 900000, successThreshold: 90 }, // 15 min
      [this.deploymentPhases.PHASE_4]: { userPercentage: 100, duration: 0, successThreshold: 85 }      // Permanente
    };

    DeploymentManager.instance = this;
  }

  // 🚀 Iniciar Deployment
  static async initiateDeployment(options = {}) {
    if (!isFeatureEnabled('MIGRATION_MODE_ENABLED')) {
      throw new Error('Migration mode is not enabled');
    }

    const manager = DeploymentManager.getInstance();

    try {
      const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validar configuración
      const validation = validateFeatureFlags();
      if (validation.length > 0) {
        throw new Error(`Feature flags validation failed: ${validation.join(', ')}`);
      }

      manager.deploymentMetrics.startTime = Date.now();
      manager.deploymentMetrics.currentPhaseStartTime = Date.now();

      authMonitor.trackAnalytics('deployment_initiated', {
        deploymentId,
        activeFeatures: getActiveFeatures(),
        validation: validation
      });

      if (import.meta.env.DEV) {
        console.log('🚀 Deployment initiated:', {
          deploymentId,
          activeFeatures: getActiveFeatures()
        });
      }

      // Iniciar Phase 1
      const result = await manager.executePhase(manager.deploymentPhases.PHASE_1);

      return {
        success: true,
        deploymentId,
        currentPhase: result.phase,
        message: 'Deployment started successfully'
      };

    } catch (error) {
      authMonitor.trackError(error, { context: 'deployment_initiation' });
      throw error;
    }
  }

  // 📋 Ejecutar Phase
  async executePhase(targetPhase) {
    const threshold = this.phaseThresholds[targetPhase];
    if (!threshold) {
      throw new Error(`Unknown deployment phase: ${targetPhase}`);
    }

    this.currentPhase = targetPhase;
    this.deploymentMetrics.currentPhaseStartTime = Date.now();

    try {
      // Activar features para esta phase
      await this.activatePhaseFeatures(targetPhase);

      // Monitorear phase
      const monitoringResult = await this.monitorPhase(targetPhase, threshold);

      // Evaluar resultado
      if (monitoringResult.success) {
        // Avanzar a siguiente phase
        const nextPhase = this.getNextPhase(targetPhase);
        if (nextPhase) {
          return await this.executePhase(nextPhase);
        } else {
          // Deployment completado
          this.currentPhase = this.deploymentPhases.COMPLETED;
          return { success: true, phase: 'completed' };
        }
      } else {
        // Iniciar rollback
        throw new Error(`Phase ${targetPhase} failed: ${monitoringResult.reason}`);
      }

    } catch (error) {
      this.currentPhase = this.deploymentPhases.ROLLBACK;
      throw error;
    }
  }

  // 🔥 Activar Features de Phase
  async activatePhaseFeatures(phase) {
    const phaseFeatures = this.getPhaseFeatures(phase);

    for (const feature of phaseFeatures) {
      // Esto requeriría integración con un sistema de feature flags
      // que permita actualización en runtime
      const flagData = {
        feature,
        phase,
        activatedAt: Date.now()
      };

      // Activar feature flags según phase
      switch (phase) {
        case this.deploymentPhases.PHASE_1:
          // Activar features básicas para 10% de usuarios
          await this.enableFeatureForPercentage(feature, 10);
          break;

        case this.deploymentPhases.PHASE_2:
          // Activar features principales para 25% de usuarios
          await this.enableFeatureForPercentage(feature, 25);
          break;

        case this.deploymentPhases.PHASE_3:
          // Activar features para 50% de usuarios
          await this.enableFeatureForPercentage(feature, 50);
          break;

        case this.deploymentPhases.PHASE_4:
          // Activar para todos
          await this.enableFeatureForPercentage(feature, 100);
          break;
      }

      authMonitor.trackAnalytics('deployment_feature_activated', flagData);
    }
  }

  // 📊 Monitorear Phase
  async monitorPhase(phase, threshold) {
    const monitoringDuration = threshold.duration;
    const successThreshold = threshold.successThreshold;

    return new Promise((resolve) => {
      const startTime = Date.now();
      let checkCount = 0;

      const monitor = setInterval(async () => {
        checkCount++;
        const elapsed = Date.now() - startTime;
        const metrics = authMonitor.getMetrics();
        const health = authMonitor.getHealthStatus();

        // Calcular success rate
        const totalLogins = metrics.logins.success + metrics.logins.failed;
        const successRate = totalLogins > 0 ? (metrics.logins.success / totalLogins) * 100 : 100;

        // Calcular error rate
        const errorRate = totalLogins > 0 ? (metrics.logins.failed / totalLogins) * 100 : 0;

        this.deploymentMetrics.userCount = totalLogins;
        this.deploymentMetrics.successRate = successRate;
        this.deploymentMetrics.errorRate = errorRate;
        this.deploymentMetrics.performanceScore = health.score;

        if (import.meta.env.DEV) {
          console.log(`📊 Phase ${phase} Monitoring (${checkCount}):`, {
            successRate: `${successRate.toFixed(2)}%`,
            errorRate: `${errorRate.toFixed(2)}%`,
            healthScore: health.score,
            elapsed: `${(elapsed / 1000).toFixed(1)}s`
          });
        }

        // Evaluar condiciones de éxito
        const meetsSuccessThreshold = successRate >= successThreshold;
        const meetsHealthThreshold = health.score >= 70;

        // Si cumple thresholds y ha pasado el tiempo mínimo
        if (meetsSuccessThreshold && meetsHealthThreshold && elapsed >= 60000) { // Mínimo 1 minuto
          clearInterval(monitor);
          resolve({ success: true, phase, metrics });
          return;
        }

        // Si falla critical thresholds
        if (successRate < 60 || health.status === 'unhealthy') {
          clearInterval(monitor);
          resolve({
            success: false,
            phase,
            reason: `Critical thresholds failed: Success Rate ${successRate.toFixed(2)}%, Health ${health.score}`,
            metrics
          });
          return;
        }

        // Timeout de la phase
        if (elapsed >= monitoringDuration && monitoringDuration > 0) {
          clearInterval(monitor);
          if (meetsSuccessThreshold && meetsHealthThreshold) {
            resolve({ success: true, phase, metrics });
          } else {
            resolve({
              success: false,
              phase,
              reason: `Phase timeout: Success Rate ${successRate.toFixed(2)}% (${successThreshold}% required)`,
              metrics
            });
          }
        }
      }, 5000); // Check cada 5 segundos
    });
  }

  // 🎯 Obtener siguiente Phase
  getNextPhase(currentPhase) {
    const phases = Object.values(this.deploymentPhases);
    const currentIndex = phases.indexOf(currentPhase);

    if (currentIndex >= 0 && currentIndex < phases.length - 1) {
      return phases[currentIndex + 1];
    }

    return null;
  }

  // 🔧 Obtener Features de Phase
  getPhaseFeatures(phase) {
    const phaseFeatureMap = {
      [this.deploymentPhases.PHASE_1]: [
        'REFRESH_TOKEN_ENABLED',
        'TOKEN_STATUS_BADGE_ENABLED',
        'AUTH_MONITORING_ENABLED'
      ],
      [this.deploymentPhases.PHASE_2]: [
        'REFRESH_TOKEN_ENABLED',
        'AUTO_REFRESH_ENABLED',
        'TOKEN_STATUS_BADGE_ENABLED',
        'AUTH_MONITORING_ENABLED',
        'CONCURRENT_REFRESH_PREVENTION'
      ],
      [this.deploymentPhases.PHASE_3]: [
        'REFRESH_TOKEN_ENABLED',
        'AUTO_REFRESH_ENABLED',
        'FORCED_PASSWORD_CHANGE_ENABLED',
        'TOKEN_STATUS_BADGE_ENABLED',
        'PASSWORD_CHANGE_BANNER_ENABLED',
        'AUTH_MONITORING_ENABLED',
        'CONCURRENT_REFRESH_PREVENTION'
      ],
      [this.deploymentPhases.PHASE_4]: Object.keys(getActiveFeatures())
    };

    return phaseFeatureMap[phase] || [];
  }

  // 👥 Habilitar Feature para porcentaje de usuarios
  async enableFeatureForPercentage(feature, percentage) {
    // Implementar lógica de porcentaje de usuarios
    // Esto podría basarse en:
    // - User ID hash
    // - Random assignment
    // - User segments
    // - Geographic location
    // - User roles

    const userId = this.getCurrentUserId();
    if (!userId) return true; // Sin user ID, habilitar por default

    // Simple hash-based percentage
    const hash = this.hashCode(userId);
    const userPercentage = Math.abs(hash) % 100;

    const enabled = userPercentage < percentage;

    // 🚨 FIX CRÍTICO: Storage cleanup mechanism
    const userFeatures = JSON.parse(localStorage.getItem('deployment_user_features') || '{}');

    // Limpiar datos antiguos antes de agregar nuevos
    this.cleanupOldUserData(userFeatures);

    userFeatures[userId] = userFeatures[userId] || {};
    userFeatures[userId][feature] = {
      enabled,
      percentage,
      timestamp: Date.now()
    };

    // Validar tamaño antes de guardar
    if (this.isStorageSizeSafe(userFeatures)) {
      localStorage.setItem('deployment_user_features', JSON.stringify(userFeatures));
    } else {
      // Si storage es muy grande, limpiar agresivamente
      this.aggressiveCleanup(userFeatures);
      localStorage.setItem('deployment_user_features', JSON.stringify(userFeatures));
    }

    return enabled;
  }

  // 🚨 FIX CRÍTICO: Cleanup de datos antiguos
  cleanupOldUserData(userFeatures) {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
    let cleanedEntries = 0;

    Object.keys(userFeatures).forEach(userId => {
      const userFeatureData = userFeatures[userId];
      const featuresToDelete = [];

      Object.keys(userFeatureData).forEach(feature => {
        const featureData = userFeatureData[feature];
        if (now - featureData.timestamp > maxAge) {
          featuresToDelete.push(feature);
        }
      });

      featuresToDelete.forEach(feature => {
        delete userFeatureData[feature];
        cleanedEntries++;
      });

      // Si el usuario no tiene más features, eliminarlo
      if (Object.keys(userFeatureData).length === 0) {
        delete userFeatures[userId];
      }
    });

    if (import.meta.env.DEV && cleanedEntries > 0) {
      console.log(`🧹 Cleanup: Removed ${cleanedEntries} old feature entries`);
    }
  }

  // 🚨 FIX CRÍTICO: Validar tamaño de storage
  isStorageSizeSafe(data) {
    try {
      const size = JSON.stringify(data).length;
      const maxSize = 1024 * 1024; // 1MB
      return size < maxSize;
    } catch {
      return false;
    }
  }

  // 🚨 FIX CRÍTICO: Cleanup agresivo si storage está lleno
  aggressiveCleanup(userFeatures) {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 1 día para cleanup agresivo
    let cleanedEntries = 0;

    Object.keys(userFeatures).forEach(userId => {
      const userFeatureData = userFeatures[userId];
      const featuresToDelete = [];

      Object.keys(userFeatureData).forEach(feature => {
        const featureData = userFeatureData[feature];
        if (now - featureData.timestamp > maxAge) {
          featuresToDelete.push(feature);
        }
      });

      featuresToDelete.forEach(feature => {
        delete userFeatureData[feature];
        cleanedEntries++;
      });

      // Si el usuario no tiene más features, eliminarlo
      if (Object.keys(userFeatureData).length === 0) {
        delete userFeatures[userId];
      }
    });

    if (import.meta.env.DEV) {
      console.warn(`🧹 Aggressive cleanup: Removed ${cleanedEntries} entries due to storage pressure`);
    }
  }

  // 🆔 Obtener User ID actual
  getCurrentUserId() {
    // Intentar obtener ID de varias fuentes
    const stored = localStorage.getItem('rf_auth');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return data.userId || data.username || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  // 🔢 Hash function simple
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  // 📊 Estado del Deployment
  static getDeploymentStatus() {
    const manager = DeploymentManager.getInstance();

    return {
      currentPhase: manager.currentPhase,
      metrics: { ...manager.deploymentMetrics },
      isActive: manager.currentPhase !== manager.deploymentPhases.COMPLETED,
      canRollback: RollbackManager.canRollback(),
      activeFeatures: getActiveFeatures(),
      phaseThresholds: manager.phaseThresholds,
      uptime: manager.deploymentMetrics.startTime ? Date.now() - manager.deploymentMetrics.startTime : 0
    };
  }

  // 📋 Checklist de Deployment
  static getDeploymentChecklist() {
    return {
      preDeployment: [
        '✅ Feature flags configured',
        '✅ Tests passing in CI/CD',
        '✅ Documentation updated',
        '✅ Rollback plan ready',
        '✅ Monitoring configured',
        '✅ Team notified'
      ],
      duringDeployment: [
        '📊 Monitoring metrics',
        '🔄 Auto-rollback enabled',
        '📱 User feedback collection',
        '🚨 Alert system active'
      ],
      postDeployment: [
        '✅ Success metrics verified',
        '📋 Performance baseline established',
        '🧹 Cleanup temporary data',
        '📊 Documentation updated'
      ]
    };
  }

  // 🔧 Utility Methods
  static getInstance() {
    if (!DeploymentManager.instance) {
      DeploymentManager.instance = new DeploymentManager();
    }
    return DeploymentManager.instance;
  }

  // 🔄 Reiniciar Deployment
  static async resetDeployment() {
    const manager = DeploymentManager.getInstance();

    manager.currentPhase = manager.deploymentPhases.PREPARING;
    manager.deploymentMetrics = {
      startTime: null,
      currentPhaseStartTime: null,
      userCount: 0,
      successRate: 0,
      errorRate: 0,
      performanceScore: 100
    };

    // Limpiar datos de deployment
    localStorage.removeItem('deployment_user_features');
    sessionStorage.removeItem('deployment_flags');

    authMonitor.trackAnalytics('deployment_reset', { timestamp: Date.now() });
  }
}

// Auto-inicialización en modo desarrollo
if (import.meta.env.DEV && isFeatureEnabled('MIGRATION_MODE_ENABLED')) {
  // Verificar si hay un deployment en curso
  const status = DeploymentManager.getDeploymentStatus();
  if (status.currentPhase === status.deploymentPhases.PREPARING) {
    console.log('🚀 Development mode: Ready for deployment');
  }
}

export default DeploymentManager;