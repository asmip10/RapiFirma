<template>
  <span :class="badgeClasses">
    <span class="flex items-center">
      <span v-if="isUrgent" class="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
      <span v-else-if="isCompleted" class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
      <span v-else-if="isWaiting" class="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
      {{ display || getDefaultDisplay() }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: ''
  },
  display: {
    type: String,
    default: ''
  }
});

const isUrgent = computed(() => props.status === 'Current' || props.status === 'myTurn');
const isCompleted = computed(() => props.status === 'Signed' || props.status === 'completed');
const isWaiting = computed(() => props.status === 'Waiting' || props.status === 'waiting');

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  if (isUrgent.value) {
    return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
  } else if (isCompleted.value) {
    return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
  } else if (isWaiting.value) {
    return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
  } else {
    return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
  }
});

function getDefaultDisplay() {
  switch (props.status) {
    case 'Current':
    case 'myTurn':
      return 'Es tu turno';
    case 'Waiting':
    case 'waiting':
      return 'Esperando';
    case 'Signed':
    case 'completed':
      return 'Completado';
    default:
      return props.status || 'Desconocido';
  }
}
</script>