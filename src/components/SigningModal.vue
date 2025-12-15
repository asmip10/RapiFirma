<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

    <!-- Modal container -->
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-white bg-opacity-20 rounded-full p-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">Firmar Documento</h2>
                <p class="text-red-100 text-sm">Turno {{ currentPosition }} de {{ totalParticipants }}</p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="text-white hover:text-red-200 transition-colors duration-200"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <!-- Document info -->
          <div class="mb-6">
            <div class="flex items-center space-x-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <div>
                <h3 class="font-semibold text-gray-900">{{ documentName }}</h3>
                <p class="text-sm text-gray-600">Enviado por: {{ emitterName }}</p>
              </div>
            </div>

            <!-- Progress indicator -->
            <div class="mb-4">
              <div class="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progreso de firma</span>
                <span>{{ signedCount }}/{{ totalParticipants }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-red-500 h-2 rounded-full transition-all duration-500"
                  :style="{ width: `${progressPercentage}%` }"
                ></div>
              </div>
            </div>

            <!-- Participants preview -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-gray-900 mb-3">Orden de firma</h4>
              <div class="space-y-2">
                <div
                  v-for="(participant, index) in participants"
                  :key="participant.id"
                  class="flex items-center space-x-3 p-2 rounded-lg"
                  :class="getParticipantClass(index)"
                >
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                    :class="getParticipantAvatarClass(index)"
                  >
                    {{ getUserInitial(participant) }}
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">{{ participant.name }}</p>
                    <p class="text-xs text-gray-600">
                      {{ getParticipantStatus(index) }}
                    </p>
                  </div>
                  <div v-if="index < currentPosition - 1" class="text-green-600">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div v-else-if="index === currentPosition - 1" class="text-red-600">
                    <div class="animate-pulse">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                  <div v-else class="text-gray-400">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PDF Viewer -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Vista previa del documento</h4>
            <div class="bg-gray-100 rounded-lg p-4 h-96 flex items-center justify-center">
              <div v-if="!pdfLoaded" class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                <p class="text-gray-600">Cargando documento...</p>
              </div>
              <div v-else-if="pdfError" class="text-center">
                <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-red-600 font-medium mb-2">Error al cargar el documento</p>
                <button
                  @click="loadPDF"
                  class="text-red-600 hover:text-red-800 text-sm underline"
                >
                  Reintentar
                </button>
              </div>
              <div v-else class="w-full h-full bg-white rounded shadow-md">
                <!-- Aquí iría el visor de PDF real -->
                <div class="h-full flex items-center justify-center text-gray-500">
                  <div class="text-center">
                    <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    <p>Visor de PDF ({{ documentName }})</p>
                    <p class="text-sm mt-2">Contenido del documento simulado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Signature section -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Configuración de firma</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Signature type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de firma
                </label>
                <select v-model="signatureType" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  <option value="digital">Firma Digital</option>
                  <option value="biometric">Firma Biométrica</option>
                  <option value="simple">Firma Simple</option>
                </select>
              </div>

              <!-- Signature position -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Posición de firma
                </label>
                <select v-model="signaturePosition" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  <option value="auto">Automática</option>
                  <option value="manual">Manual</option>
                  <option value="last-page">Última página</option>
                </select>
              </div>

              <!-- Comments -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios (opcional)
                </label>
                <textarea
                  v-model="comments"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Agrega comentarios sobre este documento..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">
              <p>Al firmar, confirmas que has revisado y aceptas el documento.</p>
              <p v-if="expiresAt" class="text-orange-600 font-medium mt-1">
                ⏰ Tiempo restante: {{ formatTimeRemaining() }}
              </p>
            </div>
            <div class="flex space-x-3">
              <button
                @click="$emit('close')"
                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                @click="signDocument"
                :disabled="signing || !pdfLoaded"
                class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                <svg v-if="signing" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ signing ? 'Firmando...' : 'Firmar Documento' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { queueService } from '@/services/queue.service';

const emit = defineEmits(['close', 'signed', 'error']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

// Estado del modal
const pdfLoaded = ref(false);
const pdfError = ref(false);
const signing = ref(false);
const signatureType = ref('digital');
const signaturePosition = ref('auto');
const comments = ref('');

// Datos extraídos del queue
const documentName = computed(() => props.queue.document?.namePDF || props.queue.nombrePDF);
const emitterName = computed(() => props.queue.emisor?.nombre || 'Usuario');
const currentPosition = computed(() => props.queue.currentPosition);
const totalParticipants = computed(() => props.queue.totalParticipants);
const signedCount = computed(() => props.queue.signedParticipants || 0);
const participants = computed(() => props.queue.participants || []);
const expiresAt = computed(() => props.queue.expiresAt);

// Progreso de firma
const progressPercentage = computed(() => {
  if (!totalParticipants.value) return 0;
  return Math.round((signedCount.value / totalParticipants.value) * 100);
});

// Cargar PDF
const loadPDF = async () => {
  pdfLoaded.value = false;
  pdfError.value = false;

  try {
    // Simular carga del PDF
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Aquí iría la lógica real para cargar el PDF
    // const pdfData = await queueService.downloadDocument(queue.documentId);

    pdfLoaded.value = true;
  } catch (error) {
    console.error('Error loading PDF:', error);
    pdfError.value = true;
  }
};

// Obtener clase de participante
const getParticipantClass = (index) => {
  if (index < currentPosition.value - 1) {
    return 'bg-green-50 border border-green-200';
  }
  if (index === currentPosition.value - 1) {
    return 'bg-red-50 border border-red-200';
  }
  return 'bg-gray-50 border border-gray-200';
};

// Obtener clase de avatar de participante
const getParticipantAvatarClass = (index) => {
  if (index < currentPosition.value - 1) {
    return 'bg-green-500 text-white';
  }
  if (index === currentPosition.value - 1) {
    return 'bg-red-500 text-white';
  }
  return 'bg-gray-300 text-gray-700';
};

// Obtener estado del participante
const getParticipantStatus = (index) => {
  if (index < currentPosition.value - 1) {
    return 'Firmado';
  }
  if (index === currentPosition.value - 1) {
    return 'Firmando ahora';
  }
  return `Pendiente (turno ${index + 1})`;
};

// Obtener iniciales del usuario
const getUserInitial = (user) => {
  if (!user?.name) return '?';
  return user.name.charAt(0).toUpperCase();
};

// Formatear tiempo restante
const formatTimeRemaining = () => {
  if (!expiresAt.value) return 'Sin límite';

  const now = new Date();
  const expires = new Date(expiresAt.value);
  const diff = expires - now;

  if (diff <= 0) return 'Expirado';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} minutos`;
};

// Firmar documento
const signDocument = async () => {
  signing.value = true;

  try {
    // Aquí iría la lógica real de firma
    // const signedPdfData = await signCurrentPDF();

    // Simulación de firma
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Llamar al servicio para firmar
    // await queueService.signCurrentTurn(props.queue.queueId, signedPdfData);

    emit('signed', {
      queueId: props.queue.queueId,
      signatureType: signatureType.value,
      signaturePosition: signaturePosition.value,
      comments: comments.value,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error signing document:', error);
    emit('error', error.message || 'Error al firmar el documento');
  } finally {
    signing.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadPDF();
});
</script>

<style scoped>
/* Scrollbar styling */
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