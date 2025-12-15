<template>
  <span :class="badgeClasses">
    <span class="flex items-center">
      <span v-if="isInProgress" class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
      <span v-else-if="isCompleted" class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
      <span v-else-if="isExpired" class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
      <span v-else-if="isCancelled" class="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
      {{ display || status }}
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

const isInProgress = computed(() => props.status === 'InProgress');
const isCompleted = computed(() => props.status === 'Completed');
const isExpired = computed(() => props.status === 'Expired');
const isCancelled = computed(() => props.status === 'Cancelled');

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  if (isInProgress.value) {
    return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
  } else if (isCompleted.value) {
    return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
  } else if (isExpired.value) {
    return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
  } else if (isCancelled.value) {
    return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
  } else {
    return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
  }
});
</script>