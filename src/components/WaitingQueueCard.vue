<template>
  <div class="waiting-queue-card bg-white rounded-lg shadow-md border-l-4 border-yellow-500 p-5 mb-4 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="waiting-icon bg-yellow-100 rounded-full p-2">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">En Espera</h3>
          <p class="text-sm text-gray-600">Turno {{ getUserPosition() }} de {{ queue.totalParticipants }}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="waiting-badge bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
          Esperando turno
        </span>
        <button
          @click="$emit('hide', queue)"
          class="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          title="Ocultar cola"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
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

    <!-- Posición en la cola -->
    <div class="position-section mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-semibold text-gray-900">Tu Posición</h4>
        <span class="text-2xl font-bold text-yellow-600">{{ getUserPosition() }}</span>
      </div>

      <!-- Visualización de la cola -->
      <div class="queue-visualization mt-3">
        <div class="flex items-center justify-center space-x-1">
          <!-- Posiciones anteriores (firmadas) -->
          <div
            v-for="n in Math.max(0, getUserPosition() - 1)"
            :key="'signed-' + n"
            class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs text-white"
            title="Firmado"
          >
            ✓
          </div>

          <!-- Posición actual (firmando) -->
          <div
            v-if="getCurrentSigner()"
            class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-bold ring-2 ring-blue-300"
            title="Firmando ahora"
          >
            {{ getUserInitial(getCurrentSigner()) }}
          </div>

          <!-- Posiciones futuras (esperando) -->
          <div
            v-for="n in Math.min(3, queue.totalParticipants - getUserPosition())"
            :key="'waiting-' + n"
            class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600"
            title="Esperando"
          >
            {{ getUserPosition() + n }}
          </div>

          <!-- Indicador de más posiciones -->
          <div
            v-if="queue.totalParticipants - getUserPosition() > 3"
            class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600"
            title="Más participantes"
          >
            +{{ queue.totalParticipants - getUserPosition() - 3 }}
          </div>
        </div>
      </div>

      <div class="mt-3 text-sm text-gray-600">
        <p v-if="getCurrentSigner()">
          <span class="font-medium">{{ getCurrentSigner().name || getCurrentSigner().nombre }}</span> está firmando ahora
        </p>
        <p v-else class="text-yellow-700">
          La cola está por comenzar
        </p>
      </div>
    </div>

    <!-- Progreso general -->
    <div class="progress-section mb-4">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>Progreso total</span>
        <span>{{ queue.signedParticipants || 0 }}/{{ queue.totalParticipants }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-yellow-500 h-2 rounded-full transition-all duration-500"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {{ getEstimatedTime() }}
      </p>
    </div>

    <!-- Información de firma actual -->
    <div v-if="getCurrentSigner() && getCurrentSignerStartedAt()" class="current-signer-info mb-4 p-3 bg-blue-50 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
            {{ getUserInitial(getCurrentSigner()) }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">Tiempo de firma actual:</p>
            <p class="text-sm text-gray-600">{{ getCurrentSignerDuration() }}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-500">Promedio: {{ getAverageSigningTime() }}</p>
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
          @click="$emit('download', queue)"
          class="download-button bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-medium hover:bg-yellow-200 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          <span>Descargar</span>
        </button>
      </div>

      <!-- Notificación -->
      <div class="notification-section mt-3">
        <button
          @click="toggleNotification"
          class="w-full text-left text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center space-x-2 p-2 bg-gray-50 rounded-lg"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span>
            {{ hasNotification ? 'Notificaciones activadas' : 'Activar notificaciones' }}
          </span>
          <div v-if="hasNotification" class="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['view-details', 'download', 'hide']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

const hasNotification = ref(false);
const currentTime = ref(new Date());

// Actualizar tiempo cada minuto
let timeInterval = null;

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000); // Actualizar cada minuto
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});

// Computar progreso
const progressPercentage = computed(() => {
  if (!props.queue.totalParticipants) return 0;
  const signed = props.queue.signedParticipants || 0;
  return Math.round((signed / props.queue.totalParticipants) * 100);
});

// Obtener posición del usuario en la cola
const getUserPosition = () => {
  if (!props.queue.participants) return 1;

  const userId = getCurrentUserId(); // Implementar según sistema de autenticación
  const userIndex = props.queue.participants.findIndex(
    p => (p.id || p.usuario_id) === userId
  );

  return userIndex >= 0 ? userIndex + 1 : props.queue.totalParticipants + 1;
};

// Obtener ID del usuario actual (simulado)
const getCurrentUserId = () => {
  // En una implementación real, esto vendría del store de autenticación
  return 1; // ID simulado
};

// Obtener firmante actual
const getCurrentSigner = () => {
  if (!props.queue.participants || !props.queue.currentPosition) return null;

  const index = props.queue.currentPosition - 1;
  return props.queue.participants[index];
};

// Obtener fecha de inicio del firmante actual
const getCurrentSignerStartedAt = () => {
  const signer = getCurrentSigner();
  if (!signer) return null;

  return signer.startedAt || signer.inicio_firma || null;
};

// Obtener duración del firmante actual
const getCurrentSignerDuration = () => {
  const startedAt = getCurrentSignerStartedAt();
  if (!startedAt) return 'N/A';

  const start = new Date(startedAt);
  const now = new Date();
  const diff = now - start;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  return `${minutes} min`;
};

// Obtener tiempo promedio de firma
const getAverageSigningTime = () => {
  // Esto podría venir de datos estadísticos del backend
  return '~5 min';
};

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

// Obtener tiempo estimado hasta tu turno
const getEstimatedTime = () => {
  const userPosition = getUserPosition();
  const currentPosition = props.queue.currentPosition || 1;
  const peopleAhead = Math.max(0, userPosition - currentPosition);

  if (peopleAhead === 0) return '¡Es tu turno pronto!';

  // Tiempo estimado basado en promedio histórico
  const avgTime = 5; // 5 minutos por persona
  const estimatedMinutes = peopleAhead * avgTime;

  if (estimatedMinutes < 60) {
    return `~${estimatedMinutes} minutos para tu turno`;
  }

  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;

  return `~${hours}h ${minutes}m para tu turno`;
};

// Obtener iniciales del usuario
const getUserInitial = (user) => {
  if (!user) return '?';

  const name = user.name || user.nombre;
  if (!name) return user.toString().charAt(0).toUpperCase();

  return name.charAt(0).toUpperCase();
};

// Toggle notificaciones
const toggleNotification = () => {
  hasNotification.value = !hasNotification.value;

  if (hasNotification.value) {
    // Solicitar permiso de notificación del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
};
</script>

<style scoped>
.waiting-queue-card {
  transition: all 0.3s ease;
}

.waiting-queue-card:hover {
  transform: translateY(-2px);
}

.queue-visualization {
  overflow-x: auto;
  padding: 8px 0;
}

.queue-visualization::-webkit-scrollbar {
  height: 4px;
}

.queue-visualization::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.queue-visualization::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}

.queue-visualization::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.notification-section button:hover {
  background-color: #f3f4f6;
}
</style>