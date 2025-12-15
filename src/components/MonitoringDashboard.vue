<template>
  <div class="monitoring-dashboard">
    <!-- Real-time Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Usuarios Activos</p>
            <p class="text-2xl font-bold text-gray-900">{{ realTimeMetrics.activeUsers }}</p>
            <p class="text-xs text-green-600 mt-1">
              {{ realTimeMetrics.activeUsersChange > 0 ? '+' : '' }}{{ realTimeMetrics.activeUsersChange }}%
            </p>
          </div>
          <div class="bg-blue-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Tasa de Éxito</p>
            <p class="text-2xl font-bold text-green-600">{{ realTimeMetrics.successRate }}%</p>
            <p class="text-xs text-gray-500 mt-1">Operaciones exitosas</p>
          </div>
          <div class="bg-green-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Tiempo Respuesta</p>
            <p class="text-2xl font-bold text-purple-600">{{ realTimeMetrics.avgResponseTime }}ms</p>
            <p class="text-xs text-purple-500 mt-1">Últimos 5 min</p>
          </div>
          <div class="bg-purple-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Colas Activas</p>
            <p class="text-2xl font-bold text-orange-600">{{ realTimeMetrics.activeQueues }}</p>
            <p class="text-xs text-orange-500 mt-1">{{ realTimeMetrics.queuesInProcess }} en proceso</p>
          </div>
          <div class="bg-orange-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Queue Activity Chart -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">📈 Actividad de Colas</h3>
          <select v-model="queueChartPeriod" class="px-3 py-1 border border-gray-300 rounded-lg text-sm">
            <option value="1h">Última hora</option>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </div>

        <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div class="text-center text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <p>Gráfico de actividad de colas</p>
            <p class="text-sm mt-2">{{ getQueueChartData().length }} datos mostrados</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold text-green-600">{{ queueStats.created }}</p>
            <p class="text-sm text-gray-600">Creadas</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">{{ queueStats.completed }}</p>
            <p class="text-sm text-gray-600">Completadas</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-orange-600">{{ queueStats.cancelled }}</p>
            <p class="text-sm text-gray-600">Canceladas</p>
          </div>
        </div>
      </div>

      <!-- System Performance Chart -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">⚡ Rendimiento del Sistema</h3>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            <span class="text-sm text-gray-600">Tiempo real</span>
          </div>
        </div>

        <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div class="text-center text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <p>Gráfico de rendimiento</p>
            <p class="text-sm mt-2">{{ performanceMetrics.length }} métricas</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold text-purple-600">{{ performanceMetrics.avgResponse }}ms</p>
            <p class="text-sm text-gray-600">Respuesta Promedio</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">{{ performanceMetrics.peakLoad }}req/s</p>
            <p class="text-sm text-gray-600">Pico Máximo</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert System -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">🚨 Sistema de Alertas</h3>
        <button
          @click="clearAlerts"
          class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Limpiar Alertas
        </button>
      </div>

      <div v-if="alerts.length === 0" class="text-center py-8 text-gray-500">
        No hay alertas activas
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="flex items-center justify-between p-4 rounded-lg border"
          :class="getAlertClass(alert.severity)"
        >
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ alert.title }}</h4>
              <p class="text-sm text-gray-600">{{ alert.description }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ formatAlertTime(alert.timestamp) }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getAlertBadgeClass(alert.severity)"
            >
              {{ alert.severity.toUpperCase() }}
            </span>
            <button
              @click="dismissAlert(alert.id)"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Stream -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">📡 Flujo de Eventos en Tiempo Real</h3>
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-sm text-gray-600">Conectado</span>
        </div>
      </div>

      <div class="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
        <div
          v-for="event in eventStream"
          :key="event.id"
          class="mb-2 flex items-start space-x-3"
        >
          <span class="text-gray-500 whitespace-nowrap">{{ formatEventTime(event.timestamp) }}</span>
          <span
            class="px-2 py-0.5 rounded text-xs whitespace-nowrap"
            :class="getEventTypeClass(event.type)"
          >
            {{ event.type }}
          </span>
          <span class="flex-1 text-gray-300">{{ event.message }}</span>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <p class="text-sm text-gray-600">
          {{ eventStream.length }} eventos en la última hora
        </p>
        <button
          @click="clearEventStream"
          class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Limpiar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  createTrackedInterval,
  createTrackedTimeout,
  addTrackedEventListener,
  generateComponentId,
  useResourceCleanup,
  memoryMonitor,
  debounce,
  throttle
} from '../utils/performance';

// ID único del componente para tracking de resources
const componentId = generateComponentId('MonitoringDashboard');

// Estado
const queueChartPeriod = ref('24h');
const realTimeMetrics = ref({
  activeUsers: 0,
  activeUsersChange: 0,
  successRate: 0,
  avgResponseTime: 0,
  activeQueues: 0,
  queuesInProcess: 0
});

const queueStats = ref({
  created: 0,
  completed: 0,
  cancelled: 0
});

const performanceMetrics = ref({
  avgResponse: 0,
  peakLoad: 0,
  dataPoints: []
});

const alerts = ref([]);
const eventStream = ref([]);

// Computadas
const getQueueChartData = () => {
  // Simular datos según el período seleccionado
  const dataPoints = {
    '1h': 60,
    '24h': 24,
    '7d': 7,
    '30d': 30
  };

  return Array(dataPoints[queueChartPeriod.value] || 24).fill(0).map((_, i) => ({
    timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
    created: Math.floor(Math.random() * 10),
    completed: Math.floor(Math.random() * 8),
    cancelled: Math.floor(Math.random() * 2)
  }));
};

// Métodos con optimización
const updateRealTimeMetrics = debounce(() => {
  // Muestra memory en cada actualización
  memoryMonitor.sampleMemory();

  // Simular actualización de métricas
  realTimeMetrics.value = {
    activeUsers: 67 + Math.floor(Math.random() * 20),
    activeUsersChange: Math.floor(Math.random() * 10) - 5,
    successRate: 95 + Math.floor(Math.random() * 4),
    avgResponseTime: 120 + Math.floor(Math.random() * 80),
    activeQueues: 23 + Math.floor(Math.random() * 10),
    queuesInProcess: 8 + Math.floor(Math.random() * 5)
  };

  // Actualizar stats de colas
  const queueData = getQueueChartData();
  queueStats.value = {
    created: queueData.reduce((sum, d) => sum + d.created, 0),
    completed: queueData.reduce((sum, d) => sum + d.completed, 0),
    cancelled: queueData.reduce((sum, d) => sum + d.cancelled, 0)
  };

  // Actualizar métricas de rendimiento
  performanceMetrics.value = {
    avgResponse: 120 + Math.floor(Math.random() * 80),
    peakLoad: 45 + Math.floor(Math.random() * 20),
    dataPoints: Array(10).fill(0).map(() => ({
      timestamp: new Date(),
      responseTime: 100 + Math.floor(Math.random() * 100),
      load: Math.floor(Math.random() * 100)
    }))
  };

  // Generar alertas aleatorias
  if (Math.random() > 0.8) {
    generateRandomAlert();
  }

  // Añadir evento al stream
  addEventToStream();
}, 100);

function generateRandomAlert() {
  const alertTypes = [
    { severity: 'warning', title: 'Alta carga en el sistema', description: 'El uso de CPU ha superado el 80%' },
    { severity: 'error', title: 'Error de conexión a BD', description: 'Timeout al conectar con la base de datos' },
    { severity: 'info', title: 'Nuevo usuario migrado', description: 'Usuario ha sido migrado al sistema de colas' },
    { severity: 'warning', title: 'Cola estancada', description: 'La cola queue-123 no ha progresado en 2 horas' }
  ];

  const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];

  alerts.value.unshift({
    id: Date.now(),
    ...alert,
    timestamp: new Date().toISOString()
  });

  // Limitar a 10 alertas
  if (alerts.value.length > 10) {
    alerts.value = alerts.value.slice(0, 10);
  }
}

function addEventToStream() {
  const eventTypes = [
    { type: 'QUEUE_CREATED', message: 'Nueva cola creada' },
    { type: 'DOCUMENT_SIGNED', message: 'Documento firmado exitosamente' },
    { type: 'USER_LOGIN', message: 'Usuario inició sesión' },
    { type: 'QUEUE_COMPLETED', message: 'Cola completada' },
    { type: 'API_REQUEST', message: 'Request procesado' },
    { type: 'MIGRATION_EVENT', message: 'Evento de migración' }
  ];

  const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  eventStream.value.unshift({
    id: Date.now(),
    ...event,
    timestamp: new Date().toISOString()
  });

  // Limitar a 50 eventos
  if (eventStream.value.length > 50) {
    eventStream.value = eventStream.value.slice(0, 50);
  }
}

function dismissAlert(alertId) {
  alerts.value = alerts.value.filter(alert => alert.id !== alertId);
}

function clearAlerts() {
  alerts.value = [];
}

function clearEventStream() {
  eventStream.value = [];
}

function getAlertClass(severity) {
  switch (severity) {
    case 'error':
      return 'border-red-200 bg-red-50';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50';
    case 'info':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
}

function getAlertBadgeClass(severity) {
  switch (severity) {
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'info':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getEventTypeClass(type) {
  const colors = {
    'QUEUE_CREATED': 'bg-green-500 text-white',
    'DOCUMENT_SIGNED': 'bg-blue-500 text-white',
    'USER_LOGIN': 'bg-purple-500 text-white',
    'QUEUE_COMPLETED': 'bg-orange-500 text-white',
    'API_REQUEST': 'bg-gray-500 text-white',
    'MIGRATION_EVENT': 'bg-indigo-500 text-white'
  };

  return colors[type] || 'bg-gray-500 text-white';
}

function formatAlertTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'ahora mismo';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
  return date.toLocaleDateString('es-ES');
}

function formatEventTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Lifecycle con cleanup automático
onMounted(() => {
  // Usar tracked intervals para cleanup automático
  createTrackedInterval(componentId, updateRealTimeMetrics, 5000);
  createTrackedInterval(componentId, addEventToStream, 2000);

  // Carga inicial
  updateRealTimeMetrics();

  // Setup cleanup automático al desmontar
  useResourceCleanup(componentId);
});
</script>

<style scoped>
.monitoring-dashboard {
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