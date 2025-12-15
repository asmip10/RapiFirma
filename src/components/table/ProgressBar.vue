<template>
  <div class="w-full max-w-xs">
    <div class="flex items-center justify-between mb-1">
      <span class="text-xs text-gray-600 font-medium">{{ signed }}/{{ total }}</span>
      <span :class="percentageClasses">{{ percentage }}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        :class="progressBarClasses"
        :style="{ width: percentage + '%' }"
        class="h-2 rounded-full transition-all duration-500 ease-out relative"
      >
        <!-- Animación de pulso para en progreso -->
        <div v-if="!isComplete" class="absolute inset-0 bg-white opacity-25 animate-pulse"></div>
      </div>
    </div>
    <div class="flex justify-between text-xs text-gray-500 mt-1">
      <span>{{ signedText }}</span>
      <span>{{ remainingText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  signed: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  }
});

const isComplete = computed(() => props.signed >= props.total && props.total > 0);

const percentageClasses = computed(() => {
  const baseClasses = 'text-xs font-medium';
  if (isComplete.value) {
    return `${baseClasses} text-green-600`;
  } else if (props.percentage >= 50) {
    return `${baseClasses} text-blue-600`;
  } else {
    return `${baseClasses} text-gray-600`;
  }
});

const progressBarClasses = computed(() => {
  if (isComplete.value) {
    return 'bg-green-500';
  } else if (props.percentage >= 75) {
    return 'bg-blue-500';
  } else if (props.percentage >= 50) {
    return 'bg-indigo-500';
  } else if (props.percentage >= 25) {
    return 'bg-yellow-500';
  } else {
    return 'bg-orange-500';
  }
});

const signedText = computed(() => {
  if (props.signed === 0) return 'Sin firmas';
  if (props.signed === 1) return '1 firmado';
  return `${props.signed} firmados`;
});

const remainingText = computed(() => {
  const remaining = props.total - props.signed;
  if (remaining === 0) return 'Completado';
  if (remaining === 1) return '1 pendiente';
  return `${remaining} pendientes`;
});
</script>