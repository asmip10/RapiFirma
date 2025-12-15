<template>
  <div class="feature-toggle-manager">
    <!-- Header -->
    <div class="mb-6 p-4 bg-indigo-50 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-indigo-900">
            🔧 Panel de Control de Migración
          </h2>
          <p class="text-sm text-indigo-700 mt-1">
            Gestiona la transición del sistema simple al sistema de colas
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span
            class="px-3 py-1 rounded-full text-xs font-medium"
            :class="migrationStatus.class"
          >
            {{ migrationStatus.text }}
          </span>
          <button
            @click="refreshStatus"
            :disabled="loading"
            class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else>Refrescar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Usuarios Totales</p>
            <p class="text-2xl font-bold text-gray-900">{{ metrics.totalUsers }}</p>
          </div>
          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Usuarios en Colas</p>
            <p class="text-2xl font-bold text-green-600">{{ metrics.usersWithQueues }}</p>
          </div>
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Activos en Sistema Nuevo</p>
            <p class="text-2xl font-bold text-indigo-600">{{ metrics.activeNewSystem }}</p>
          </div>
          <svg class="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Tasa de Migración</p>
            <p class="text-2xl font-bold text-purple-600">{{ migrationRate }}%</p>
          </div>
          <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Feature Toggles -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">🎛️ Control de Features</h3>
        <p class="text-sm text-gray-600 mt-1">Activa o desactiva las funcionalidades del sistema de colas</p>
      </div>

      <div class="p-6 space-y-4">
        <!-- Toggle Principal -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">Sistema de Colas</h4>
            <p class="text-sm text-gray-600 mt-1">Activa todo el sistema de gestión de colas de firma</p>
          </div>
          <ToggleSwitch
            v-model="featureFlags.queueEnabled"
            @change="updateFeatureFlag('queueEnabled')"
            :disabled="updating"
          />
        </div>

        <!-- Toggle Dashboard -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">Dashboard de Colas</h4>
            <p class="text-sm text-gray-600 mt-1">Muestra el dashboard especializado para gestión de colas</p>
          </div>
          <ToggleSwitch
            v-model="featureFlags.queueDashboardEnabled"
            @change="updateFeatureFlag('queueDashboardEnabled')"
            :disabled="updating || !featureFlags.queueEnabled"
          />
        </div>

        <!-- Toggle Creación -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">Creación de Colas</h4>
            <p class="text-sm text-gray-600 mt-1">Permite a los usuarios crear nuevas colas de firma</p>
          </div>
          <ToggleSwitch
            v-model="featureFlags.queueCreationEnabled"
            @change="updateFeatureFlag('queueCreationEnabled')"
            :disabled="updating || !featureFlags.queueEnabled"
          />
        </div>

        <!-- Toggle Firma -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">Firma en Colas</h4>
            <p class="text-sm text-gray-600 mt-1">Activa la funcionalidad de firma secuencial</p>
          </div>
          <ToggleSwitch
            v-model="featureFlags.queueSigningEnabled"
            @change="updateFeatureFlag('queueSigningEnabled')"
            :disabled="updating || !featureFlags.queueEnabled"
          />
        </div>
      </div>
    </div>

    <!-- User Management -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Migration Groups -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">👥 Grupos de Migración</h3>
          <p class="text-sm text-gray-600 mt-1">Gestiona qué usuarios pueden acceder al nuevo sistema</p>
        </div>

        <div class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Añadir usuarios al sistema de colas
            </label>
            <div class="flex space-x-2">
              <input
                v-model="newUserEmail"
                type="email"
                placeholder="correo@empresa.com"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                @keypress.enter="addUserToMigration"
              />
              <button
                @click="addUserToMigration"
                :disabled="!newUserEmail || addingUser"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="user in migratedUsers"
              :key="user.id"
              class="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">
                  {{ user.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ user.name }}</p>
                  <p class="text-sm text-gray-600">{{ user.email }}</p>
                </div>
              </div>
              <button
                @click="removeUserFromMigration(user.id)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Migration Progress -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">📊 Progreso de Migración</h3>
          <p class="text-sm text-gray-600 mt-1">Estadísticas de adopción del nuevo sistema</p>
        </div>

        <div class="p-6">
          <!-- Progress Bar -->
          <div class="mb-6">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso General</span>
              <span>{{ migrationRate }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div
                class="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                :style="{ width: `${migrationRate}%` }"
              ></div>
            </div>
          </div>

          <!-- Statistics -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <p class="text-2xl font-bold text-green-600">{{ metrics.successfulMigrations }}</p>
              <p class="text-sm text-green-700">Migraciones Exitosas</p>
            </div>
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <p class="text-2xl font-bold text-blue-600">{{ metrics.activeQueues }}</p>
              <p class="text-sm text-blue-700">Colas Activas</p>
            </div>
          </div>

          <!-- Recent Activity -->
          <div>
            <h4 class="text-sm font-medium text-gray-900 mb-3">Actividad Reciente</h4>
            <div class="space-y-2">
              <div
                v-for="activity in recentActivity"
                :key="activity.id"
                class="flex items-center space-x-3 text-sm"
              >
                <div
                  class="w-2 h-2 rounded-full"
                  :class="getActivityColor(activity.type)"
                ></div>
                <span class="text-gray-600">{{ formatTime(activity.timestamp) }}</span>
                <span class="text-gray-900">{{ activity.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="mt-6 flex justify-end space-x-3">
      <button
        @click="exportMetrics"
        class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        📊 Exportar Métricas
      </button>
      <button
        @click="testMigration"
        :disabled="testing"
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        <span v-if="testing">Probando...</span>
        <span v-else>🧪 Ejecutar Prueba</span>
      </button>
      <button
        @click="completeMigration"
        :disabled="!canCompleteMigration"
        class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🎉 Completar Migración
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { useToasts } from '../composables/useToasts';
import ToggleSwitch from './ToggleSwitch.vue';

const { success, error, warning } = useToasts();
const {
  flags: featureFlags,
  updateFlag,
  getMigrationMetrics,
  addMigrationUser,
  removeMigrationUser,
  runMigrationTest
} = useFeatureFlags();

// Estado
const loading = ref(false);
const updating = ref(false);
const addingUser = ref(false);
const testing = ref(false);
const newUserEmail = ref('');
const migratedUsers = ref([]);
const metrics = ref({
  totalUsers: 0,
  usersWithQueues: 0,
  activeNewSystem: 0,
  successfulMigrations: 0,
  activeQueues: 0
});
const recentActivity = ref([]);

// Computadas
const migrationRate = computed(() => {
  if (metrics.value.totalUsers === 0) return 0;
  return Math.round((metrics.value.usersWithQueues / metrics.value.totalUsers) * 100);
});

const migrationStatus = computed(() => {
  if (migrationRate.value === 0) {
    return { text: 'No Iniciado', class: 'bg-gray-100 text-gray-800' };
  } else if (migrationRate.value < 25) {
    return { text: 'Inicial', class: 'bg-yellow-100 text-yellow-800' };
  } else if (migrationRate.value < 75) {
    return { text: 'En Progreso', class: 'bg-blue-100 text-blue-800' };
  } else if (migrationRate.value < 100) {
    return { text: 'Casi Completo', class: 'bg-purple-100 text-purple-800' };
  } else {
    return { text: 'Completado', class: 'bg-green-100 text-green-800' };
  }
});

const canCompleteMigration = computed(() => {
  return migrationRate.value >= 95 && featureFlags.queueEnabled;
});

// Métodos
async function refreshStatus() {
  loading.value = true;

  try {
    const data = await getMigrationMetrics();
    metrics.value = data.metrics;
    migratedUsers.value = data.migratedUsers;
    recentActivity.value = data.recentActivity;
  } catch (err) {
    error('No se pudieron cargar las métricas de migración');
  } finally {
    loading.value = false;
  }
}

async function updateFeatureFlag(flagName) {
  updating.value = true;

  try {
    await updateFlag(flagName, featureFlags[flagName]);
    success(`Flag ${flagName} actualizado correctamente`);

    // Recargar métricas después de actualizar flags
    await refreshStatus();
  } catch (err) {
    error(`No se pudo actualizar el flag ${flagName}`);
    // Revertir cambio
    featureFlags[flagName] = !featureFlags[flagName];
  } finally {
    updating.value = false;
  }
}

async function addUserToMigration() {
  if (!newUserEmail.value) return;

  addingUser.value = true;

  try {
    await addMigrationUser(newUserEmail.value);
    success('Usuario añadido a la migración');
    newUserEmail.value = '';
    await refreshStatus();
  } catch (err) {
    error('No se pudo añadir el usuario a la migración');
  } finally {
    addingUser.value = false;
  }
}

async function removeUserFromMigration(userId) {
  try {
    await removeMigrationUser(userId);
    success('Usuario eliminado de la migración');
    await refreshStatus();
  } catch (err) {
    error('No se pudo eliminar el usuario de la migración');
  }
}

async function testMigration() {
  testing.value = true;

  try {
    const results = await runMigrationTest();

    if (results.success) {
      success('Prueba de migración completada exitosamente');
    } else {
      warning('La prueba encontró algunos problemas. Revisa los logs.');
    }
  } catch (err) {
    error('No se pudo ejecutar la prueba de migración');
  } finally {
    testing.value = false;
  }
}

async function completeMigration() {
  if (!confirm('¿Estás seguro de completar la migración? Esto activará el sistema de colas para todos los usuarios.')) {
    return;
  }

  try {
    // Activar todos los flags
    await updateFlag('queueEnabled', true);
    await updateFlag('queueDashboardEnabled', true);
    await updateFlag('queueCreationEnabled', true);
    await updateFlag('queueSigningEnabled', true);

    success('¡Migración completada exitosamente!');
    await refreshStatus();
  } catch (err) {
    error('No se pudo completar la migración');
  }
}

function exportMetrics() {
  const data = {
    metrics: metrics.value,
    migratedUsers: migratedUsers.value,
    featureFlags: featureFlags,
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `migration-metrics-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  success('Métricas exportadas correctamente');
}

function getActivityColor(type) {
  switch (type) {
    case 'migration': return 'bg-green-500';
    case 'queue_created': return 'bg-blue-500';
    case 'queue_signed': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString('es-ES');
}

// Lifecycle
onMounted(() => {
  refreshStatus();
});
</script>

<style scoped>
.feature-toggle-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>