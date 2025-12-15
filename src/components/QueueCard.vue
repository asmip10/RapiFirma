<template>
  <div class="queue-card urgent-card bg-white rounded-lg shadow-lg border-l-4 border-red-500 p-6 mb-4 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
    <!-- Header urgente -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="urgent-icon bg-red-100 rounded-full p-2">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-gray-900">¡Es tu turno!</h3>
          <p class="text-sm text-gray-600">Documento pendiente de firma</p>
        </div>
      </div>
      <span class="urgent-badge bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
        Urgente
      </span>
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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          <span>{{ queue.emisor?.nombre || 'Usuario' }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span :class="getTimeLeftClass()">
            {{ formatTimeLeft() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Progreso de firma -->
    <div class="progress-section mb-4">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>Progreso de firma</span>
        <span>{{ queue.currentPosition }}/{{ queue.totalParticipants }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-red-500 h-2 rounded-full transition-all duration-500"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {{ queue.signedParticipants }} firmantes han completado
      </p>
    </div>

    <!-- Participantes -->
    <div class="participants-section mb-4">
      <div class="flex -space-x-2">
        <!-- Avatar del firmante actual -->
        <div class="current-signer-avatar w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white z-10">
          {{ getUserInitial() }}
        </div>

        <!-- Avatares de otros participantes -->
        <div
          v-for="(participant, index) in getOtherParticipants()"
          :key="participant.id"
          class="participant-avatar w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium border-2 border-white"
          :class="{ 'bg-green-500 text-white': participant.signed, 'bg-gray-400': !participant.signed && index < queue.currentPosition - 1 }"
        >
          {{ getUserInitial(participant) }}
        </div>

        <!-- Indicador de más participantes -->
        <div v-if="queue.totalParticipants > 5" class="more-participants w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white">
          +{{ queue.totalParticipants - 5 }}
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-2">
        Eres el siguiente firmante
      </p>
    </div>

    <!-- Acciones principales -->
    <div class="actions-section">
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="$emit('sign', queue)"
          class="sign-button bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
          </svg>
          <span>Firmar Ahora</span>
        </button>

        <button
          @click="$emit('view-details', queue)"
          class="details-button bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Detalles</span>
        </button>
      </div>

      <!-- Acciones secundarias -->
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
          v-if="canHideQueue()"
          @click="$emit('hide', queue)"
          class="secondary-action text-gray-600 hover:text-gray-800 text-sm py-2 px-3 flex items-center space-x-1 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
          </svg>
          <span>Ocultar</span>
        </button>
      </div>
    </div>

    <!-- Indicador de urgencia animado -->
    <div v-if="isVeryUrgent()" class="urgency-indicator mt-3 flex items-center justify-center space-x-2 text-red-600 animate-pulse">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <span class="text-sm font-medium">¡Se necesita acción inmediata!</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const emit = defineEmits(['sign', 'view-details', 'download', 'hide']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

// Computar progreso
const progressPercentage = computed(() => {
  if (!props.queue.totalParticipants) return 0;
  return Math.round((props.queue.signedParticipants / props.queue.totalParticipants) * 100);
});

// Formatear tiempo restante
const formatTimeLeft = () => {
  if (!props.queue.expiresAt) return 'Sin expiración';

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

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
};

// Obtener clase para tiempo restante
const getTimeLeftClass = () => {
  if (!props.queue.expiresAt) return '';

  const now = new Date();
  const expires = new Date(props.queue.expiresAt);
  const hoursLeft = (expires - now) / (1000 * 60 * 60);

  if (hoursLeft <= 0) return 'text-red-600 font-bold';
  if (hoursLeft <= 2) return 'text-orange-600 font-semibold';
  if (hoursLeft <= 24) return 'text-yellow-600';
  return '';
};

// Verificar si es muy urgente
const isVeryUrgent = () => {
  if (!props.queue.expiresAt) return false;

  const now = new Date();
  const expires = new Date(props.queue.expiresAt);
  const hoursLeft = (expires - now) / (1000 * 60 * 60);

  return hoursLeft <= 2;
};

// Obtener iniciales del usuario
const getUserInitial = (user = null) => {
  const targetUser = user || getCurrentUser();
  if (!targetUser) return '?';

  if (targetUser.name) {
    return targetUser.name.charAt(0).toUpperCase();
  }

  if (targetUser.nombre) {
    return targetUser.nombre.charAt(0).toUpperCase();
  }

  return targetUser.toString().charAt(0).toUpperCase();
};

// Obtener otros participantes (limitado a 4 para mostrar)
const getOtherParticipants = () => {
  if (!props.queue.participants) return [];

  return props.queue.participants
    .slice(0, 4)
    .map(p => ({
      id: p.id || p.usuario_id,
      name: p.name || p.nombre,
      signed: p.signed || p.firmado || false
    }));
};

// Obtener usuario actual (simulado)
const getCurrentUser = () => {
  // En una implementación real, esto vendría del store de autenticación
  return { name: 'Usuario Actual' };
};

// Verificar si puede ocultar la cola
const canHideQueue = () => {
  // El usuario puede ocultar colas que no creó
  return props.queue.role !== 'emisor';
};
</script>

<style scoped>
.urgent-card {
  border-left-width: 6px;
  animation: subtle-glow 2s ease-in-out infinite alternate;
}

@keyframes subtle-glow {
  from {
    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -1px rgba(239, 68, 68, 0.06);
  }
  to {
    box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -2px rgba(239, 68, 68, 0.15);
  }
}

.current-signer-avatar {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.sign-button {
  transition: all 0.2s ease;
}

.sign-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.participants-avatar {
  transition: all 0.2s ease;
}

.participants-avatar:hover {
  transform: scale(1.1);
  z-index: 20;
}
</style>