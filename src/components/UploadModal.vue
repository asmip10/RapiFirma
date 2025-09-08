<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
      <h3 class="text-xl font-semibold mb-4 text-indigo-800">Subir y Enviar PDF</h3>

      <!-- Archivo -->
      <div class="mb-4">
        <input
          type="file"
          accept="application/pdf,.pdf"
          @change="handleFileUpload"
          class="w-full p-3 border border-gray-300 rounded-lg"
        />
        <p v-if="fileError" class="text-sm text-red-600 mt-2">{{ fileError }}</p>
        <p v-if="selectedFile" class="text-xs text-gray-500 mt-1">
          {{ selectedFile.name }} — {{ prettySize(selectedFile.size) }}
        </p>
      </div>

      <!-- Autocompletar usuarios -->
      <div class="relative mb-4">
        <input
          v-model.trim="searchUser"
          @input="onSearch"
          placeholder="Buscar usuario (mín. 2 caracteres)"
          class="w-full p-3 border border-gray-300 rounded-lg"
          aria-label="Buscar usuario por nombre o apellidos"
        />
        <ul
          v-if="suggestedUsers.length"
          class="absolute bg-white border border-gray-300 rounded-lg mt-1 w-full max-h-40 overflow-y-auto z-10"
          role="listbox"
        >
          <li
            v-for="u in suggestedUsers"
            :key="u.id"
            @click="selectUser(u)"
            class="p-3 hover:bg-indigo-50 cursor-pointer"
            role="option"
          >
            {{ u.fullName }}
          </li>
        </ul>
        <p v-if="searchHint" class="text-xs text-gray-500 mt-2">{{ searchHint }}</p>
      </div>

      <!-- Mensajes -->
      <div v-if="errorMsg" class="mb-3 text-sm text-red-600">
        {{ errorMsg }}
      </div>
      <div v-if="uploadSuccess" class="mb-4 flex items-center text-green-600">
        <span>Documento enviado correctamente</span>
      </div>

      <!-- Acciones -->
      <div class="flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancelar
        </button>
        <button
          @click="submitPdf"
          :disabled="!selectedFile || !selectedUser || submitting"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ submitting ? "Enviando..." : "Enviar" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { UserService } from "../services/user.service";
import { DocumentService } from "../services/document.service";
import { useToasts } from "../composables/useToasts";

const { success, error } = useToasts();
const emit = defineEmits(["close", "upload-success"]);

const searchUser = ref("");
const suggestedUsers = ref([]);
const selectedUser = ref(null);

const selectedFile = ref(null);
const fileError = ref("");
const errorMsg = ref("");
const uploadSuccess = ref(false);
const submitting = ref(false);

function prettySize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(2048)), units.length - 1);
  const val = bytes / Math.pow(2048, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

function handleFileUpload(e) {
  fileError.value = "";
  const file = e.target.files?.[0] ?? null;
  if (!file) {
    selectedFile.value = null;
    return;
  }
  // Validaciones básicas
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    selectedFile.value = null;
    fileError.value = "Selecciona un archivo PDF válido.";
    return;
  }
  // (Opcional) límite 10MB como referencia del backend
  const TEN_MB = 10 * 1024 * 1024;
  if (file.size > TEN_MB) {
    selectedFile.value = null;
    fileError.value = "El archivo supera el límite de 10MB.";
    return;
  }
  selectedFile.value = file;
}

let searchTimer;
const searchHint = ref("");

function onSearch() {
  clearTimeout(searchTimer);
  selectedUser.value = null; // si cambia el texto, invalidar selección previa
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
      suggestedUsers.value = await UserService.search(q); // maneja 400 -> []
      if (!suggestedUsers.value.length) {
        searchHint.value = "Sin resultados para tu búsqueda.";
      }
    } catch (e) {
      // Errores de red u otros
      suggestedUsers.value = [];
      searchHint.value = "";
      errorMsg.value = "No se pudo buscar usuarios. Intenta otra vez.";
    }
  }, 300);
}

function selectUser(u) {
  selectedUser.value = u;
  searchUser.value = u.fullName;
  suggestedUsers.value = [];
}

// Archivo → base64 (sin cabecera)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // ej: data:application/pdf;base64,AAAA...
      const base64 = String(result).split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitPdf() {
  errorMsg.value = "";
  uploadSuccess.value = false;
  if (!selectedFile.value || !selectedUser.value) return;

  try {
    submitting.value = true;
    const pdfBase64 = await fileToBase64(selectedFile.value);

    // nombre lógico sin .pdf (si la tiene)
    const nombreLogico = selectedFile.value.name.replace(/\.pdf$/i, "");

    await DocumentService.upload({
      nombrePDF: nombreLogico,
      destinatarioID: selectedUser.value.id,
      pdfBase64, // DocumentService lo mapea a PdfData internamente
    });
    uploadSuccess.value = true;
    success("Documento enviado correctamente");
    // Cierre y refresco (MainPanel escucha @upload-success)
    setTimeout(() => {
      emit("upload-success");
      emit("close");
    }, 500);
  } catch (e) {
    // Mensaje simple y claro para el usuario
    errorMsg.value =
      e?.response?.data?.message ||
      "No se pudo enviar el documento. Revisa tu conexión o inténtalo nuevamente.";
      error(errorMsg.value);
  } finally {
    submitting.value = false;
  }
}
</script>
