<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-semibold text-indigo-800">
          {{ useQueueSystem ? 'Crear Cola de Firma' : 'Subir y Enviar PDF' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <!-- Toggle de Sistema -->
      <div v-if="canToggleSystems" class="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div class="flex items-center justify-between">
          <div>
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="useQueueSystem"
                :disabled="!queueSystemEnabled"
                class="mr-3 h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span class="font-medium text-indigo-900">
                {{ useQueueSystem ? '📋 Sistema de Colas' : '📤 Sistema Simple' }}
              </span>
            </label>
            <p class="text-sm text-gray-600 mt-1">
              {{ useQueueSystem
                ? 'Múltiples firmantes en orden secuencial con dashboard especializado'
                : 'Un destinatario directo, sistema tradicional'
              }}
            </p>
          </div>
          <div class="text-right">
            <div v-if="useQueueSystem" class="text-xs text-green-600 font-medium">
              ✅ Nuevo Sistema
            </div>
            <div v-else class="text-xs text-orange-600 font-medium">
              ⚠️ Sistema Tradicional
            </div>
          </div>
        </div>
      </div>

      <!-- Advertencia de Sistema Antiguo -->
      <div v-if="!useQueueSystem && showLegacyWarning" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div class="flex items-center">
          <span class="text-yellow-800 mr-2">⚠️</span>
          <p class="text-sm text-yellow-800">
            Estás usando el sistema tradicional.
            <span v-if="queueSystemEnabled" class="font-medium">
              Considera probar el nuevo sistema de colas para múltiples firmantes.
            </span>
            <span v-else class="font-medium">
              El nuevo sistema de colas estará disponible próximamente.
            </span>
          </p>
        </div>
      </div>

      <!-- Archivo (común a ambos sistemas) -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Documento PDF
        </label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          @change="handleFileUpload"
          class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p v-if="fileError" class="text-sm text-red-600 mt-2">{{ fileError }}</p>
        <p v-if="selectedFile" class="text-xs text-gray-500 mt-2">
          {{ selectedFile.name }} — {{ prettySize(selectedFile.size) }}
        </p>
      </div>

      <!-- SISTEMA SIMPLE: 1 destinatario -->
      <div v-if="!useQueueSystem" class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Destinatario
        </label>
        <div class="relative">
          <input
            v-model.trim="searchUser"
            @input="onSearchUser"
            placeholder="Buscar usuario por nombre o email"
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <ul
            v-if="suggestedUsers.length > 0"
            class="absolute bg-white border border-gray-300 rounded-lg mt-1 w-full max-h-40 overflow-y-auto z-10 shadow-lg"
          >
            <li
              v-for="user in suggestedUsers"
              :key="user.id"
              @click="selectUser(user)"
              class="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div class="font-medium">{{ user.fullName }}</div>
              <div class="text-sm text-gray-500">{{ user.email }}</div>
            </li>
          </ul>
          <p v-if="searchHint" class="text-xs text-gray-500 mt-2">{{ searchHint }}</p>
        </div>

        <!-- Usuario seleccionado -->
        <div v-if="selectedUser" class="mt-3 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                {{ selectedUser.fullName?.charAt(0)?.toUpperCase() }}
              </div>
              <div>
                <div class="font-medium">{{ selectedUser.fullName }}</div>
                <div class="text-sm text-gray-500">{{ selectedUser.email }}</div>
              </div>
            </div>
            <button
              @click="selectedUser = null"
              class="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- SISTEMA DE COLAS: Múltiples firmantes -->
      <div v-else class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Firmantes (en orden de firma)
        </label>

        <!-- Lista de firmantes seleccionados -->
        <div v-if="selectedSigners.length > 0" class="mb-4">
          <div class="text-sm text-gray-600 mb-3">Orden de firma:</div>
          <div class="space-y-2">
            <div
              v-for="(signer, index) in selectedSigners"
              :key="signer.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex items-center flex-1">
                <div class="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  {{ index + 1 }}
                </div>
                <div class="flex-1">
                  <div class="font-medium">{{ signer.fullName }}</div>
                  <div class="text-sm text-gray-500">{{ signer.email }}</div>
                </div>
              </div>
              <button
                @click="removeSigner(signer.id)"
                class="text-red-500 hover:text-red-700 ml-3"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Búsqueda y agregado de usuarios -->
        <div class="relative">
          <input
            v-model.trim="searchUser"
            @input="onSearchUser"
            placeholder="Buscar usuarios para agregar como firmantes..."
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <ul
            v-if="suggestedUsers.length > 0"
            class="absolute bg-white border border-gray-300 rounded-lg mt-1 w-full max-h-40 overflow-y-auto z-10 shadow-lg"
          >
            <li
              v-for="user in suggestedUsers"
              :key="user.id"
              @click="addSigner(user)"
              class="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div class="font-medium">{{ user.fullName }}</div>
              <div class="text-sm text-gray-500">{{ user.email }}</div>
            </li>
          </ul>
        </div>

        <!-- Opciones de cola -->
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="allowDynamicAddition"
              class="mr-2 h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <span class="text-sm font-medium text-blue-900">
              Permitir agregar más firmantes después de crear la cola
            </span>
          </label>
        </div>
      </div>

      <!-- Mensajes -->
      <div v-if="errorMsg" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div class="text-sm text-red-800">{{ errorMsg }}</div>
      </div>
      <div v-if="uploadSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="text-sm text-green-800">{{ successMessage }}</div>
      </div>

      <!-- Acciones -->
      <div class="flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="submitDocument"
          :disabled="!canSubmit || submitting"
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <svg v-if="submitting" class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ submitting ? 'Procesando...' : (useQueueSystem ? 'Crear Cola' : 'Enviar Documento') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { DocumentService } from "../services/document.service";
import { UserService } from "../services/user.service";
import { useDocumentsStore } from "../stores/document";
import { useAuthStore } from "@/stores/auth";
import { useToasts } from "../composables/useToasts";

const emit = defineEmits(["close", "upload-success"]);

// Stores y auth
const documentStore = useDocumentsStore();
const auth = useAuthStore();
const { success, error } = useToasts();

// Estado del componente
const useQueueSystem = ref(false);
const selectedFile = ref(null);
const fileError = ref("");
const errorMsg = ref("");
const uploadSuccess = ref(false);
const successMessage = ref("");
const submitting = ref(false);

// Sistema simple
const selectedUser = ref(null);

// Sistema de colas
const selectedSigners = ref([]);
const allowDynamicAddition = ref(false);

// Búsqueda de usuarios (común)
const searchUser = ref("");
const suggestedUsers = ref([]);
const searchHint = ref("");

let searchTimer;

// Computadas
const canToggleSystems = computed(() => documentStore.canToggleDashboard);
const queueSystemEnabled = computed(() => documentStore.isQueueSystemEnabled);
const canUseMultiSigners = computed(() => documentStore.canUseMultiSigners);
const showLegacyWarning = computed(() => documentStore.shouldShowLegacyWarning);

const canSubmit = computed(() => {
  if (!selectedFile.value) return false;

  if (useQueueSystem.value) {
    return canUseMultiSigners.value && selectedSigners.value.length > 0;
  } else {
    return selectedUser.value !== null;
  }
});

// Métodos
function prettySize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

function handleFileUpload(e) {
  fileError.value = "";
  const file = e.target.files?.[0] ?? null;
  if (!file) {
    selectedFile.value = null;
    return;
  }

  // Validar que sea PDF
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    selectedFile.value = null;
    fileError.value = "Selecciona un archivo PDF válido.";
    return;
  }

  // Validar tamaño (ej: 20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    selectedFile.value = null;
    fileError.value = "El archivo supera el límite de 20MB.";
    return;
  }

  selectedFile.value = file;
}

function onSearchUser() {
  clearTimeout(searchTimer);
  selectedUser.value = null;
  errorMsg.value = "";
  searchHint.value = "";

  const q = (searchUser.value ?? "").trim();
  if (q.length < 2) {
    suggestedUsers.value = [];
    if (q.length === 1) searchHint.value = "Escribe al menos 2 caracteres.";
    return;
  }

  searchTimer = setTimeout(async () => {
    try {
      // Aquí deberías llamar a tu servicio de búsqueda de usuarios
      // Por ahora, simulamos algunos resultados
      // const results = await UserService.search(q);

      // Simulación para demostración
      const _mockResults = [
        { id: 1, fullName: "Juan Pérez", email: "juan@ejemplo.com" },
        { id: 2, fullName: "María García", email: "maria@ejemplo.com" },
        { id: 3, fullName: "Carlos López", email: "carlos@ejemplo.com" }
      ].filter(user =>
        user.fullName.toLowerCase().includes(q.toLowerCase()) ||
        user.email.toLowerCase().includes(q.toLowerCase())
      );
      void _mockResults;

      // Excluir al usuario logueado
      const myId = auth.user?.id ?? auth.user?.Id;
      const results = await UserService.search(q);
      suggestedUsers.value = (results || []).filter(u => String(u.id) !== String(myId));

      if (!suggestedUsers.value.length) {
        searchHint.value = "Sin resultados para tu búsqueda.";
      }
    } catch (e) {
      suggestedUsers.value = [];
      searchHint.value = "";
      errorMsg.value = "No se pudo buscar usuarios. Intenta otra vez.";
    }
  }, 300);
}

function selectUser(user) {
  selectedUser.value = user;
  searchUser.value = user.fullName;
  suggestedUsers.value = [];
  searchHint.value = "";
}

function addSigner(user) {
  // Evitar duplicados
  if (!selectedSigners.value.find(s => s.id === user.id)) {
    selectedSigners.value.push(user);
  }
  searchUser.value = "";
  suggestedUsers.value = [];
}

function removeSigner(userId) {
  selectedSigners.value = selectedSigners.value.filter(s => s.id !== userId);
}

// Conversión de archivo a base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitDocument() {
  errorMsg.value = "";
  uploadSuccess.value = false;

  if (!selectedFile.value) {
    errorMsg.value = "Por favor selecciona un archivo PDF.";
    return;
  }

  const myId = auth.user?.id ?? auth.user?.Id;

  // Validación específica para sistema simple
  if (!useQueueSystem.value && selectedUser.value && String(selectedUser.value.id) === String(myId)) {
    errorMsg.value = "No puedes enviarte el documento a ti mismo.";
    return;
  }

  try {
    submitting.value = true;
    const pdfBase64 = await fileToBase64(selectedFile.value);
    const nombreLogico = selectedFile.value.name.replace(/\.pdf$/i, "");

    if (useQueueSystem.value) {
      // Sistema de colas
      const result = await documentStore.createQueueWithParticipants({
        nombrePDF: nombreLogico,
        pdfData: pdfBase64,
        firmantes: selectedSigners.value.map(s => s.id)
      });

      successMessage = "Cola de firma creada exitosamente";
      success("Cola de firma creada exitosamente");

    } else {
      // Sistema simple tradicional
      await DocumentService.upload({
        nombrePDF: nombreLogico,
        destinatarioID: selectedUser.value.id,
        pdfBase64
      });

      successMessage = "Documento enviado correctamente";
      success("Documento enviado correctamente");
    }

    uploadSuccess.value = true;

    // Cierre y refresco después de un delay para que el usuario vea el éxito
    setTimeout(() => {
      emit("upload-success");
      emit("close");
    }, 1000);

  } catch (e) {
    const errorMessage = e?.response?.data?.message || e?.message || "Error al procesar el documento";
    errorMsg.value = errorMessage;
    error(errorMessage);
  } finally {
    submitting.value = false;
  }
}

// Inicialización
onMounted(() => {
  // Si el sistema de colas está habilitado y es el predeterminado, usarlo
  if (queueSystemEnabled.value && documentStore.ui?.currentView === 'queue') {
    useQueueSystem.value = true;
  }
});
</script>

<style scoped>
/* Estilos específicos si se necesitan */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
