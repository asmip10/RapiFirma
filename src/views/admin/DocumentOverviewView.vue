<!-- src/views/admin/DocumentOverviewView.vue -->
<template>
  <section class="bg-white p-6 rounded-lg shadow">
    <h2 class="text-xl font-semibold text-indigo-800 mb-4">Todos los documentos</h2>

    <!-- Filtros -->
    <div class="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
      <input
        v-model="filters.nombrePdf"
        @input="onDebouncedFetch"
        class="border rounded-lg px-3 py-2"
        placeholder="Nombre PDF"
      />

      <select v-model="filters.estado" @change="fetch()"
        class="border rounded-lg px-3 py-2">
        <option value="">Estado (todos)</option>
        <option value="pendiente">Pendiente</option>
        <option value="firmado">Firmado</option>
      </select>

      <!-- Remitente / Destinatario (client-side filter) -->
      <UserSearchAutocomplete
        :placeholder="'Remitente'"
        :min-chars="2"
        @select="v => { selectedRemitente = v; applyClientFilter(); }"
      />
      <UserSearchAutocomplete
        :placeholder="'Destinatario'"
        :min-chars="2"
        @select="v => { selectedDestinatario = v; applyClientFilter(); }"
      />
    </div>

    <div class="flex items-center gap-2 mb-4">
      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="filters.includeDeleted" @change="fetch()" />
        Incluir eliminados
      </label>
      <button type="button" @click="resetFilters" class="px-3 py-2 bg-gray-100 rounded-lg">
        Limpiar
      </button>
    </div>

    <!-- Tabla (contenedor relativo para overlay) -->
    <div class="relative overflow-x-auto border rounded-lg min-h-[22rem]">
        <table class="w-full text-sm text-left table-fixed">
          <colgroup>
            <col />            <!-- Nombre -->
            <col />            <!-- Remitente -->
            <col />            <!-- Destinatario -->
            <col style="width:8rem" />   <!-- Estado -->
            <col />            <!-- Fecha -->
            <col style="width:7.5rem" /> <!-- Acciones -->
          </colgroup>
        <thead class="bg-indigo-50 text-indigo-800">
          <tr>
            <th class="px-4 py-2">Nombre PDF</th>
            <th class="px-4 py-2">Remitente</th>
            <th class="px-4 py-2">Destinatario</th>
            <th class="px-4 py-2 whitespace-nowrap">Estado</th>
            <th class="px-4 py-2 whitespace-nowrap">Fecha</th>
            <th class="px-4 py-2 whitespace-nowrap">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in pageItems" :key="d.id" class="border-t">
            <td class="px-4 py-2 truncate">{{ d.nombrePDF }}</td>
            <td class="px-4 py-2">{{ d.remitenteNombre }}</td>
            <td class="px-4 py-2">{{ d.destinatarioNombre }}</td>
            <td class="px-4 py-2 whitespace-nowrap">
              <span :class="badgeClass(d.estado)"
                    class="px-2 py-1 rounded text-xs">
                {{ d.estado }}
              </span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap">
              {{ formatFecha(d) }}
            </td>
            <td class="px-4 py-2 whitespace-nowrap">
            <div class="flex gap-2">
            <!-- Ver -->
              <button @click="openDoc(d)" title="Ver documento">
              <EyeIcon class="h-5 w-5 text-blue-600 hover:text-blue-700 cursor-pointer" />
              </button>

            <!-- Descargar -->
              <button @click="downloadDoc(d)" title="Descargar documento">
              <ArrowDownOnSquareStackIcon class="h-5 w-5 text-purple-600 hover:text-purple-700 cursor-pointer" />
              </button>

            <!-- Eliminar -->
            <button @click="removeDoc(d)" title="Eliminar documento">
              <TrashIcon class="h-5 w-5 text-red-600 hover:text-red-700 cursor-pointer" />
            </button>
          </div>
          </td>
          </tr>
        </tbody>
      </table>

      <!-- Overlay de carga: NO empuja el layout -->
      <div
        v-if="loading"
        class="absolute inset-0 grid place-items-center bg-white/50 backdrop-blur-[1px]"
        aria-label="Cargando resultados"
      >
        <div class="text-sm text-gray-600">Cargando…</div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="mt-4 flex justify-between items-center">
      <button @click="page--" :disabled="page===1"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
        Anterior
      </button>
      <span>Página {{ page }} de {{ totalPages }}</span>
      <button @click="page++" :disabled="page===totalPages"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
        Siguiente
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { DocumentService } from "../../services/document.service";
import UserSearchAutocomplete from "../../views/user/UserSearchAutocomplete.vue";
import { useToasts } from "../../composables/useToasts";
import {
  EyeIcon,
  ArrowDownOnSquareStackIcon,
  TrashIcon,
} from "@heroicons/vue/24/solid";
const { success, error } = useToasts();

// Filtros backend
const filters = ref({
  nombrePdf: "",
  estado: "",
  includeDeleted: false,
});

// Filtros client-side (IDs)
const selectedRemitente = ref(null);  // { id, fullName }
const selectedDestinatario = ref(null);

const loading = ref(false);
const all = ref([]);      // respuesta cruda del backend (DocumentDto[])
const filtered = ref([]); // después de filtros por remitente/destinatario

// Paginación client-side
const page = ref(1);
const perPage = 10;
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)));
const pageItems = computed(() => {
  const start = (page.value - 1) * perPage;
  return filtered.value.slice(start, start + perPage);
});

const isResetting = ref(false);

// Debounce para nombrePdf
let timer;
function onDebouncedFetch() {
  clearTimeout(timer);
  timer = setTimeout(fetch, 350);
}

// Badge de estado
function badgeClass(estado) {
  return estado === "firmado"
    ? "bg-green-200 text-green-800"
    : "bg-yellow-200 text-yellow-800";
}

// Formato de fecha (si está firmado usa FechaFirma, si no, FechaEnvio)
function formatFecha(d) {
  const raw = d.fechaFirma ?? d.fechaEnvio ?? d.fecha ?? null;
  if (!raw) return "-";
  const dt = new Date(raw);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Client-side filter para remitente/destinatario
function applyClientFilter() {
  const rId = selectedRemitente.value?.id;
  const dId = selectedDestinatario.value?.id;
  filtered.value = all.value.filter(x => {
    const okR = rId ? String(x.remitenteID ?? x.remitenteId) === String(rId) : true;
    const okD = dId ? String(x.destinatarioID ?? x.destinatarioId) === String(dId) : true;
    return okR && okD;
  });
  page.value = 1;
}

// Cargar desde backend (sólo filtros soportados por la API)
async function fetch() {
  loading.value = true;
  try {
    // Garantiza que tras cambios de filtros nunca quedes en una página inválida
    page.value = 1;
    const data = await DocumentService.listAll({ ...filters.value });
    all.value = Array.isArray(data) ? data : [];
    applyClientFilter(); // luego aplicar remitente/destinatario
  } catch (e) {
    error(e?.response?.data?.message || "No se pudo cargar la lista de documentos.");
  } finally {
    loading.value = false;
  }
}

// Reset en UN batch → una sola llamada a fetch con debounce corto
function resetFilters() {
  isResetting.value = true;
  filters.value = {
    nombrePdf: "",
    estado: "",
    includeDeleted: false,
  };
  selectedRemitente.value = null;
  selectedDestinatario.value = null;
  page.value = 1; // evitar “salto” por paginación alta
  isResetting.value = false;
  // pequeño debounce para estabilizar inputs antes del fetch
  setTimeout(fetch, 150);
}

watch(() => filters.value.nombrePdf, () => { if (!isResetting.value) onDebouncedFetch(); });
watch(() => filters.value.estado, () => { if (!isResetting.value) fetch(); });
watch(() => filters.value.includeDeleted, () => { if (!isResetting.value) fetch(); });



// Acciones
async function openDoc(d) {
  const blob = await DocumentService.download(d.id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}
async function downloadDoc(d) {
  const blob = await DocumentService.download(d.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = d.nombrePDF || `documento_${d.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
async function removeDoc(d) {
  if (!confirm(`¿Eliminar (soft) el documento: ${d.nombrePDF}?`)) return;
  try {
    await DocumentService.remove(d.id);
    success("Documento eliminado (soft).");
    fetch();
  } catch (e) {
    error(e?.response?.data?.message || "No se pudo eliminar el documento.");
  }
}

onMounted(fetch);
</script>
