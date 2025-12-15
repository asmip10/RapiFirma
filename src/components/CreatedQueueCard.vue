<template>
  <div class="created-queue-card bg-white rounded-lg shadow-md border-l-4 border-blue-500 p-5 mb-4 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="creator-icon bg-blue-100 rounded-full p-2">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Cola Creada</h3>
          <p class="text-sm text-gray-600">Eres el emisor de este documento</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span :class="getStatusClass()" class="px-3 py-1 rounded-full text-xs font-medium">
          {{ getStatusText() }}
        </span>
        <button
          @click="$emit('cancel', queue)"
          v-if="canCancelQueue()"
          class="text-gray-400 hover:text-red-600 transition-colors duration-200"
          title="Cancelar cola"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Información del documento -->
    <div class="document-info mb-4">
      <div class="flex items-center space-x-2 mb-2">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span class="font-medium text-gray-900">{{ queue.document?.namePDF || queue.nombrePDF }}</span>
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Creado: {{ formatDate(queue.createdAt) }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <span>{{ queue.totalParticipants }} participantes</span>
        </div>
      </div>

      <div v-if="queue.expiresAt" class="flex items-center space-x-2 mt-2 text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span :class="getExpirationClass()">
          Expira: {{ formatDate(queue.expiresAt) }}
        </span>
      </div>
    </div>

    <!-- Progreso de firma -->
    <div class="progress-section mb-4">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>Progreso general</span>
        <span>{{ queue.signedParticipants || 0 }}/{{ queue.totalParticipants }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          :class="getProgressClass()"
          class="h-2 rounded-full transition-all duration-500"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {{ getProgressText() }}
      </p>
    </div>

    <!-- Firmante actual -->
    <div v-if="getCurrentSigner()" class="current-signer-section mb-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
            {{ getUserInitial(getCurrentSigner()) }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">Firmando ahora:</p>
            <p class="text-sm text-gray-600">{{ getCurrentSigner().name || getCurrentSigner().nombre }}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-500">Turno {{ queue.currentPosition }}/{{ queue.totalParticipants }}</span>
        </div>
      </div>
    </div>

    <!-- Lista de participantes (colapsable) -->
    <div class="participants-section mb-4">
      <button
        @click="toggleParticipants"
        class="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
      >
        <span>Ver participantes</span>
        <svg
          class="w-4 h-4 transform transition-transform duration-200"
          :class="{ 'rotate-180': showParticipants }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <div v-if="showParticipants" class="mt-3 space-y-2">
        <div
          v-for="(participant, index) in queue.participants"
          :key="participant.id || participant.usuario_id"
          class="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div class="flex items-center space-x-3">
            <div class="relative">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                :class="getParticipantClass(participant, index)"
              >
                {{ getUserInitial(participant) }}
              </div>
              <div
                v-if="participant.signed || participant.firmado"
                class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
              ></div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">
                {{ participant.name || participant.nombre }}
              </p>
              <p class="text-xs text-gray-500">
                Turno {{ index + 1 }} {{ getParticipantStatus(participant, index) }}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span v-if="participant.signed || participant.firmado" class="text-xs text-green-600 font-medium">
              Firmado
            </span>
            <span v-else-if="index === queue.currentPosition - 1" class="text-xs text-blue-600 font-medium">
              Firmando
            </span>
            <span v-else class="text-xs text-gray-400">
              Pendiente
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones -->
    <div class="actions-section">
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="$emit('view-details', queue)"
          class="details-button bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Detalles</span>
        </button>

        <button
          @click="$emit('add-users', queue)"
          v-if="canAddParticipants()"
          class="add-users-button bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
          <span>Agregar</span>
        </button>
      </div>

      <div class="flex space-x-2 mt-3">
        <button
          @click="$emit('download', queue)"
          class="secondary-action flex-1 text-gray-600 hover:text-gray-800 text-sm py-2 flex items-center justify-center space-x-1 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          <span>Descargar</span>
        </button>

        <button
          @click="$emit('hide', queue)"
          v-if="canHideQueue()"
          class="secondary-action text-gray-600 hover:text-gray-800 text-sm py-2 px-3 flex items-center space-x-1 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
          </svg>
          <span>Ocultar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['view-details', 'add-users', 'download', 'hide', 'cancel']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

const showParticipants = ref(false);

// Computar progreso
const progressPercentage = computed(() => {
  if (!props.queue.totalParticipants) return 0;
  const signed = props.queue.signedParticipants || 0;
  return Math.round((signed / props.queue.totalParticipants) * 100);
});

// Toggle participantes
const toggleParticipants = () => {
  showParticipants.value = !showParticipants.value;
};

// Obtener clase de estado
const getStatusClass = () => {
  switch (props.queue.status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'InProgress':
      return 'bg-blue-100 text-blue-800';
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Obtener texto de estado
const getStatusText = () => {
  switch (props.queue.status) {
    case 'Pending':
      return 'Pendiente';
    case 'InProgress':
      return 'En Progreso';
    case 'Completed':
      return 'Completado';
    case 'Cancelled':
      return 'Cancelado';
    default:
      return 'Desconocido';
  }
};

// Obtener clase de progreso
const getProgressClass = () => {
  const percentage = progressPercentage.value;
  if (percentage === 100) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 30) return 'bg-yellow-500';
  return 'bg-gray-400';
};

// Obtener texto de progreso
const getProgressText = () => {
  const signed = props.queue.signedParticipants || 0;
  const total = props.queue.totalParticipants;
  const remaining = total - signed;

  if (remaining === 0) return 'Todos han firmado';
  if (remaining === 1) return '1 firmante pendiente';
  return `${remaining} firmantes pendientes`;
};

// Formatear fecha
const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Obtener clase de expiración
const getExpirationClass = () => {
  if (!props.queue.expiresAt) return '';

  const now = new Date();
  const expires = new Date(props.queue.expiresAt);
  const hoursLeft = (expires - now) / (1000 * 60 * 60);

  if (hoursLeft <= 0) return 'text-red-600 font-semibold';
  if (hoursLeft <= 24) return 'text-orange-600 font-medium';
  return 'text-gray-600';
};

// Obtener firmante actual
const getCurrentSigner = () => {
  if (!props.queue.participants || !props.queue.currentPosition) return null;

  const index = props.queue.currentPosition - 1;
  return props.queue.participants[index];
};

// Obtener clase de participante
const getParticipantClass = (participant, index) => {
  if (participant.signed || participant.firmado) {
    return 'bg-green-500 text-white';
  }
  if (index === props.queue.currentPosition - 1) {
    return 'bg-blue-500 text-white';
  }
  return 'bg-gray-300 text-gray-700';
};

// Obtener estado del participante
const getParticipantStatus = (participant, index) => {
  if (participant.signed || participant.firmado) {
    const signedDate = participant.signedAt || participant.fecha_firma;
    return `- Firmado ${signedDate ? formatDate(signedDate) : ''}`;
  }
  if (index === props.queue.currentPosition - 1) {
    return '- Firmando ahora';
  }
  return '- Pendiente';
};

// Obtener iniciales del usuario
const getUserInitial = (user) => {
  if (!user) return '?';

  const name = user.name || user.nombre;
  if (!name) return user.toString().charAt(0).toUpperCase();

  return name.charAt(0).toUpperCase();
};

// Verificar si puede cancelar la cola
const canCancelQueue = () => {
  return props.queue.status === 'Pending' || props.queue.status === 'InProgress';
};

// Verificar si puede agregar participantes
const canAddParticipants = () => {
  return props.queue.status === 'Pending' || props.queue.status === 'InProgress';
};

// Verificar si puede ocultar la cola
const canHideQueue = () => {
  return props.queue.status === 'Completed';
};
</script>

<style scoped>
.created-queue-card {
  transition: all 0.3s ease;
}

.created-queue-card:hover {
  transform: translateY(-2px);
}

.participants-section {
  max-height: 300px;
  overflow-y: auto;
}

.participants-section::-webkit-scrollbar {
  width: 4px;
}

.participants-section::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.participants-section::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}

.participants-section::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>