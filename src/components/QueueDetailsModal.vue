<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="$emit('close')"></div>

    <!-- Modal container -->
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-white bg-opacity-20 rounded-full p-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">Detalles de la Cola</h2>
                <p class="text-blue-100 text-sm">{{ queue.document?.namePDF || queue.nombrePDF }}</p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="text-white hover:text-blue-200 transition-colors duration-200"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-3 text-sm font-medium transition-colors duration-200 border-b-2"
              :class="[
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Content -->
        <div class="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="space-y-6">
            <!-- Basic Info -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-600 mb-1">Estado</p>
                  <div class="flex items-center space-x-2">
                    <span :class="getStatusClass()" class="px-3 py-1 rounded-full text-xs font-medium">
                      {{ getStatusText() }}
                    </span>
                    <span v-if="queue.expiresAt" class="text-sm text-gray-500">
                      {{ formatTimeRemaining() }}
                    </span>
                  </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-600 mb-1">Progreso</p>
                  <div class="flex items-center space-x-2">
                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        :style="{ width: `${progressPercentage}%` }"
                      ></div>
                    </div>
                    <span class="text-sm font-medium">{{ queue.signedParticipants }}/{{ queue.totalParticipants }}</span>
                  </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-600 mb-1">Creado por</p>
                  <p class="font-medium">{{ queue.emisor?.nombre || 'Usuario' }}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-600 mb-1">Fecha de creación</p>
                  <p class="font-medium">{{ formatDate(queue.createdAt) }}</p>
                </div>
                <div v-if="queue.completedAt" class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-600 mb-1">Completado el</p>
                  <p class="font-medium">{{ formatDate(queue.completedAt) }}</p>
                </div>
                <div v-if="queue.completedAt" class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-600 mb-1">Duración total</p>
                  <p class="font-medium">{{ getTotalDuration() }}</p>
                </div>
              </div>
            </div>

            <!-- Timeline -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Línea de Tiempo</h3>
              <div class="relative">
                <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                <div class="space-y-4">
                  <div
                    v-for="(event, index) in getTimelineEvents()"
                    :key="index"
                    class="relative flex items-start space-x-4"
                  >
                    <div
                      class="relative z-10 w-16 h-16 rounded-full flex items-center justify-center"
                      :class="getEventIconClass(event)"
                    >
                      <component :is="getEventIcon(event)" class="w-6 h-6" />
                    </div>
                    <div class="flex-1 pt-2">
                      <div class="flex items-center justify-between">
                        <h4 class="font-medium text-gray-900">{{ event.title }}</h4>
                        <span class="text-sm text-gray-500">{{ formatEventDate(event.date) }}</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">{{ event.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Participants Tab -->
          <div v-if="activeTab === 'participants'" class="space-y-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Participantes ({{ queue.participants?.length || 0 }})</h3>
              <button
                v-if="canAddParticipants()"
                @click="$emit('add-participants', queue)"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
                <span>Agregar participantes</span>
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(participant, index) in queue.participants"
                :key="participant.id || participant.usuario_id"
                class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div class="flex items-center space-x-4">
                  <div class="relative">
                    <div
                      class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium"
                      :class="getParticipantAvatarClass(participant, index)"
                    >
                      {{ getUserInitial(participant) }}
                    </div>
                    <div
                      v-if="participant.signed || participant.firmado"
                      class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                    >
                      <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ participant.name || participant.nombre }}</p>
                    <p class="text-sm text-gray-600">Turno {{ index + 1 }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="getParticipantStatusClass(participant, index)"
                  >
                    {{ getParticipantStatus(participant, index) }}
                  </span>
                  <p v-if="participant.signedAt || participant.fecha_firma" class="text-xs text-gray-500 mt-1">
                    {{ formatSignatureDate(participant.signedAt || participant.fecha_firma) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Activity Tab -->
          <div v-if="activeTab === 'activity'" class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Historial de Actividad</h3>

            <div v-if="activities.length === 0" class="text-center py-8">
              <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p class="text-gray-500">No hay actividad registrada</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(activity, index) in activities"
                :key="index"
                class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="getActivityIconClass(activity)"
                >
                  <component :is="getActivityIcon(activity)" class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-gray-900">{{ activity.title }}</p>
                    <span class="text-xs text-gray-500">{{ formatEventDate(activity.date) }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ activity.description }}</p>
                  <p v-if="activity.user" class="text-xs text-gray-500 mt-1">
                    Por: {{ activity.user }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Statistics Tab -->
          <div v-if="activeTab === 'statistics'" class="space-y-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-blue-50 p-6 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-600 mb-2">{{ queue.totalParticipants }}</div>
                <p class="text-sm text-gray-600">Total de participantes</p>
              </div>
              <div class="bg-green-50 p-6 rounded-lg text-center">
                <div class="text-3xl font-bold text-green-600 mb-2">{{ getCompletionRate() }}%</div>
                <p class="text-sm text-gray-600">Tasa de completación</p>
              </div>
              <div class="bg-purple-50 p-6 rounded-lg text-center">
                <div class="text-3xl font-bold text-purple-600 mb-2">{{ getAverageSigningTime() }}</div>
                <p class="text-sm text-gray-600">Tiempo promedio de firma</p>
              </div>
            </div>

            <div v-if="queue.participants && queue.participants.length > 0" class="bg-gray-50 p-6 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-4">Tiempo por participante</h4>
              <div class="space-y-3">
                <div
                  v-for="(participant, index) in queue.participants"
                  :key="participant.id || participant.usuario_id"
                  class="flex items-center justify-between"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                      :class="getParticipantAvatarClass(participant, index)"
                    >
                      {{ getUserInitial(participant) }}
                    </div>
                    <span class="text-sm font-medium">{{ participant.name || participant.nombre }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-sm font-medium">{{ getParticipantTime(participant) }}</span>
                    <p class="text-xs text-gray-500">Turno {{ index + 1 }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="flex space-x-3">
              <button
                @click="$emit('download', queue)"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                </svg>
                <span>Descargar</span>
              </button>

              <button
                v-if="canCancelQueue()"
                @click="$emit('cancel', queue)"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span>Cancelar</span>
              </button>
            </div>

            <button
              @click="$emit('close')"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['close', 'download', 'cancel', 'add-participants']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

// Estado
const activeTab = ref('overview');

// Tabs
const tabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'participants', label: 'Participantes' },
  { id: 'activity', label: 'Actividad' },
  { id: 'statistics', label: 'Estadísticas' }
];

// Computar progreso
const progressPercentage = computed(() => {
  if (!props.queue.totalParticipants) return 0;
  return Math.round((props.queue.signedParticipants / props.queue.totalParticipants) * 100);
});

// Actividades simuladas
const activities = computed(() => {
  const events = [];

  if (props.queue.createdAt) {
    events.push({
      type: 'created',
      title: 'Cola creada',
      description: 'El documento fue agregado a la cola de firma',
      date: props.queue.createdAt,
      user: props.queue.emisor?.nombre
    });
  }

  if (props.queue.participants) {
    props.queue.participants.forEach((participant, index) => {
      if (participant.signed || participant.firmado) {
        events.push({
          type: 'signed',
          title: 'Documento firmado',
          description: `${participant.name || participant.nombre} firmó el documento`,
          date: participant.signedAt || participant.fecha_firma,
          user: participant.name || participant.nombre
        });
      }
    });
  }

  if (props.queue.completedAt) {
    events.push({
      type: 'completed',
      title: 'Proceso completado',
      description: 'Todos los participantes han firmado el documento',
      date: props.queue.completedAt,
      user: 'Sistema'
    });
  }

  return events.sort((a, b) => new Date(b.date) - new Date(a.date));
});

// Eventos de timeline
const getTimelineEvents = () => {
  const events = [];

  if (props.queue.createdAt) {
    events.push({
      type: 'created',
      title: 'Cola iniciada',
      description: `Creada por ${props.queue.emisor?.nombre || 'Usuario'}`,
      date: props.queue.createdAt
    });
  }

  if (props.queue.participants) {
    props.queue.participants.forEach((participant, index) => {
      if (index === props.queue.currentPosition - 1) {
        events.push({
          type: 'current',
          title: 'Firma en progreso',
          description: `${participant.name || participant.nombre} está firmando actualmente`,
          date: participant.startedAt || new Date()
        });
      }
    });
  }

  if (props.queue.completedAt) {
    events.push({
      type: 'completed',
      title: 'Completado',
      description: 'Todos los participantes han firmado exitosamente',
      date: props.queue.completedAt
    });
  }

  return events;
};

// Getters
const getStatusClass = () => {
  switch (props.queue.status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'InProgress': return 'bg-blue-100 text-blue-800';
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'Cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = () => {
  switch (props.queue.status) {
    case 'Pending': return 'Pendiente';
    case 'InProgress': return 'En Progreso';
    case 'Completed': return 'Completado';
    case 'Cancelled': return 'Cancelado';
    default: return 'Desconocido';
  }
};

const getParticipantAvatarClass = (participant, index) => {
  if (participant.signed || participant.firmado) {
    return 'bg-green-500 text-white';
  }
  if (index === props.queue.currentPosition - 1) {
    return 'bg-blue-500 text-white';
  }
  return 'bg-gray-300 text-gray-700';
};

const getParticipantStatus = (participant, index) => {
  if (participant.signed || participant.firmado) {
    return 'Firmado';
  }
  if (index === props.queue.currentPosition - 1) {
    return 'Firmando ahora';
  }
  return 'Pendiente';
};

const getParticipantStatusClass = (participant, index) => {
  if (participant.signed || participant.firmado) {
    return 'bg-green-100 text-green-800';
  }
  if (index === props.queue.currentPosition - 1) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const getEventIcon = (event) => {
  switch (event.type) {
    case 'created':
      return 'svg';
    case 'current':
      return 'svg';
    case 'completed':
      return 'svg';
    default:
      return 'svg';
  }
};

const getEventIconClass = (event) => {
  switch (event.type) {
    case 'created':
      return 'bg-blue-100 text-blue-600';
    case 'current':
      return 'bg-yellow-100 text-yellow-600';
    case 'completed':
      return 'bg-green-100 text-green-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getActivityIcon = (activity) => {
  switch (activity.type) {
    case 'created':
      return 'svg';
    case 'signed':
      return 'svg';
    case 'completed':
      return 'svg';
    default:
      return 'svg';
  }
};

const getActivityIconClass = (activity) => {
  switch (activity.type) {
    case 'created':
      return 'bg-blue-100 text-blue-600';
    case 'signed':
      return 'bg-green-100 text-green-600';
    case 'completed':
      return 'bg-purple-100 text-purple-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

// Formatters
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatEventDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'hoy ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffDays === 1) {
    return 'ayer ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-ES');
  }
};

const formatSignatureDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTimeRemaining = () => {
  if (!props.queue.expiresAt) return '';

  const now = new Date();
  const expires = new Date(props.queue.expiresAt);
  const diff = expires - now;

  if (diff <= 0) return 'Expirado';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} día${days !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${minutes}m`;
};

const getTotalDuration = () => {
  if (!props.queue.createdAt || !props.queue.completedAt) return 'N/A';

  const start = new Date(props.queue.createdAt);
  const end = new Date(props.queue.completedAt);
  const diff = end - start;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} minutos`;
  }
};

const getCompletionRate = () => {
  if (!props.queue.totalParticipants) return 0;
  const signed = props.queue.signedParticipants || 0;
  return Math.round((signed / props.queue.totalParticipants) * 100);
};

const getAverageSigningTime = () => {
  // Simulación - debería calcularse basado en datos reales
  return '~5m';
};

const getParticipantTime = (participant) => {
  // Simulación - debería calcularse basado en datos reales
  if (participant.signed || participant.firmado) {
    return '4m 32s';
  }
  return 'Pendiente';
};

const getUserInitial = (user) => {
  if (!user) return '?';
  const name = user.name || user.nombre;
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const canAddParticipants = () => {
  return props.queue.status === 'Pending' || props.queue.status === 'InProgress';
};

const canCancelQueue = () => {
  return props.queue.status === 'Pending' || props.queue.status === 'InProgress';
};
</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>