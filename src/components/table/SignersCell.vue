<template>
  <div class="flex items-center space-x-3">
    <!-- Stack de avatares -->
    <div class="flex -space-x-3">
      <!-- Avatar para cada firmante visible -->
      <div v-for="(signer, index) in visibleSigners" :key="signer.userId" class="relative group">
        <!-- Avatar principal -->
        <div
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm border-2 border-white shadow-sm transition-all duration-200 group-hover:scale-105',
            getAvatarClasses(signer.status)
          ]"
        >
          {{ getInitials(signer.userName) }}
        </div>

        <!-- Indicador de estado -->
        <div
          :class="[
            'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white',
            getStatusIndicatorClasses(signer.status)
          ]"
        ></div>

        <!-- Tooltip al hover -->
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div class="font-medium">{{ signer.userName }}</div>
          <div class="text-gray-300">{{ getStatusText(signer.status) }}</div>
          <div v-if="signer.signedAt" class="text-gray-400 text-xs">{{ formatDate(signer.signedAt) }}</div>
          <!-- Flecha del tooltip -->
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      <!-- Indicador de más firmantes -->
      <div
        v-if="moreSigners > 0"
        class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-sm flex items-center justify-center font-medium border-2 border-white shadow-sm cursor-pointer hover:bg-gray-200 transition-colors"
        @click="showAllSigners = !showAllSigners"
        :title="`+${moreSigners} firmantes más`"
      >
        +{{ moreSigners }}
      </div>
    </div>

    <!-- Información de progreso -->
    <div class="flex-1 min-w-0">
      <div class="text-sm text-gray-900 font-medium">
        {{ signedCount }} de {{ total }} firmados
      </div>
      <div class="text-xs text-gray-500">
        {{ getProgressText() }}
      </div>
    </div>

    <!-- Detalles expandidos (opcional) -->
    <div v-if="showAllSigners && moreSigners > 0" class="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
      <h4 class="text-sm font-medium text-gray-900 mb-2">Todos los firmantes ({{ total }})</h4>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div v-for="signer in allSigners" :key="signer.userId" class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div :class="[
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
              getAvatarClasses(signer.status)
            ]">
              {{ getInitials(signer.userName) }}
            </div>
            <span class="text-sm text-gray-700">{{ signer.userName }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="[
              'text-xs px-2 py-1 rounded-full',
              getStatusBadgeClasses(signer.status)
            ]">
              {{ getStatusText(signer.status) }}
            </span>
            <span v-if="signer.position" class="text-xs text-gray-500">
              #{{ signer.position }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  signers: {
    type: Array,
    default: () => []
  },
  total: {
    type: Number,
    default: 0
  }
});

const showAllSigners = ref(false);

const visibleSigners = computed(() => props.signers.slice(0, 4));
const moreSigners = computed(() => Math.max(0, props.total - 4));
const allSigners = computed(() => props.signers);
const signedCount = computed(() => props.signers.filter(s => s.status === 'Signed').length);

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
}

function getAvatarClasses(status) {
  switch (status) {
    case 'Signed':
      return 'bg-green-500 text-white';
    case 'Current':
      return 'bg-yellow-500 text-white animate-pulse';
    case 'Waiting':
      return 'bg-gray-300 text-gray-600';
    default:
      return 'bg-gray-200 text-gray-500';
  }
}

function getStatusIndicatorClasses(status) {
  switch (status) {
    case 'Signed':
      return 'bg-green-500';
    case 'Current':
      return 'bg-yellow-500 animate-pulse';
    case 'Waiting':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

function getStatusBadgeClasses(status) {
  switch (status) {
    case 'Signed':
      return 'bg-green-100 text-green-800';
    case 'Current':
      return 'bg-yellow-100 text-yellow-800';
    case 'Waiting':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'Signed':
      return 'Firmado';
    case 'Current':
      return 'Firmando';
    case 'Waiting':
      return 'Pendiente';
    default:
      return status || 'Desconocido';
  }
}

function getProgressText() {
  const percentage = props.total > 0 ? Math.round((signedCount.value / props.total) * 100) : 0;
  if (percentage === 100) return 'Completado';
  if (percentage >= 75) return 'Casi terminado';
  if (percentage >= 50) return 'En progreso';
  if (percentage > 0) return 'Iniciado';
  return 'Sin firmas';
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit'
  });
}
</script>