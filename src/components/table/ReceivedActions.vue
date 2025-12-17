<template>
  <div v-if="!isWaiting" class="flex items-center gap-2">
    <!-- Botón principal de firma (si es su turno) -->
    <button
      v-if="canSign"
      @click="$emit('sign', props.document)"
      :class="[
        'p-2 rounded-lg transition-all duration-200',
        'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        'shadow-sm hover:shadow-md'
      ]"
      title="Firmar"
    >
      <PencilSquareIcon class="w-4 h-4" />
    </button>

    <!-- BotІn Ver documento (si es su turno) -->
    <button
      v-if="canSign"
      @click="$emit('preview', props.document)"
      class="p-1.5 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      title="Ver documento"
    >
      <EyeIcon class="w-4 h-4" />
    </button>

    <!-- Botón Descargar (siempre disponible) -->
    <button
      @click="$emit('download', props.document)"
      :class="[
        'p-1.5 rounded-lg transition-all duration-200',
        canSign ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100',
        'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
      ]"
      title="Descargar"
    >
      <ArrowDownTrayIcon class="w-4 h-4" />
    </button>

    <!-- Botón Ver detalles -->
    <!-- Botón Ocultar -->
    <button
      v-if="canRemoveFromView"
      @click="$emit('remove-from-view', props.document)"
      class="p-1.5 text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      title="Eliminar de mi vista"
    >
      <TrashIcon class="w-4 h-4" />
    </button>

    <!-- Menú de más acciones -->
    <div v-if="false" class="relative">
      <button
        @click="showMoreMenu = !showMoreMenu"
        class="p-1.5 text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200"
        title="Más acciones"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      <!-- Dropdown del menú -->
      <div
        v-if="showMoreMenu"
        v-click-outside="() => showMoreMenu = false"
        class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      >
        <div class="py-1">
          <!-- Ver detalles -->
          <!-- Compartir enlace -->
          <button
            v-if="canShare"
            @click="handleShare"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Compartir enlace
          </button>

          <!-- Imprimir -->
          <button
            @click="handlePrint"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>

          <div class="border-t border-gray-100 my-1"></div>

          <!-- Reportar problema -->
          <button
            @click="handleReport"
            class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <svg class="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Reportar problema
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ArrowDownTrayIcon, EyeIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  document: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['sign', 'preview', 'download', 'remove-from-view', 'view-details', 'share', 'print', 'report']);

const showMoreMenu = ref(false);

const isWaiting = computed(() => {
  return props.document.userStatus?.status === 'Waiting' ||
    props.document.userStatus?.status === 'waiting';
});

const canSign = computed(() => {
  return props.document.userStatus?.status === 'Current' || props.document.userStatus?.status === 'myTurn';
});

const canRemoveFromView = computed(() => {
  const actions = props.document.actions || [];
  return (
    !!props.document.queueId ||
    actions.includes('hide') ||
    actions.includes('hideFromView') ||
    actions.includes('hide-from-view') ||
    actions.includes('hide_from_view')
  );
});

const canShare = computed(() => {
  return props.document.actions?.includes('share');
});

function handleViewDetails() {
  showMoreMenu.value = false;
  emit('view-details', props.document);
}

function handleShare() {
  showMoreMenu.value = false;
  emit('share', props.document);
}

function handlePrint() {
  showMoreMenu.value = false;
  emit('print', props.document);
}

function handleReport() {
  showMoreMenu.value = false;
  emit('report', props.document);
}

// Directiva para cerrar menú al hacer clic fuera
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside);
  }
};
</script>
