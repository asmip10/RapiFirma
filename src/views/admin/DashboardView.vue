<!-- src/views/admin/DashboardView.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDocumentsStore } from '../../stores/document';

// Store
const docs = useDocumentsStore();

// Presets de rango (simple: 7d / 30d)
const range = ref('7d'); // '7d' | '30d'

// Helpers para fechas (YYYY-MM-DD)
function toYMD(d) { return new Date(d).toISOString().slice(0, 10); }
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function calcRange(r = '7d') {
  const days = r === '30d' ? 30 : 7;
  const today = new Date();
  const from = startOfDay(new Date(today.getTime() - (days - 1) * 86400000));
  const to = endOfDay(today);
  return { fechaInicio: toYMD(from), fechaFin: toYMD(to) };
}

const loading = computed(() => docs.adminSummaryLoading);
const s = computed(() => docs.adminSummary);

async function reload() {
  const { fechaInicio, fechaFin } = calcRange(range.value);
  await docs.fetchAdminSummary({ fechaInicio, fechaFin });
}

onMounted(() => { reload(); });
</script>

<template>
  <div class="p-4 md:p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-semibold">Panel de Administración — Resumen</h1>

      <div class="flex items-center gap-2 text-sm">
        <label class="text-gray-600">Rango</label>
        <select
          v-model="range"
          class="border rounded-lg px-3 py-2"
          :disabled="loading"
          @change="reload"
        >
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
        <button
          class="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-60"
          :disabled="loading"
          @click="reload"
        >
          {{ loading ? 'Cargando…' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <!-- Tarjetas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Pendientes -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="text-sm text-gray-500">Pendientes ({{ range }})</div>
        <div class="text-3xl font-bold text-yellow-700">
          <span v-if="!loading">{{ s.pendientes }}</span>
          <span v-else>—</span>
        </div>
      </div>

      <!-- Firmados -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="text-sm text-gray-500">Firmados ({{ range }})</div>
        <div class="text-3xl font-bold text-green-700">
          <span v-if="!loading">{{ s.firmados }}</span>
          <span v-else>—</span>
        </div>
      </div>

      <!-- Total documentos -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="text-sm text-gray-500">Documentos totales ({{ range }})</div>
        <div class="text-3xl font-bold">
          <span v-if="!loading">{{ s.totalDocs }}</span>
          <span v-else>—</span>
        </div>
      </div>

      <!-- Usuarios activos -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="text-sm text-gray-500">Usuarios activos</div>
        <div class="text-3xl font-bold">
          <span v-if="!loading">{{ s.usuariosActivos }}</span>
          <span v-else>—</span>
        </div>
      </div>

      <!-- Usuarios eliminados -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="text-sm text-gray-500">Usuarios eliminados</div>
        <div class="text-3xl font-bold">
          <span v-if="!loading">{{ s.usuariosEliminados }}</span>
          <span v-else>—</span>
        </div>
      </div>

      <!-- Última actualización -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="text-sm text-gray-500">Última actualización</div>
        <div class="text-lg font-medium">
          <template v-if="!loading && s.ultAct">
            {{ new Date(s.ultAct).toLocaleString() }}
          </template>
          <span v-else>—</span>
        </div>
      </div>
    </div>
  </div>
</template>
