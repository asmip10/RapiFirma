<template>
  <section class="bg-white p-6 rounded-lg shadow">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-2xl font-bold text-indigo-800">Dashboard Admin</h2>
        <p class="text-gray-600">Métricas en vivo del sistema.</p>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          :to="{ name:'admin.docs' }"
          class="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
        >
          Ver documentos
        </router-link>
        <router-link
          :to="{ name:'admin.users' }"
          class="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
        >
          Ver usuarios
        </router-link>
        <button
          @click="refresh"
          :disabled="loading"
          class="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {{ loading ? "Actualizando..." : "Actualizar" }}
        </button>
      </div>
    </div>

    <!-- Notas: sin filtro de fechas por ahora (pedido), el store igual soporta rango futuro -->

    <!-- Tarjetas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <CardStat title="Total documentos" :value="s.totalDocs" />
      <CardStat title="Pendientes" :value="s.pendientes" />
      <CardStat title="Firmados" :value="s.firmados" />

      <CardStat title="Enviados hoy" :value="s.enviadosHoy" />
      <CardStat title="Usuarios activos" :value="s.usuariosActivos" />
      <CardStat title="Usuarios eliminados" :value="s.usuariosEliminados" />
    </div>

    <div class="mt-4 text-xs text-slate-500">
      <span v-if="s.ultAct">Última actualización: {{ prettyTime(s.ultAct) }}</span>
      <span v-else>Sin datos aún.</span>
    </div>

    <!-- Overlay de carga -->
    <div
      v-if="loading"
      class="mt-6 grid place-items-center text-slate-500 text-sm"
      aria-label="Cargando métricas"
    >
      Cargando métricas…
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useDocumentsStore } from "../../stores/document";

const docs = useDocumentsStore();

const loading = computed(() => docs.adminSummaryLoading);
const s = computed(() => docs.adminSummary);

function prettyTime(ts) {
  try {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch { return ""; }
}

async function refresh() {
  await docs.fetchAdminSummary(); // sin rango, como pediste
}

onMounted(refresh);
</script>

<!-- Componente de tarjeta simple -->
<script>
export default {
  components: {
    CardStat: {
      props: { title: String, value: { type: [Number, String], default: 0 } },
      template: `
        <div class="rounded-lg border bg-white p-4">
          <div class="text-sm text-slate-500 mb-1">{{ title }}</div>
          <div class="text-2xl font-semibold text-slate-900">{{ value }}</div>
        </div>
      `
    }
  }
}
</script>
