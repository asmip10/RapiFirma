<template>
  <div class="flex items-center gap-2">
    <!-- Botón Agregar participantes -->
    <button
      v-if="canAddUsers"
      @click="$emit('add-users', props.document)"
      class="relative group p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      title="Agregar más participantes"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
      <span class="sr-only">Agregar</span>
      <div class="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div class="rounded-md bg-gray-900 text-white text-[11px] font-medium px-2 py-1 whitespace-nowrap shadow">
          Anadir usuarios
        </div>
      </div>
    </button>

    <!-- Botón Descargar -->
    <button
      @click="$emit('download', props.document)"
      class="relative group p-1.5 text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
      <div class="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div class="rounded-md bg-gray-900 text-white text-[11px] font-medium px-2 py-1 whitespace-nowrap shadow">
          Descargar
        </div>
      </div>
    </button>

    <!-- Botón Ver detalles -->


    <!-- Botón Cancelar (solo si no está completado) -->
    <button
      v-if="canDelete"
      @click="handleDelete"
      class="relative group p-1.5 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <div class="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div class="rounded-md bg-gray-900 text-white text-[11px] font-medium px-2 py-1 whitespace-nowrap shadow">
          Eliminar documento
        </div>
      </div>
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
          <!-- Copiar enlace -->
          <button
            @click="handleCopyLink"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar enlace
          </button>

          <!-- Renombrar -->
          <button
            v-if="canRename"
            @click="handleRename"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Renombrar
          </button>

          <!-- Duplicar -->
          <button
            v-if="canDuplicate"
            @click="handleDuplicate"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Duplicar
          </button>

          <!-- Ver historial -->
          <button
            @click="handleHistory"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ver historial
          </button>

          <!-- Exportar -->
          <button
            @click="handleExport"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>

          <div class="border-t border-gray-100 my-1"></div>

          <!-- Cancelar (en menú también) -->
          <button
            v-if="canCancel"
            @click="handleCancel"
            class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <svg class="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Cancelar documento
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  document: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['add-users', 'download', 'delete', 'view-details', 'cancel', 'copy-link', 'rename', 'duplicate', 'history', 'export']);

const showMoreMenu = ref(false);

const canAddUsers = computed(() => {
  const actions = props.document.actions || [];
  const canAddByActions =
    actions.includes('addUsers') ||
    actions.includes('add-users') ||
    actions.includes('add_users');

  const canAddByFlag = props.document.allowDynamicAddition === true;

  return (canAddByActions || canAddByFlag) && props.document.status === 'InProgress';
});

const canCancel = computed(() => {
  return props.document.actions?.includes('cancel') &&
         props.document.status !== 'Completed' &&
         props.document.status !== 'Cancelled';
});

const canDelete = computed(() => canCancel.value);

function handleDelete() {
  emit('delete', props.document);
}

const canRename = computed(() => {
  return props.document.status === 'InProgress';
});

const canDuplicate = computed(() => {
  return props.document.status !== 'Expired' && props.document.status !== 'Cancelled';
});

function handleCancel() {
  showMoreMenu.value = false;
  emit('cancel');
}

function handleCopyLink() {
  showMoreMenu.value = false;
  emit('copy-link');
}

function handleRename() {
  showMoreMenu.value = false;
  emit('rename');
}

function handleDuplicate() {
  showMoreMenu.value = false;
  emit('duplicate');
}

function handleHistory() {
  showMoreMenu.value = false;
  emit('history');
}

function handleExport() {
  showMoreMenu.value = false;
  emit('export');
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
