<template>
  <div class="fixed top-4 right-4 z-[9999] space-y-2 w-[min(92vw,24rem)]">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast-item rounded-lg shadow text-white flex items-start gap-3"
      :class="{
        'bg-green-600': t.type === 'success',
        'bg-red-600': t.type === 'error',
        'bg-slate-800': t.type === 'info',
        'px-4 py-3 text-sm': t.size !== 'lg',
        'px-5 py-4 text-base': t.size === 'lg'
      }"
      role="status" aria-live="polite"
    >
      <span class="mt-0.5">
        {{ t.message }}
      </span>
      <button class="ml-auto opacity-80 hover:opacity-100" @click="remove(t.id)" aria-label="Cerrar">
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { useToasts } from "../../composables/useToasts";
const { toasts, remove } = useToasts();
</script>

<style scoped>
.toast-item {
  animation: toast-in 220ms ease-out;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
