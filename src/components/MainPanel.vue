<!-- src/components/MainPanel.vue -->
<template>
  <div class="p-6 bg-gray-50">
    <!-- Header local del panel -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-indigo-800">Panel de Documentos</h2>
      <button
        @click="openUploadModal"
        class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg shadow hover:bg-indigo-700 transition flex items-center"
      >
        <CloudArrowUpIcon class="h-5 w-5 mr-2" />
        Subir y Enviar PDF
      </button>
    </div>

    <!-- Tabs -->
    <div class="mb-6 border-b border-gray-300">
      <button
        @click="activeTab = 'received'"
        :class="tabClass('received')"
        class="px-6 py-3 rounded-t-lg transition"
      >
        Recibidos
      </button>
      <button
        @click="activeTab = 'sent'"
        :class="tabClass('sent')"
        class="px-6 py-3 rounded-t-lg transition"
      >
        Enviados
      </button>
    </div>

    <!-- ========== RECIBIDOS ========== -->
    <section v-if="activeTab === 'received'" class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4 text-indigo-700">Recibidos</h3>

      <!-- Filtros -->
      <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          v-model.trim="docs.filters.nombrePdf"
          @input="debouncedFetch"
          placeholder="Buscar por nombre PDF"
          class="p-3 border border-gray-300 rounded-lg"
        />
        <select
          v-model="docs.filters.estadoReceived"
          @change="docs.fetchReceived"
          class="p-3 border border-gray-300 rounded-lg"
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="firmado">Firmados</option>
        </select>
        <!-- <input
          v-model="docs.filters.fecha"
          @change="docs.fetchReceived"
          type="date"
          class="p-3 border border-gray-300 rounded-lg"
        /> -->
      </div>

      <!-- Tabla -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-700">
          <thead class="bg-indigo-100 text-indigo-800 uppercase text-xs">
            <tr>
              <th class="px-6 py-3">Nombre PDF</th>
              <th class="px-6 py-3">Enviado Por</th>
              <th class="px-6 py-3">Estado</th>
              <th class="px-6 py-3">Fecha</th>
              <th class="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="doc in receivedPage"
              :key="doc.id"
              class="bg-white border-b hover:bg-gray-50"
            >
              <td class="px-6 py-4">{{ doc.name }}</td>
              <td class="px-6 py-4">{{ doc.sentBy }}</td>
              <td class="px-6 py-4">
                <span
                  :class="badgeClass(doc.status)"
                  class="px-3 py-1 rounded-full text-xs font-medium"
                >
                  {{ doc.status }}
                </span>
              </td>
              <td class="px-6 py-4">{{ doc.date }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <!-- Descargar: siempre visible, deshabilitado si pendiente -->
                  <button
                    class="text-purple-600 hover:text-purple-700 disabled:text-purple-300"
                    @click="downloadDoc(doc)"
                    :disabled="doc.status !== 'firmado'"
                    :title="doc.status === 'firmado' ? 'Descargar' : 'Disponible cuando esté firmado'"
                    aria-label="Descargar documento"
                  >
                    <ArrowDownOnSquareIcon class="h-5 w-5" />
                  </button>

                  <!-- Abrir en navegador -->
                  <button
                    class="text-blue-600 hover:text-blue-700"
                    @click="openDoc(doc)"
                    title="Abrir" aria-label="Abrir documento"
                  >
                    <FolderOpenIcon class="h-5 w-5" />
                  </button>

                  <!-- Firmar: solo si pendiente -->
                  <button
                    v-if="doc.status === 'pendiente'"
                    class="text-green-600 hover:text-green-700"
                    @click="signDoc(doc)"
                    title="Firmar" aria-label="Firmar documento"
                  >
                    <PencilSquareIcon class="h-5 w-5" />
                  </button>

                  <!-- Reenviar: solo si pendiente -->
                  <button
                    v-if="doc.status === 'pendiente'"
                    class="text-yellow-600 hover:text-yellow-700"
                    @click="sendDoc(doc)"
                    title="Reenviar" aria-label="Reenviar documento"
                  >
                    <ArrowPathRoundedSquareIcon class="h-5 w-5" />
                  </button>

                  <!-- Eliminar -->
                  <button
                    class="text-red-600 hover:text-red-700"
                    @click="deleteDoc(doc)"
                    title="Eliminar" aria-label="Eliminar documento"
                  >
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!docs.loading && receivedPage.length === 0">
              <td colspan="5" class="px-6 py-6 text-center text-gray-500">
                No hay documentos para mostrar.
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Loading -->
        <div v-if="docs.loading" class="py-6 text-center text-gray-500">
          Cargando...
        </div>

        <!-- Paginación -->
        <div class="mt-4 flex justify-between items-center">
          <button
            @click="currentPageReceived--"
            :disabled="currentPageReceived === 1"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            Anterior
          </button>
          <span>Página {{ currentPageReceived }} de {{ totalPagesReceived }}</span>
          <button
            @click="currentPageReceived++"
            :disabled="currentPageReceived === totalPagesReceived"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>

    <!-- ========== ENVIADOS ========== -->
    <section v-else class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4 text-indigo-700">Enviados</h3>

      <!-- Filtros -->
      <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          v-model.trim="docs.filters.nombrePdf"
          @input="debouncedFetch"
          placeholder="Buscar por nombre PDF"
          class="p-3 border border-gray-300 rounded-lg"
        />
        <select
          v-model="docs.filters.estadoSent"
          @change="docs.fetchSent"
          class="p-3 border border-gray-300 rounded-lg"
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="firmado">Firmados</option>
        </select>
        <!-- <input
          v-model="docs.filters.fechaSent"
          @change="docs.fetchSent"
          type="date"
          class="p-3 border border-gray-300 rounded-lg"
        /> -->v
      </div>

      <!-- Tabla -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-700">
          <thead class="bg-indigo-100 text-indigo-800 uppercase text-xs">
            <tr>
              <th class="px-6 py-3">Nombre PDF</th>
              <th class="px-6 py-3">Enviado A</th>
              <th class="px-6 py-3">Estado</th>
              <th class="px-6 py-3">Fecha</th>
              <th class="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="doc in sentPage"
              :key="doc.id"
              class="bg-white border-b hover:bg-gray-50"
            >
              <td class="px-6 py-4">{{ doc.name }}</td>
              <td class="px-6 py-4">{{ doc.sentTo }}</td>
              <td class="px-6 py-4">
                <span
                  :class="badgeClass(doc.status)"
                  class="px-3 py-1 rounded-full text-xs font-medium"
                >
                  {{ doc.status }}
                </span>
              </td>
              <td class="px-6 py-4">{{ doc.date }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <!-- Abrir -->
                  <button
                    class="text-blue-600 hover:text-blue-700"
                    @click="openDoc(doc)"
                    title="Abrir" aria-label="Abrir documento"
                  >
                    <FolderOpenIcon class="h-5 w-5" />
                  </button>

                  <!-- Reenviar -->
                  <button
                    class="text-yellow-600 hover:text-yellow-700"
                    @click="sendDoc(doc)"
                    title="Reenviar" aria-label="Reenviar documento"
                  >
                    <ArrowPathRoundedSquareIcon class="h-5 w-5" />
                  </button>

                  <!-- Descargar solo si firmado -->
                  <button
                    v-if="doc.status === 'firmado'"
                    class="text-purple-600 hover:text-purple-700"
                    @click="downloadDoc(doc)"
                    title="Descargar" aria-label="Descargar documento"
                  >
                    <ArrowDownOnSquareIcon class="h-5 w-5" />
                  </button>

                  <!-- Eliminar -->
                  <button
                    class="text-red-600 hover:text-red-700"
                    @click="deleteDoc(doc)"
                    title="Eliminar" aria-label="Eliminar documento"
                  >
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!docs.loading && sentPage.length === 0">
              <td colspan="5" class="px-6 py-6 text-center text-gray-500">
                No hay documentos para mostrar.
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Loading -->
        <div v-if="docs.loading" class="py-6 text-center text-gray-500">
          Cargando...
        </div>

        <!-- Paginación -->
        <div class="mt-4 flex justify-between items-center">
          <button
            @click="currentPageSent--"
            :disabled="currentPageSent === 1"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            Anterior
          </button>
          <span>Página {{ currentPageSent }} de {{ totalPagesSent }}</span>
          <button
            @click="currentPageSent++"
            :disabled="currentPageSent === totalPagesSent"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>

    <!-- Modales -->
    <UploadModal
      v-if="showUploadModal"
      @close="showUploadModal = false"
      @upload-success="handleUploadSuccess"
    />
    <ForwardModal
      v-if="showForwardModal"
      :doc="forwardDoc"
      @close="showForwardModal = false"
      @success="handleForwardSuccess"
    />
    <SignModal
    v-if="showSignModal"
    :doc="signDocRef"
    @close="showSignModal = false"
    @success="handleSignedSuccess"
    />
  </div>
</template>


<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useDocumentsStore } from "../stores/document";
import { DocumentService } from "../services/document.service";
import { useToasts } from "../composables/useToasts";
import ForwardModal from "./ForwardModal.vue";
import UploadModal from "./UploadModal.vue";
import SignModal from "./SignModal.vue";

// Heroicons solid
import {
  FolderOpenIcon,
  PencilSquareIcon,
  ArrowPathRoundedSquareIcon,
  ArrowDownOnSquareIcon,
  TrashIcon,
  CloudArrowUpIcon,
} from "@heroicons/vue/24/solid";
const { success, error } = useToasts();
const docs = useDocumentsStore();
const activeTab = ref("received");

// Paginación client-side
const itemsPerPage = 10;
const currentPageReceived = ref(1);
const currentPageSent = ref(1);

const receivedPage = computed(() => {
  const start = (currentPageReceived.value - 1) * itemsPerPage;
  return docs.received.slice(start, start + itemsPerPage);
});
const totalPagesReceived = computed(() =>
  Math.max(1, Math.ceil(docs.received.length / itemsPerPage))
);

const sentPage = computed(() => {
  const start = (currentPageSent.value - 1) * itemsPerPage;
  return docs.sent.slice(start, start + itemsPerPage);
});
const totalPagesSent = computed(() =>
  Math.max(1, Math.ceil(docs.sent.length / itemsPerPage))
);

function tabClass(tab) {
  return activeTab.value === tab
    ? "bg-indigo-100 text-indigo-800 font-semibold"
    : "text-gray-600";
}
function badgeClass(status) {
  return status === "firmado"
    ? "bg-green-200 text-green-800"
    : "bg-yellow-200 text-yellow-800";
}

const showUploadModal = ref(false);
function openUploadModal() {
  showUploadModal.value = true;
}
// ===== Modal de FIRMA =====
const showSignModal = ref(false);
const signDocRef = ref(null);

// Debounce para búsqueda por nombrePdf
let debounceTimer;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (activeTab.value === "received") {
      currentPageReceived.value = 1;
      docs.fetchReceived();
    } else {
      currentPageSent.value = 1;
      docs.fetchSent();
    }
  }, 350);
}

// ========== MODAL REENVIAR ==========
const showForwardModal = ref(false);
const forwardDoc = ref(null);

function sendDoc(doc) {
  forwardDoc.value = doc;
  showForwardModal.value = true;
}

function handleForwardSuccess() {
  // Refrescar solo el tab actual
  if (activeTab.value === "received") docs.fetchReceived();
  else docs.fetchSent();
  showForwardModal.value = false;
  forwardDoc.value = null;
}

// ========== ACCIONES ==========
async function openDoc(doc) {
  // Abre en el navegador (nueva pestaña)
  const blob = await DocumentService.download(doc.id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // liberamos el URL después de un tiempo para evitar revocar antes de que abra
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadDoc(doc) {
  if (doc.status !== "firmado") return; // deshabilitado si pendiente
  const blob = await DocumentService.download(doc.id);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.name}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}
async function handleSignedSuccess() {
  // Refrescar solo el tab actual
  if (activeTab.value === "received") await docs.fetchReceived();
  else await docs.fetchSent();
  showSignModal.value = false;
  signDocRef.value = null;
}

function signDoc(doc) {
  // Abre modal para subir el PDF firmado con validación de nombre estricto
  if (doc.status !== "pendiente") return;
  signDocRef.value = doc;
  showSignModal.value = true;
}

async function deleteDoc(doc) {
  try {
    await DocumentService.remove(doc.id);
    if (activeTab.value === "received") await docs.fetchReceived();
    else await docs.fetchSent();
    success("Documento eliminado.");
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      "No se pudo eliminar el documento.";
    error(msg);
  }
}

// Helpers
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const base64 = String(r.result).split(",")[1] ?? "";
      resolve(base64);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Cargar datos al montar
onMounted(async () => {
  await docs.fetchReceived();
  await docs.fetchSent();
});

// Cambio de tab → carga bajo demanda si está vacío
watch(activeTab, async (tab) => {
  if (tab === "received" && docs.received.length === 0) {
    await docs.fetchReceived();
  }
  if (tab === "sent" && docs.sent.length === 0) {
    await docs.fetchSent();
  }
});

// Reset de página al cambiar estado/fecha (Etapa 4)
watch(() => docs.filters.estadoReceived, async () => {
  currentPageReceived.value = 1;
  await docs.fetchReceived();
});
watch(() => docs.filters.fecha, async () => {
  currentPageReceived.value = 1;
  await docs.fetchReceived();
});
watch(() => docs.filters.estadoSent, async () => {
  currentPageSent.value = 1;
  await docs.fetchSent();
});
watch(() => docs.filters.fechaSent, async () => {
  currentPageSent.value = 1;
  await docs.fetchSent();
});
</script>



<!-- Sin @apply para evitar errores de Tailwind v4 en scoped -->
<style scoped>
/* (vacío a propósito) */
</style>
