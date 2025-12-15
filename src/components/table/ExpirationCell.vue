<template>
  <div class="w-full flex flex-col items-center text-center min-w-0">
    <!-- Icono de reloj con animación -->
    <!-- Texto de expiración -->
    <div
      :class="[
        'text-sm font-medium truncate leading-none',
        isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-600'
      ]"
    >
      {{ remainingTextDisplay }}
    </div>

    <div v-if="showBadge && badgeText" class="mt-2">
      <span :class="badgeClasses">{{ badgeText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  expiresAt: {
    type: String,
    default: null
  },
  showBadge: {
    type: Boolean,
    default: true
  }
});

const now = computed(() => new Date());
const expirationDate = computed(() => props.expiresAt ? new Date(props.expiresAt) : null);
const hoursUntil = computed(() => {
  if (!expirationDate.value) return null;
  return (expirationDate.value - now.value) / (1000 * 60 * 60);
});

const isExpired = computed(() => hoursUntil.value !== null && hoursUntil.value <= 0);
const isUrgent = computed(() => hoursUntil.value !== null && hoursUntil.value > 0 && hoursUntil.value <= 24);
const isSoon = computed(() => hoursUntil.value !== null && hoursUntil.value > 24 && hoursUntil.value <= 72);

const remainingTextDisplay = computed(() => {
  if (isExpired.value) return 'Expirado';
  if (hoursUntil.value === null) return 'Sin expiracion';

  const totalHours = Math.max(0, Math.floor(hoursUntil.value));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
});

const remainingText = computed(() => {
  if (isExpired.value) return 'Expirado';
  if (isUrgent.value) return `${Math.floor(hoursUntil.value)}h`;
  if (isSoon.value) return `${Math.floor(hoursUntil.value / 24)}d`;
  if (hoursUntil.value !== null) return `${Math.floor(hoursUntil.value / 24)}d`;
  return 'Sin expiración';
});

const badgeText = computed(() => {
  if (isExpired.value) return 'EXPIRADO';
  if (isUrgent.value) return 'URGENTE';
  if (isSoon.value) return 'PRONTO';
  return '';
});

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full';
  if (isExpired.value) return `${baseClasses} bg-red-100 text-red-800`;
  if (isUrgent.value) return `${baseClasses} bg-yellow-100 text-yellow-800 animate-pulse`;
  if (isSoon.value) return `${baseClasses} bg-orange-100 text-orange-800`;
  return '';
});
</script>
