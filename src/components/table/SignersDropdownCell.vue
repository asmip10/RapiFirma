<template>
  <div class="inline-block">
    <button
      type="button"
      @click.stop="toggle"
      class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      :title="summaryTitle"
    >
      <UserGroupIcon class="w-4 h-4 text-gray-500" />
      <span class="font-medium">{{ signedCount }}/{{ totalCount }}</span>
      <span class="text-gray-500">firmados</span>
      <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', open ? 'rotate-180' : '']" />
    </button>

    <teleport to="body">
      <div v-if="open" class="fixed inset-0 z-50">
        <button
          class="absolute inset-0 bg-black/40"
          type="button"
          @click="close"
          aria-label="Cerrar"
        ></button>

        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <div class="text-base font-semibold text-gray-900">Firmantes</div>
                <div class="text-sm text-gray-500">{{ signedCount }} firmados · {{ pendingCount }} pendientes</div>
              </div>
              <button
                type="button"
                @click="close"
                class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                  <CheckCircleIcon class="w-4 h-4 text-green-600" />
                  <span>Firmados</span>
                </div>
                <div class="max-h-80 overflow-y-auto pr-1 space-y-1">
                  <div
                    v-for="s in signedSigners"
                    :key="s.userId || s.email || s.userName"
                    class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <div class="min-w-0">
                      <div class="text-sm text-gray-800 truncate">{{ s.userName || 'Usuario' }}</div>
                    </div>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">OK</span>
                  </div>
                  <div v-if="signedSigners.length === 0" class="text-sm text-gray-500 px-3 py-2">Sin firmados</div>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                  <ClockIcon class="w-4 h-4 text-gray-500" />
                  <span>Pendientes</span>
                </div>
                <div class="max-h-80 overflow-y-auto pr-1 space-y-1">
                  <div
                    v-for="s in pendingSigners"
                    :key="s.userId || s.email || s.userName"
                    class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <div class="min-w-0">
                      <div class="text-sm text-gray-800 truncate">{{ s.userName || 'Usuario' }}</div>
                      <div class="text-xs text-gray-500">{{ statusLabel(s.status) }}</div>
                    </div>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">...</span>
                  </div>
                  <div v-if="pendingSigners.length === 0" class="text-sm text-gray-500 px-3 py-2">Sin pendientes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { CheckCircleIcon, ChevronDownIcon, ClockIcon, UserGroupIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  signers: {
    type: Array,
    default: () => []
  },
  total: {
    type: Number,
    default: 0
  }
});

const open = ref(false);

const totalCount = computed(() => {
  const totalFromProps = Number.isFinite(props.total) ? props.total : 0;
  const signersLen = Array.isArray(props.signers) ? props.signers.length : 0;
  return Math.max(totalFromProps, signersLen);
});
const signedSigners = computed(() => props.signers.filter(s => s?.status === 'Signed'));
const pendingSigners = computed(() => props.signers.filter(s => s?.status !== 'Signed'));
const signedCount = computed(() => signedSigners.value.length);
const pendingCount = computed(() => Math.max(0, totalCount.value - signedCount.value));

const summaryTitle = computed(() => `Firmantes: ${signedCount.value} firmados, ${pendingCount.value} pendientes`);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function statusLabel(status) {
  if (status === 'Current') return 'Firmando';
  if (status === 'Waiting') return 'Pendiente';
  return status || 'Pendiente';
}

function formatShortDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function onKeydown(event) {
  if (event.key === 'Escape') close();
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>
