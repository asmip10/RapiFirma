<template>
  <div class="virtual-queue-list">
    <!-- Contenedor virtualizado -->
    <div
      ref="containerRef"
      class="virtual-container"
      :style="{ height: containerHeight + 'px', overflowY: 'auto' }"
      @scroll="handleScroll"
    >
      <!-- Espaciador superior -->
      <div :style="{ height: scrollTop + 'px' }"></div>

      <!-- Items visibles -->
      <div
        v-for="item in visibleItems"
        :key="item.id || item.queueId"
        :style="{
          position: 'absolute',
          top: item.top + 'px',
          left: '0',
          right: '0',
          height: itemHeight + 'px'
        }"
        class="virtual-item"
      >
        <!-- Renderizado condicional basado en el tipo de item -->
        <component
          :is="getComponentType(item)"
          :queue="item"
          :priority="item.priority"
          @sign="$emit('sign', item)"
          @download="$emit('download', item)"
          @hide="$emit('hide', item)"
          @view-details="$emit('view-details', item)"
          @add-users="$emit('add-users', item)"
          @cancel="$emit('cancel', item)"
        />
      </div>

      <!-- Espaciador inferior -->
      <div :style="{ height: (totalHeight - scrollTop - containerHeight) + 'px' }"></div>
    </div>

    <!-- Indicadores de carga -->
    <div v-if="loading" class="loading-indicator">
      <div class="flex items-center justify-center py-4">
        <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm text-gray-600">Cargando...</span>
      </div>
    </div>

    <!-- Mensaje de estado vacío -->
    <div v-if="!loading && items.length === 0" class="empty-state">
      <div class="text-center py-8">
        <component :is="emptyIcon" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">{{ emptyMessage }}</p>
      </div>
    </div>

    <!-- Controles de scroll -->
    <div class="scroll-controls">
      <div class="text-sm text-gray-600 mb-2">
        Mostrando {{ visibleStartIndex + 1 }}-{{ visibleEndIndex }} de {{ items.length }}
      </div>
      <input
        v-if="enableJumpTo"
        type="number"
        :min="1"
        :max="items.length"
        v-model.number="jumpToIndex"
        @change="handleJumpTo"
        class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
        placeholder="Ir a..."
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useVirtualization } from '../composables/usePerformance';

const emit = defineEmits([
  'sign', 'download', 'hide', 'view-details', 'add-users', 'cancel'
]);

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  itemHeight: {
    type: Number,
    default: 120 // Altura estimada de cada item
  },
  containerHeight: {
    type: Number,
    default: 400
  },
  loading: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: 'No hay elementos para mostrar'
  },
  emptyIcon: {
    type: [String, Object],
    default: 'DocumentIcon'
  },
  enableJumpTo: {
    type: Boolean,
    default: false
  }
});

// Usar hook de virtualización
const {
  containerRef,
  visibleItems,
  totalHeight,
  handleScroll,
  scrollToItem,
  scrollTop
} = useVirtualization(props.items, props.itemHeight, props.containerHeight);

// Estado local para navegación
const jumpToIndex = ref(null);

// Índices visibles
const visibleStartIndex = computed(() => {
  return visibleItems.value.length > 0 ? visibleItems.value[0].index : 0;
});

const visibleEndIndex = computed(() => {
  return visibleItems.value.length > 0
    ? visibleItems.value[visibleItems.value.length - 1].index
    : 0;
});

/**
 * Determinar qué componente renderizar basado en el tipo de item
 */
function getComponentType(item) {
  // Lazy loading de componentes según el tipo
  const componentMap = {
    'urgent': () => import('./QueueCard.vue'),
    'created': () => import('./CreatedQueueCard.vue'),
    'waiting': () => import('./WaitingQueueCard.vue'),
    'completed': () => import('./CompletedQueueCard.vue')
  };

  const componentType = item.type || item.status?.toLowerCase() || 'default';
  const loader = componentMap[componentType] || componentMap['urgent'];

  // Retornar el componente cargado dinámicamente
  return loader;
}

/**
 * Manejar navegación a índice específico
 */
function handleJumpTo() {
  if (jumpToIndex.value >= 1 && jumpToIndex.value <= props.items.length) {
    scrollToItem(jumpToIndex.value - 1);
  }
  jumpToIndex.value = null;
}

/**
 * Manejar scroll con el mouse
 */
function handleMouseWheel(event) {
  // Prevenir scroll horizontal en contenedor virtualizado
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
    event.preventDefault();
  }
}

/**
 * Atajos de teclado para navegación
 */
function handleKeydown(event) {
  switch (event.key) {
    case 'Home':
      event.preventDefault();
      scrollToItem(0);
      break;
    case 'End':
      event.preventDefault();
      scrollToItem(props.items.length - 1);
      break;
    case 'PageUp':
      event.preventDefault();
      const currentIndex = Math.floor(scrollTop.value / props.itemHeight);
      scrollToItem(Math.max(0, currentIndex - 5));
      break;
    case 'PageDown':
      event.preventDefault();
      const nextIndex = Math.floor(scrollTop.value / props.itemHeight);
      scrollToItem(Math.min(props.items.length - 1, nextIndex + 5));
      break;
    case 'ArrowUp':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        scrollToItem(Math.max(0, visibleStartIndex.value - 1));
      }
      break;
    case 'ArrowDown':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        scrollToItem(Math.min(props.items.length - 1, visibleEndIndex.value + 1));
      }
      break;
  }
}

// Lifecycle
onMounted(() => {
  // Agregar event listeners para navegación
  containerRef.value?.addEventListener('mousewheel', handleMouseWheel, { passive: false });
  document.addEventListener('keydown', handleKeydown);

  // Precargar primeros componentes si es necesario
  if (props.items.length > 0 && props.items.length < 50) {
    // Para listas pequeñas, precargar todo
    props.items.forEach(item => {
      getComponentType(item);
    });
  }
});

onUnmounted(() => {
  // Limpiar event listeners
  containerRef.value?.removeEventListener('mousewheel', handleMouseWheel);
  document.removeEventListener('keydown', handleKeydown);
});

// Watch para cambios en los items
watch(() => props.items, (newItems, oldItems) => {
  // Resetear scroll si los items cambian completamente
  if (newItems.length !== oldItems?.length) {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0;
    }
  }
}, { deep: true });
</script>

<style scoped>
.virtual-queue-list {
  position: relative;
}

.virtual-container {
  position: relative;
  scroll-behavior: smooth;
}

.virtual-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.virtual-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.virtual-item {
  will-change: transform; /* Optimización para scroll */
}

.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.scroll-controls {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Optimizaciones para performance */
.virtual-item {
  contain: layout style paint;
}

.virtual-container {
  contain: layout;
}
</style>