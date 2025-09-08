<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <h3 class="text-lg font-semibold mb-4 text-indigo-800">Reenviar documento</h3>

      <p class="text-sm text-gray-600 mb-3">
        Documento: <span class="font-medium">{{ doc?.name }}</span>
      </p>

      <div class="relative mb-4">
        <input
          v-model.trim="searchUser"
          @input="onSearch"
          placeholder="Buscar usuario (mín. 2 caracteres)"
          class="w-full p-3 border border-gray-300 rounded-lg"
        />
        <ul
          v-if="suggestedUsers.length"
          class="absolute bg-white border border-gray-300 rounded-lg mt-1 w-full max-h-40 overflow-y-auto z-10"
        >
          <li
            v-for="u in suggestedUsers"
            :key="u.id"
            @click="selectUser(u)"
            class="p-3 hover:bg-indigo-50 cursor-pointer"
          >
            {{ u.fullName }}
          </li>
        </ul>
        <p v-if="hint" class="text-xs text-gray-500 mt-1">{{ hint }}</p>
        <p v-if="errorMsg" class="text-xs text-red-600 mt-1">{{ errorMsg }}</p>
      </div>

      <div class="flex justify-end gap-2">
        <button @click="$emit('close')" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
          Cancelar
        </button>
        <button
          @click="submit"
          :disabled="!selectedUser || submitting"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ submitting ? 'Enviando...' : 'Reenviar' }}
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
const props = defineProps({ doc: { type: Object, default: null } });
const emit = defineEmits(["close", "success"]);

const searchUser = ref("");
const suggestedUsers = ref([]);
const selectedUser = ref(null);
const submitting = ref(false);
const hint = ref("");
const errorMsg = ref("");

let timer;
function onSearch() {
  clearTimeout(timer);
  selectedUser.value = null;
  errorMsg.value = "";
  hint.value = "";
  const q = (searchUser.value ?? "").trim();
  if (q.length < 2) { suggestedUsers.value = []; if (q.length===1) hint.value="Escribe al menos 2 caracteres."; return; }
  timer = setTimeout(async () => {
    try {
      suggestedUsers.value = await UserService.search(q);
      if (!suggestedUsers.value.length) hint.value = "Sin resultados.";
    } catch { errorMsg.value = "No se pudo buscar usuarios."; suggestedUsers.value = []; }
  }, 300);
}
function selectUser(u) { selectedUser.value = u; searchUser.value = u.fullName; suggestedUsers.value = []; }

async function submit() {
if (!props.doc || !selectedUser.value) return;
try {
    submitting.value = true;
    await DocumentService.forward({ id: props.doc.id, newRecipientId: selectedUser.value.id });
    success("Documento reenviado.");
    emit("success");
} catch (e) {
    errorMsg.value = e?.response?.data?.message || "No se pudo reenviar el documento.";
    error(errorMsg.value);
} finally {
    submitting.value = false;
}
}
</script>
