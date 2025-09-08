<template>
  <div class="fixed top-4 right-4 z-[9999] space-y-2 w-[min(92vw,24rem)]">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="rounded-lg shadow px-4 py-3 text-sm text-white flex items-start gap-3"
      :class="{
        'bg-green-600': t.type === 'success',
        'bg-red-600': t.type === 'error',
        'bg-slate-800': t.type === 'info'
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
