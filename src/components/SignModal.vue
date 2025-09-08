<!-- src/components/SignModal.vue -->
<template>
  <div class="fixed inset-0 bg-black/40 grid place-items-center z-50">
    <div class="bg-white w-[min(92vw,28rem)] rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold mb-4 text-indigo-800">Subir PDF firmado</h3>

      <p class="text-sm text-slate-600 mb-3">
        Documento original: <span class="font-medium">{{ originalName }}.pdf</span>
      </p>

      <div class="mb-4">
        <input
          type="file"
          accept="application/pdf,.pdf"
          @change="onPick"
          class="w-full p-3 border border-gray-300 rounded-lg"
          aria-label="Seleccionar PDF firmado"
        />
        <p v-if="picked" class="text-xs text-gray-500 mt-2">
          {{ picked.name }} — {{ prettySize(picked.size) }}
        </p>
        <p v-if="errorMsg" class="text-sm text-red-600 mt-2">{{ errorMsg }}</p>
      </div>

      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 rounded bg-gray-200" @click="$emit('close')">Cancelar</button>
        <button
          class="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          :disabled="!picked || submitting"
          @click="submit"
        >
          {{ submitting ? 'Enviando...' : 'Confirmar firma' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { DocumentService } from "../services/document.service";
import { useToasts } from "../composables/useToasts";

const props = defineProps({
  doc: { type: Object, required: true }, // { id, name, ... } -> name = base sin ".pdf"
});
const emit = defineEmits(["close", "success"]);
const { success, error } = useToasts();

const originalName = computed(() => props.doc?.name ?? "Documento");
const picked = ref(null);
const errorMsg = ref("");
const submitting = ref(false);

function prettySize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

function onPick(e) {
  errorMsg.value = "";
  const f = e.target.files?.[0] ?? null;
  picked.value = null;
  if (!f) return;

  // 1) tipo/extension PDF
  const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  if (!isPdf) {
    errorMsg.value = "Selecciona un archivo PDF válido.";
    return;
  }

  // 2) tamaño (≤10MB)
  const MAX_20_MB = 20 * 1024 * 1024;
  if (f.size > MAX_20_MB) {
    errorMsg.value = "El archivo supera el límite de 20MB.";
    return;
  }

  // 3) nombre EXACTO: original + [F].pdf (sin espacios)
  //    originalName = base (sin .pdf)
  //    requerido    = `${originalName}[F].pdf` (extensión case-insensitive)
  const requiredBase = `${originalName.value}[F]`;
  const actualName = f.name;
  const match = actualName.match(/^(.+)\.pdf$/i);
  if (!match) {
    errorMsg.value = "La extensión debe ser .pdf";
    return;
  }
  const base = match[1]; // nombre sin .pdf

  if (base !== requiredBase) {
    errorMsg.value = `Nombre inválido. Debe ser exactamente: ${requiredBase}.pdf`;
    return;
  }

  picked.value = f;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function submit() {
  if (!picked.value) return;
  errorMsg.value = "";
  try {
    submitting.value = true;
    const base64 = await fileToBase64(picked.value);
    await DocumentService.sign({ id: props.doc.id, signedPdfBase64: base64 });
    success("Documento firmado correctamente.");
    emit("success");
    emit("close");
  } catch (e) {
    errorMsg.value =
      e?.response?.data?.message || "No se pudo subir el PDF firmado.";
    error(errorMsg.value);
  } finally {
    submitting.value = false;
  }
}
</script>
