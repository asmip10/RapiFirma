<template>
  <div class="migration-admin-view">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            🚀 Panel de Migración del Sistema
          </h1>
          <p class="text-gray-600 mt-2">
            Gestiona la transición del sistema simple al sistema de colas de firma
          </p>
        </div>
        <div class="flex items-center space-x-4">
          <router-link
            to="/dashboard"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            ← Volver al Dashboard
          </router-link>
          <div class="text-right">
            <p class="text-sm text-gray-500">Versión Actual</p>
            <p class="font-semibold text-gray-900">v2.0.0 - Queue System</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
          :class="[
            activeTab === tab.id
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <span class="flex items-center space-x-2">
            <span>{{ tab.icon }}</span>
            <span>{{ tab.name }}</span>
            <span v-if="tab.badge" class="ml-1 px-2 py-1 text-xs rounded-full" :class="tab.badgeClass">
              {{ tab.badge }}
            </span>
          </span>
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="min-h-screen">
      <!-- Feature Toggle Management -->
      <FeatureToggleManager v-if="activeTab === 'toggles'" />

      <!-- Test Suite -->
      <MigrationTestSuite v-if="activeTab === 'tests'" />

      <!-- System Status -->
      <div v-if="activeTab === 'status'" class="space-y-6">
        <!-- System Overview -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">📊 Estado General del Sistema</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Legacy System Status -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium text-gray-900">Sistema Legacy</h3>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="legacyStatus.class"
                >
                  {{ legacyStatus.text }}
                </span>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Usuarios Activos:</span>
                  <span class="font-medium">{{ systemStatus.legacy.activeUsers }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Documentos Hoy:</span>
                  <span class="font-medium">{{ systemStatus.legacy.documentsToday }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Tasa de Error:</span>
                  <span class="font-medium">{{ systemStatus.legacy.errorRate }}%</span>
                </div>
              </div>
            </div>

            <!-- Queue System Status -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium text-gray-900">Sistema de Colas</h3>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="queueStatus.class"
                >
                  {{ queueStatus.text }}
                </span>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Usuarios Activos:</span>
                  <span class="font-medium">{{ systemStatus.queue.activeUsers }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Colas Activas:</span>
                  <span class="font-medium">{{ systemStatus.queue.activeQueues }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Firmas Hoy:</span>
                  <span class="font-medium">{{ systemStatus.queue.signaturesToday }}</span>
                </div>
              </div>
            </div>

            <!-- Migration Progress -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium text-gray-900">Progreso Migración</h3>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="migrationProgress.class"
                >
                  {{ migrationProgress.text }}
                </span>
              </div>
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Completado</span>
                    <span class="font-medium">{{ systemStatus.migration.percentage }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      :style="{ width: `${systemStatus.migration.percentage}%` }"
                    ></div>
                  </div>
                </div>
                <div class="text-xs text-gray-500">
                  {{ systemStatus.migration.migratedUsers }} / {{ systemStatus.migration.totalUsers }} usuarios migrados
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Queues -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">📋 Colas Activas</h2>
            <button
              @click="refreshQueues"
              class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refrescar
            </button>
          </div>

          <div v-if="activeQueues.length === 0" class="text-center py-8 text-gray-500">
            No hay colas activas en este momento
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="queue in activeQueues"
              :key="queue.queueId"
              class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ queue.documentName }}</h4>
                  <p class="text-sm text-gray-600 mt-1">
                    Creada por {{ queue.emisor.name }} • {{ queue.participants.length }} participantes
                  </p>
                </div>
                <div class="flex items-center space-x-4">
                  <div class="text-right">
                    <p class="text-sm text-gray-600">Progreso</p>
                    <p class="font-medium">{{ queue.signedCount }}/{{ queue.totalParticipants }}</p>
                  </div>
                  <div class="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-green-500 h-2 rounded-full"
                      :style="{ width: `${(queue.signedCount / queue.totalParticipants) * 100}%` }"
                    ></div>
                  </div>
                  <button
                    @click="viewQueueDetails(queue)"
                    class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Ver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Health -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">💚 Salud del Sistema</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-3xl font-bold text-green-600">{{ systemHealth.api.uptime }}%</div>
              <p class="text-sm text-green-700 mt-1">API Uptime</p>
            </div>
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-3xl font-bold text-blue-600">{{ systemHealth.performance.avgResponse }}ms</div>
              <p class="text-sm text-blue-700 mt-1">Respuesta Promedio</p>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <div class="text-3xl font-bold text-purple-600">{{ systemHealth.database.connections }}</div>
              <p class="text-sm text-purple-700 mt-1">Conexiones DB</p>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-3xl font-bold text-yellow-600">{{ systemHealth.memory.usage }}%</div>
              <p class="text-sm text-yellow-700 mt-1">Uso Memoria</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Migration Logs -->
      <div v-if="activeTab === 'logs'" class="space-y-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">📜 Logs de Migración</h2>
            <div class="flex items-center space-x-2">
              <select v-model="logLevel" class="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                <option value="all">Todos</option>
                <option value="error">Errores</option>
                <option value="warning">Advertencias</option>
                <option value="info">Info</option>
              </select>
              <button
                @click="refreshLogs"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Refrescar
              </button>
            </div>
          </div>

          <div class="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            <div v-for="log in filteredLogs" :key="log.id" class="mb-2 flex items-start space-x-3">
              <span class="text-gray-500 whitespace-nowrap">{{ formatLogTime(log.timestamp) }}</span>
              <span
                class="px-2 py-0.5 rounded text-xs whitespace-nowrap"
                :class="getLogLevelClass(log.level)"
              >
                {{ log.level.toUpperCase() }}
              </span>
              <span class="flex-1">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import FeatureToggleManager from '../../components/FeatureToggleManager.vue';
import MigrationTestSuite from '../../components/MigrationTestSuite.vue';
import { queueService } from '../../services/queue.service';

// Estado
const activeTab = ref('toggles');
const logLevel = ref('all');
const systemStatus = ref({
  legacy: {
    activeUsers: 0,
    documentsToday: 0,
    errorRate: 0
  },
  queue: {
    activeUsers: 0,
    activeQueues: 0,
    signaturesToday: 0
  },
  migration: {
    percentage: 0,
    migratedUsers: 0,
    totalUsers: 0
  }
});
const systemHealth = ref({
  api: {
    uptime: 0
  },
  performance: {
    avgResponse: 0
  },
  database: {
    connections: 0
  },
  memory: {
    usage: 0
  }
});
const activeQueues = ref([]);
const migrationLogs = ref([]);

// Tabs
const tabs = ref([
  {
    id: 'toggles',
    name: 'Feature Flags',
    icon: '🎛️',
    badge: null,
    badgeClass: ''
  },
  {
    id: 'tests',
    name: 'Test Suite',
    icon: '🧪',
    badge: 'NEW',
    badgeClass: 'bg-green-100 text-green-800'
  },
  {
    id: 'status',
    name: 'Estado del Sistema',
    icon: '📊',
    badge: null,
    badgeClass: ''
  },
  {
    id: 'logs',
    name: 'Logs',
    icon: '📜',
    badge: null,
    badgeClass: ''
  }
]);

// Computadas
const legacyStatus = computed(() => {
  const errorRate = systemStatus.value.legacy.errorRate;
  if (errorRate > 5) {
    return { text: 'Crítico', class: 'bg-red-100 text-red-800' };
  } else if (errorRate > 1) {
    return { text: 'Advertencia', class: 'bg-yellow-100 text-yellow-800' };
  }
  return { text: 'Estable', class: 'bg-green-100 text-green-800' };
});

const queueStatus = computed(() => {
  const activeUsers = systemStatus.value.queue.activeUsers;
  if (activeUsers === 0) {
    return { text: 'Inactivo', class: 'bg-gray-100 text-gray-800' };
  } else if (activeUsers < 10) {
    return { text: 'Bajo Uso', class: 'bg-yellow-100 text-yellow-800' };
  }
  return { text: 'Activo', class: 'bg-green-100 text-green-800' };
});

const migrationProgress = computed(() => {
  const percentage = systemStatus.value.migration.percentage;
  if (percentage >= 95) {
    return { text: 'Casi Completo', class: 'bg-green-100 text-green-800' };
  } else if (percentage >= 50) {
    return { text: 'En Progreso', class: 'bg-blue-100 text-blue-800' };
  } else if (percentage > 0) {
    return { text: 'Inicial', class: 'bg-yellow-100 text-yellow-800' };
  }
  return { text: 'No Iniciado', class: 'bg-gray-100 text-gray-800' };
});

const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return migrationLogs.value;
  }
  return migrationLogs.value.filter(log => log.level === logLevel.value);
});

// Métodos
async function loadSystemStatus() {
  try {
    // Simular carga de datos reales
    systemStatus.value = {
      legacy: {
        activeUsers: 145,
        documentsToday: 89,
        errorRate: 0.8
      },
      queue: {
        activeUsers: 67,
        activeQueues: 23,
        signaturesToday: 45
      },
      migration: {
        percentage: 46,
        migratedUsers: 67,
        totalUsers: 145
      }
    };

    systemHealth.value = {
      api: {
        uptime: 99.9
      },
      performance: {
        avgResponse: 120
      },
      database: {
        connections: 12
      },
      memory: {
        usage: 67
      }
    };

    activeQueues.value = [
      {
        queueId: 'queue-001',
        documentName: 'Contrato de Servicios',
        emisor: { name: 'Juan Pérez' },
        participants: ['user1', 'user2', 'user3'],
        signedCount: 1,
        totalParticipants: 3
      },
      {
        queueId: 'queue-002',
        documentName: 'Política de Privacidad',
        emisor: { name: 'María García' },
        participants: ['user4', 'user5'],
        signedCount: 2,
        totalParticipants: 2
      }
    ];

  } catch (error) {
    console.error('Error loading system status:', error);
  }
}

async function loadMigrationLogs() {
  try {
    // Simular logs
    migrationLogs.value = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'info',
        message: 'Usuario test@example.com migrado al sistema de colas'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'warning',
        message: 'Feature flag LEGACY_SYSTEM desactivado para 10% de usuarios'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 900000).toISOString(),
        level: 'error',
        message: 'Error al sincronizar cola queue-003: Timeout de base de datos'
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        level: 'info',
        message: 'Test suite ejecutado: 12/15 tests pasaron'
      }
    ];
  } catch (error) {
    console.error('Error loading migration logs:', error);
  }
}

function refreshQueues() {
  loadSystemStatus();
}

function refreshLogs() {
  loadMigrationLogs();
}

function viewQueueDetails(queue) {
  // Implementar vista de detalles
  console.log('View queue details:', queue);
}

function formatLogTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getLogLevelClass(level) {
  switch (level) {
    case 'error': return 'bg-red-500 text-white';
    case 'warning': return 'bg-yellow-500 text-white';
    case 'info': return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}

// Lifecycle
onMounted(() => {
  loadSystemStatus();
  loadMigrationLogs();
});
</script>

<style scoped>
.migration-admin-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #1f2937;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>