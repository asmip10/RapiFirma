<!-- src/components/user/UserSearchAutocomplete.vue -->
<template>
  <div class="relative">
    <input
      v-model.trim="search"
      @input="onSearch"
      :placeholder="placeholder"
      class="w-full p-2 border rounded-lg"
      aria-label="Buscar usuario"
    />
    <ul
      v-if="suggestions.length"
      class="absolute bg-white border border-gray-300 rounded-lg mt-1 w-full max-h-40 overflow-y-auto z-10"
      role="listbox"
    >
      <li
        v-for="u in suggestions"
        :key="u.id"
        @click="selectUser(u)"
        class="px-3 py-2 hover:bg-indigo-50 cursor-pointer"
        role="option"
      >
        {{ u.fullName }}
      </li>
    </ul>
    <p v-if="hint" class="text-xs text-gray-500 mt-1">{{ hint }}</p>
    <p v-if="errorMsg" class="text-xs text-red-600 mt-1">{{ errorMsg }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { UserService } from "../../services/user.service";

const props = defineProps({
  placeholder: { type: String, default: "Buscar usuario..." },
  minChars: { type: Number, default: 2 },
});
const emit = defineEmits(["select"]);

const search = ref("");
const suggestions = ref([]);
const hint = ref("");
const errorMsg = ref("");

let timer;
function onSearch() {
  clearTimeout(timer);
  suggestions.value = [];
  errorMsg.value = "";
  hint.value = "";

  const q = (search.value ?? "").trim();
  if (q.length < props.minChars) {
    if (q.length > 0) hint.value = `Escribe al menos ${props.minChars} caracteres.`;
    return;
  }

  timer = setTimeout(async () => {
    try {
      suggestions.value = await UserService.search(q);
      if (!suggestions.value.length) {
        hint.value = "Sin resultados.";
      }
    } catch {
      errorMsg.value = "No se pudo buscar usuarios.";
    }
  }, 300);
}

function selectUser(u) {
  emit("select", u);
  search.value = u.fullName;
  suggestions.value = [];
}
</script>
