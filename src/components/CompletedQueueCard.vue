<template>
  <div class="completed-queue-card bg-white rounded-lg shadow-md border-l-4 border-green-500 p-5 mb-4 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="completed-icon bg-green-100 rounded-full p-2">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Completado</h3>
          <p class="text-sm text-gray-600">Todos han firmado el documento</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="completed-badge bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
          Finalizado
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

      <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          <span>{{ queue.emisor?.nombre || 'Usuario' }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>Completado: {{ formatDate(queue.completedAt) }}</span>
        </div>
      </div>

      <div v-if="queue.createdAt" class="flex items-center space-x-2 text-sm text-gray-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Duración total: {{ getTotalDuration() }}</span>
      </div>
    </div>

    <!-- Resumen de firma -->
    <div class="signature-summary mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold text-gray-900">Resumen de Firma</h4>
        <div class="flex items-center space-x-1">
          <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-sm font-medium text-green-600">{{ queue.totalParticipants }}/{{ queue.totalParticipants }}</span>
        </div>
      </div>

      <!-- Timeline de firma -->
      <div class="signature-timeline">
        <div class="space-y-2">
          <div
            v-for="(participant, index) in getParticipantsWithSignatures()"
            :key="participant.id || participant.usuario_id"
            class="flex items-center space-x-3"
          >
            <div class="relative">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                :class="getParticipantSignatureClass(participant, index)"
              >
                {{ getUserInitial(participant) }}
              </div>
              <!-- Conector -->
              <div
                v-if="index < getParticipantsWithSignatures().length - 1"
                class="absolute top-8 left-4 w-0.5 h-4 bg-green-300"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ participant.name || participant.nombre }}
                </p>
                <span class="text-xs text-gray-500">Turno {{ index + 1 }}</span>
              </div>
              <p class="text-xs text-gray-600">
                Firmado {{ formatSignatureDate(participant.signedAt || participant.fecha_firma) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="statistics-section mb-4 grid grid-cols-3 gap-3">
      <div class="stat-card p-3 bg-gray-50 rounded-lg text-center">
        <p class="text-2xl font-bold text-gray-900">{{ queue.totalParticipants }}</p>
        <p class="text-xs text-gray-600">Firmantes</p>
      </div>
      <div class="stat-card p-3 bg-gray-50 rounded-lg text-center">
        <p class="text-2xl font-bold text-gray-900">{{ getAverageSignatureTime() }}</p>
        <p class="text-xs text-gray-600">Tiempo promedio</p>
      </div>
      <div class="stat-card p-3 bg-gray-50 rounded-lg text-center">
        <p class="text-2xl font-bold text-gray-900">{{ getCompletionRate() }}%</p>
        <p class="text-xs text-gray-600">Tasa de finalización</p>
      </div>
    </div>

    <!-- Acciones principales -->
    <div class="actions-section">
      <div class="grid grid-cols-2 gap-3 mb-3">
        <button
          @click="$emit('download', queue)"
          class="download-button bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          <span>Descargar Final</span>
        </button>

        <button
          @click="$emit('view-details', queue)"
          class="details-button bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Ver Detalles</span>
        </button>
      </div>

      <!-- Acciones secundarias -->
      <div class="flex space-x-2">
        <button
          @click="$emit('share', queue)"
          class="secondary-action flex-1 text-gray-600 hover:text-gray-800 text-sm py-2 flex items-center justify-center space-x-1 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 4.026A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326"></path>
          </svg>
          <span>Compartir</span>
        </button>

        <button
          @click="$emit('archive', queue)"
          class="secondary-action text-gray-600 hover:text-gray-800 text-sm py-2 px-3 flex items-center space-x-1 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
          <span>Archivar</span>
        </button>

        <button
          @click="downloadCertificate"
          class="secondary-action text-gray-600 hover:text-gray-800 text-sm py-2 px-3 flex items-center space-x-1 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Certificado</span>
        </button>
      </div>
    </div>

    <!-- Indicador de calidad -->
    <div class="quality-indicator mt-3 flex items-center justify-center space-x-2 text-green-600">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
      <span class="text-sm font-medium">Proceso completado con éxito</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const emit = defineEmits(['download', 'view-details', 'hide', 'share', 'archive']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

// Obtener participantes con firmas
const getParticipantsWithSignatures = () => {
  if (!props.queue.participants) return [];

  return props.queue.participants
    .filter(p => p.signed || p.firmado)
    .sort((a, b) => {
      const dateA = new Date(a.signedAt || a.fecha_firma || 0);
      const dateB = new Date(b.signedAt || b.fecha_firma || 0);
      return dateA - dateB;
    });
};

// Obtener clase de participante firmado
const getParticipantSignatureClass = (participant, index) => {
  return 'bg-green-500 text-white';
};

// Formatear fecha de firma
const formatSignatureDate = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'hoy a las ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffDays === 1) {
    return 'ayer a las ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

// Formatear fecha general
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

// Obtener duración total
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

// Obtener tiempo promedio de firma
const getAverageSignatureTime = () => {
  // Esto podría calcularse basado en las fechas de firma reales
  // Por ahora, devolvemos un valor simulado
  return '~5m';
};

// Obtener tasa de finalización
const getCompletionRate = () => {
  if (!props.queue.totalParticipants) return 0;

  const signedCount = props.queue.signedParticipants || 0;
  return Math.round((signedCount / props.queue.totalParticipants) * 100);
};

// Obtener iniciales del usuario
const getUserInitial = (user) => {
  if (!user) return '?';

  const name = user.name || user.nombre;
  if (!name) return user.toString().charAt(0).toUpperCase();

  return name.charAt(0).toUpperCase();
};

// Descargar certificado
const downloadCertificate = () => {
  // Emitir evento o implementar lógica de descarga
  console.log('Descargando certificado para:', props.queue.document?.namePDF);
};
</script>

<style scoped>
.completed-queue-card {
  transition: all 0.3s ease;
}

.completed-queue-card:hover {
  transform: translateY(-2px);
}

.signature-timeline {
  max-height: 200px;
  overflow-y: auto;
}

.signature-timeline::-webkit-scrollbar {
  width: 4px;
}

.signature-timeline::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.signature-timeline::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}

.signature-timeline::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.stat-card {
  transition: all 0.2s ease;
}

.stat-card:hover {
  background-color: #e5e7eb;
  transform: scale(1.05);
}

.download-button {
  transition: all 0.2s ease;
}

.download-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}
</style>