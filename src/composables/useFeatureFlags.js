/**
 * Composable de Feature Flags para Sistema de Migración
 * Implementa lógica de toggles para Vue Components
 * Basado en MIGRATION_PLAN_FINAL.md sección 3.1
 */

import { computed } from 'vue';
import { MIGRATION_CONFIG } from '../config/featureFlags';

/**
 * Hook principal para manejo de feature flags de migración
 * @returns {Object} Objeto con computed properties para flags
 */
export function useFeatureFlags() {
  // === FLAGS PRINCIPALES DEL SISTEMA ===

  /**
   * Sistema de colas habilitado
   * @returns {ComputedRef<boolean>}
   */
  const isQueueSystemEnabled = computed(() =>
    MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED
  );

  /**
   * Sistema legacy habilitado
   * @returns {ComputedRef<boolean>}
   */
  const isLegacySystemEnabled = computed(() =>
    MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED
  );

  // === FLAGS DE FUNCIONALIDADES ESPECÍFICAS ===

  /**
   * Puede usar múltiples firmantes
   * @returns {ComputedRef<boolean>}
   */
  const canUseMultiSigners = computed(() =>
    isQueueSystemEnabled.value &&
    MIGRATION_CONFIG.QUEUE_FEATURES.MULTI_SIGNERS
  );

  /**
   * Puede gestionar participantes dinámicamente
   * @returns {ComputedRef<boolean>}
   */
  const canManageParticipants = computed(() =>
    isQueueSystemEnabled.value &&
    MIGRATION_CONFIG.QUEUE_FEATURES.DYNAMIC_PARTICIPANTS
  );

  /**
   * Tiene manejo de expiración automática
   * @returns {ComputedRef<boolean>}
   */
  const hasExpirationManagement = computed(() =>
    isQueueSystemEnabled.value &&
    MIGRATION_CONFIG.QUEUE_FEATURES.EXPIRATION_MANAGEMENT
  );

  /**
   * Tiene vistas basadas en roles
   * @returns {ComputedRef<boolean>}
   */
  const hasRoleBasedViews = computed(() =>
    isQueueSystemEnabled.value &&
    MIGRATION_CONFIG.QUEUE_FEATURES.ROLE_BASED_VIEWS
  );

  /**
   * Puede ocultar/mostrar colas
   * @returns {ComputedRef<boolean>}
   */
  const canHideShowQueues = computed(() =>
    isQueueSystemEnabled.value &&
    MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES
  );

  /**
   * Puede cancelar colas (solo emisores)
   * @returns {ComputedRef<boolean>}
   */
  const canCancelQueues = computed(() =>
    isQueueSystemEnabled.value &&
    MIGRATION_CONFIG.QUEUE_FEATURES.CANCEL_QUEUES
  );

  // === FLAGS DE MODO DE MIGRACIÓN ===

  /**
   * La migración es forzada (no opt-in)
   * @returns {ComputedRef<boolean>}
   */
  const isMigrationForced = computed(() =>
    MIGRATION_CONFIG.MIGRATION_MODE === 'forced'
  );

  /**
   * La migración es opt-in (voluntaria)
   * @returns {ComputedRef<boolean>}
   */
  const isMigrationOptIn = computed(() =>
    MIGRATION_CONFIG.MIGRATION_MODE === 'opt-in'
  );

  /**
   * La migración es opt-out (todos incluidos por defecto)
   * @returns {ComputedRef<boolean>}
   */
  const isMigrationOptOut = computed(() =>
    MIGRATION_CONFIG.MIGRATION_MODE === 'opt-out'
  );

  // === FLAGS DE UI/UX ===

  /**
   * Puede mostrar toggle de dashboard
   * @returns {ComputedRef<boolean>}
   */
  const canShowDashboardToggle = computed(() =>
    MIGRATION_CONFIG.UI_SETTINGS.SHOW_DASHBOARD_TOGGLE &&
    isQueueSystemEnabled.value &&
    isLegacySystemEnabled.value
  );

  /**
   * Vista predeterminada es de colas
   * @returns {ComputedRef<boolean>}
   */
  const shouldDefaultToQueueView = computed(() =>
    MIGRATION_CONFIG.UI_SETTINGS.DEFAULT_TO_QUEUE_VIEW &&
    isQueueSystemEnabled.value
  );

  /**
   * Debe mostrar advertencia de sistema antiguo
   * @returns {ComputedRef<boolean>}
   */
  const shouldShowLegacyWarning = computed(() =>
    MIGRATION_CONFIG.UI_SETTINGS.SHOW_LEGACY_WARNING &&
    isLegacySystemEnabled.value &&
    isQueueSystemEnabled.value
  );

  // === FLAGS DE APIs ===

  /**
   * Endpoints de colas están habilitados
   * @returns {ComputedRef<boolean>}
   */
  const areQueueEndpointsEnabled = computed(() =>
    MIGRATION_CONFIG.API_CONFIG.ENABLE_QUEUE_ENDPOINTS
  );

  /**
   * Endpoints legacy están deprecados
   * @returns {ComputedRef<boolean>}
   */
  const areLegacyEndpointsDeprecated = computed(() =>
    MIGRATION_CONFIG.API_CONFIG.DEPRECATE_LEGACY_ENDPOINTS
  );

  /**
   * Se mantiene compatibilidad backward
   * @returns {ComputedRef<boolean>}
   */
  const hasBackwardCompatibility = computed(() =>
    MIGRATION_CONFIG.API_CONFIG.BACKWARD_COMPATIBILITY
  );

  // === HELPERS AVANZADOS ===

  /**
   * Determina si el usuario puede alternar entre sistemas
   * @returns {ComputedRef<boolean>}
   */
  const canToggleBetweenSystems = computed(() =>
    isQueueSystemEnabled.value &&
    isLegacySystemEnabled.value &&
    !isMigrationForced.value &&
    canShowDashboardToggle.value
  );

  /**
   * Determina si el dashboard debe mostrar ambos sistemas
   * @returns {ComputedRef<boolean>}
   */
  const shouldShowDualDashboard = computed(() =>
    isQueueSystemEnabled.value &&
    isLegacySystemEnabled.value &&
    canShowDashboardToggle.value
  );

  /**
   * Determina si el usuario debe ser forzado al nuevo sistema
   * @returns {ComputedRef<boolean>}
   */
  const shouldForceQueueView = computed(() =>
    isQueueSystemEnabled.value &&
    (isMigrationForced.value || shouldDefaultToQueueView.value)
  );

  /**
   * Obtiene estado completo de migración como objeto
   * @returns {ComputedRef<Object>}
   */
  const migrationStatus = computed(() => ({
    // Estado general
    queueEnabled: isQueueSystemEnabled.value,
    legacyEnabled: isLegacySystemEnabled.value,
    migrationMode: MIGRATION_CONFIG.MIGRATION_MODE,

    // Capacidades del sistema
    capabilities: {
      multiSigners: canUseMultiSigners.value,
      dynamicParticipants: canManageParticipants.value,
      expirationManagement: hasExpirationManagement.value,
      roleBasedViews: hasRoleBasedViews.value,
      hideShowQueues: canHideShowQueues.value,
      cancelQueues: canCancelQueues.value
    },

    // Configuración UI
    ui: {
      showDashboardToggle: canShowDashboardToggle.value,
      defaultToQueueView: shouldDefaultToQueueView.value,
      showLegacyWarning: shouldShowLegacyWarning.value,
      canToggle: canToggleBetweenSystems.value
    },

    // Configuración API
    api: {
      queueEndpointsEnabled: areQueueEndpointsEnabled.value,
      legacyDeprecated: areLegacyEndpointsDeprecated.value,
      backwardCompatible: hasBackwardCompatibility.value
    }
  }));

  /**
   * Verifica si una característica específica está habilitada
   * @param {string} feature - Nombre de la característica
   * @returns {boolean}
   */
  const isFeatureEnabled = (feature) => {
    const featurePath = feature.split('.');

    switch (featurePath[0]) {
      case 'QUEUE_SYSTEM':
        return isQueueSystemEnabled.value;
      case 'LEGACY_SYSTEM':
        return isLegacySystemEnabled.value;
      case 'MULTI_SIGNERS':
        return canUseMultiSigners.value;
      case 'DYNAMIC_PARTICIPANTS':
        return canManageParticipants.value;
      case 'EXPIRATION_MANAGEMENT':
        return hasExpirationManagement.value;
      case 'ROLE_BASED_VIEWS':
        return hasRoleBasedViews.value;
      case 'HIDE_SHOW_QUEUES':
        return canHideShowQueues.value;
      case 'CANCEL_QUEUES':
        return canCancelQueues.value;
      case 'DASHBOARD_TOGGLE':
        return canShowDashboardToggle.value;
      case 'LEGACY_WARNING':
        return shouldShowLegacyWarning.value;
      case 'QUEUE_ENDPOINTS':
        return areQueueEndpointsEnabled.value;
      default:
        return false;
    }
  };

  return {
    // Flags principales
    isQueueSystemEnabled,
    isLegacySystemEnabled,

    // Funcionalidades
    canUseMultiSigners,
    canManageParticipants,
    hasExpirationManagement,
    hasRoleBasedViews,
    canHideShowQueues,
    canCancelQueues,

    // Modo de migración
    isMigrationForced,
    isMigrationOptIn,
    isMigrationOptOut,

    // UI/UX
    canShowDashboardToggle,
    shouldDefaultToQueueView,
    shouldShowLegacyWarning,

    // APIs
    areQueueEndpointsEnabled,
    areLegacyEndpointsDeprecated,
    hasBackwardCompatibility,

    // Helpers avanzados
    canToggleBetweenSystems,
    shouldShowDualDashboard,
    shouldForceQueueView,
    migrationStatus,

    // Utilidad
    isFeatureEnabled
  };
}

/**
 * Hook simplificado para checks rápidos de características
 * @returns {Object} Objeto con métodos booleanos simples
 */
export function useQuickFeatureFlags() {
  const {
    isQueueSystemEnabled,
    canUseMultiSigners,
    canManageParticipants,
    hasRoleBasedViews,
    canShowDashboardToggle
  } = useFeatureFlags();

  return {
    // Checks simples para condiciones comunes
    canCreateQueue: isQueueSystemEnabled,
    canAddMultipleSigners: canUseMultiSigners,
    canManageQueueParticipants: canManageParticipants,
    hasQueueDashboard: hasRoleBasedViews,
    canSwitchSystems: canShowDashboardToggle,

    // Check combinado para UI completa
    hasFullQueueUI: computed(() =>
      isQueueSystemEnabled.value &&
      canUseMultiSigners.value &&
      hasRoleBasedViews.value &&
      canShowDashboardToggle.value
    )
  };
}

/**
 * Hook para debugging de feature flags
 * @returns {Object} Métodos para debugging
 */
export function useFeatureFlagsDebug() {
  const migrationStatus = useFeatureFlags().migrationStatus;

  return {
    /**
     * Obtiene todos los flags como objeto plano
     * @returns {Object}
     */
    getAllFlags: () => migrationStatus.value,

    /**
     * Imprime estado actual de flags en consola
     */
    debugFlags: () => {
      console.group('🚀 Feature Flags Status');
      console.table(migrationStatus.value);
      console.log('Migration Mode:', MIGRATION_CONFIG.MIGRATION_MODE);
      console.groupEnd();
    },

    /**
     * Verifica si hay inconsistencias en la configuración
     * @returns {string[]} Array de advertencias
     */
    validateConfiguration: () => {
      const warnings = [];

      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED && !MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED) {
        warnings.push('⚠️ Ambos sistemas están deshabilitados');
      }

      if (MIGRATION_CONFIG.MIGRATION_MODE === 'forced' && MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED) {
        warnings.push('⚠️ Modo forzado pero sistema legacy habilitado');
      }

      if (!MIGRATION_CONFIG.UI_SETTINGS.SHOW_DASHBOARD_TOGGLE &&
          MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
          MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED) {
        warnings.push('⚠️ Ambos sistemas habilitados pero toggle deshabilitado');
      }

      return warnings;
    }
  };
}