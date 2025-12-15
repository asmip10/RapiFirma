<template>
  <div class="flex items-center justify-between">
    <!-- Información de resultados -->
    <div class="flex-1 flex justify-between sm:hidden">
      <button
        @click="$emit('previous-page')"
        :disabled="currentPage === 1"
        class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <button
        @click="$emit('next-page')"
        :disabled="!hasNextPage"
        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>

    <!-- Paginación desktop -->
    <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <div>
        <p class="text-sm text-gray-700">
          Mostrando
          <span class="font-medium">{{ startItem }}</span>
          a
          <span class="font-medium">{{ endItem }}</span>
          de
          <span class="font-medium">{{ totalItems }}</span>
          resultados
        </p>
      </div>
      <div>
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <!-- Botón anterior -->
          <button
            @click="$emit('previous-page')"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">Anterior</span>
            <!-- Heroicon name: chevron-left -->
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Números de página -->
          <template v-for="page in visiblePages" :key="page">
            <!-- Elipsis -->
            <span
              v-if="page === '...'"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
            >
              ...
            </span>

            <!-- Página actual -->
            <button
              v-else-if="page === currentPage"
              aria-current="page"
              class="relative inline-flex items-center px-4 py-2 border border-indigo-500 bg-indigo-50 text-sm font-medium text-indigo-600"
            >
              {{ page }}
            </button>

            <!-- Otras páginas -->
            <button
              v-else
              @click="$emit('page-change', page)"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {{ page }}
            </button>
          </template>

          <!-- Botón siguiente -->
          <button
            @click="$emit('next-page')"
            :disabled="!hasNextPage"
            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">Siguiente</span>
            <!-- Heroicon name: chevron-right -->
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    </div>

    <!-- Selector de items por página (opcional) -->
    <div v-if="showPerPageSelector" class="ml-4">
      <select
        :value="perPage"
        @change="$emit('per-page-change', parseInt($event.target.value))"
        class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        <option :value="10">10 por página</option>
        <option :value="25">25 por página</option>
        <option :value="50">50 por página</option>
        <option :value="100">100 por página</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: {
    type: Number,
    default: 1
  },
  totalItems: {
    type: Number,
    default: 0
  },
  perPage: {
    type: Number,
    default: 10
  },
  showPerPageSelector: {
    type: Boolean,
    default: true
  },
  maxVisiblePages: {
    type: Number,
    default: 5
  }
});

const emit = defineEmits(['page-change', 'previous-page', 'next-page', 'per-page-change']);

const totalPages = computed(() => Math.ceil(props.totalItems / props.perPage));
const hasNextPage = computed(() => props.currentPage < totalPages.value);
const startItem = computed(() => {
  if (props.totalItems === 0) return 0;
  return (props.currentPage - 1) * props.perPage + 1;
});
const endItem = computed(() => {
  const end = props.currentPage * props.perPage;
  return Math.min(end, props.totalItems);
});

// Calcular páginas visibles con elipsis
const visiblePages = computed(() => {
  const pages = [];
  const { currentPage, maxVisiblePages } = props;
  const total = totalPages.value;

  if (total <= maxVisiblePages) {
    // Mostrar todas las páginas si no hay muchas
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // Mostrar páginas con elipsis
    const halfVisible = Math.floor(maxVisiblePages / 2);

    // Siempre mostrar la primera página
    pages.push(1);

    // Calcular rango medio
    let startPage = Math.max(2, currentPage - halfVisible);
    let endPage = Math.min(total - 1, currentPage + halfVisible);

    // Ajustar si estamos cerca del inicio
    if (currentPage <= halfVisible + 1) {
      endPage = maxVisiblePages - 1;
    }

    // Ajustar si estamos cerca del final
    if (currentPage >= total - halfVisible) {
      startPage = total - maxVisiblePages + 2;
    }

    // Agregar elipsis inicial si es necesario
    if (startPage > 2) {
      pages.push('...');
    }

    // Agregar páginas del rango medio
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < total) {
        pages.push(i);
      }
    }

    // Agregar elipsis final si es necesario
    if (endPage < total - 1) {
      pages.push('...');
    }

    // Siempre mostrar la última página
    if (total > 1) {
      pages.push(total);
    }
  }

  return pages;
});
</script>