<template>
  <section class="bg-white p-6 rounded-lg shadow max-w-2xl">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-indigo-800">Crear usuario</h2>
        <p class="text-sm text-slate-500">
          {{ isAuto ? 'Completa el DNI y autocompleta los datos.' : 'Completa los datos manualmente.' }}
        </p>
      </div>
      <div class="flex items-center gap-2 rounded-full bg-slate-100 p-1">
        <button
          type="button"
          class="rounded-full px-4 py-1.5 text-sm font-semibold transition"
          :class="isAuto ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="setMode('auto')"
        >
          Automático
        </button>
        <button
          type="button"
          class="rounded-full px-4 py-1.5 text-sm font-semibold transition"
          :class="!isAuto ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="setMode('manual')"
        >
          Manual
        </button>
      </div>
    </div>

    <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="submit">
      <div>
        <label class="flex items-center justify-between text-sm">
          <span>DNI</span>
          <span v-if="isAuto" class="text-xs text-slate-400">{{ dniDigitsCount }}/8</span>
        </label>
        <input
          v-model.trim="form.Dni"
          class="border rounded-lg px-3 py-2 w-full"
          required
          minlength="8"
          maxlength="8"
          inputmode="numeric"
          @input="onDniInput"
        />
        <p v-if="dniLookupLoading" class="text-xs text-slate-500 mt-1">Verificando DNI...</p>
        <p v-else-if="dniLookupError" class="text-xs text-red-600 mt-1">{{ dniLookupError }}</p>
      </div>

      <div>
        <label class="block text-sm">Cargo</label>
        <select v-model.number="form.CargoId" class="border rounded-lg px-3 py-2 w-full">
          <option :value="1">Gerente</option>
          <option :value="2">Asistente</option>
        </select>
      </div>

      <div class="md:col-span-2">
        <label class="block text-sm">Nombres</label>
        <input
          v-model.trim="form.Nombres"
          class="border rounded-lg px-3 py-2 w-full"
          :class="isAuto ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''"
          :disabled="isAuto"
          required
        />
      </div>

      <div class="md:col-span-2">
        <label class="block text-sm">Apellidos</label>
        <input
          v-model.trim="form.Apellidos"
          class="border rounded-lg px-3 py-2 w-full"
          :class="isAuto ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''"
          :disabled="isAuto"
          required
        />
      </div>

      <div>
        <label class="block text-sm">Tipo</label>
        <select v-model="form.Tipo" class="border rounded-lg px-3 py-2 w-full" required>
          <option disabled value="">Seleccionar</option>
          <option>Funcionario</option>
          <option>Normal</option>
        </select>
      </div>

      <div class="md:col-span-2 flex justify-end gap-2 pt-2">
        <router-link to="/admin/users" class="px-4 py-2 bg-gray-200 rounded-lg">Cancelar</router-link>
        <button
          :disabled="submitting"
          type="submit"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {{ submitting ? "Guardando..." : "Guardar" }}
        </button>
      </div>

      <p v-if="errorMsg" class="md:col-span-2 text-sm text-red-600">{{ errorMsg }}</p>
    </form>
  </section>

  <!-- Modal informativo (usuario existente / DNI no encontrado) -->
  <div v-if="infoModal.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div class="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ infoModal.title }}</h3>
          <p v-if="infoModal.message" class="mt-1 text-sm text-slate-600">{{ infoModal.message }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          @click="closeInfoModal"
        >
          ✕
        </button>
      </div>
      <div class="flex justify-end gap-2 p-4">
        <button
          type="button"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          @click="closeInfoModal"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useUsersStore } from "../../stores/users";
import { useToasts } from "../../composables/useToasts";
import { UserService } from "../../services/user.service";

const router = useRouter();
const store = useUsersStore();
const { success, error } = useToasts();

const form = reactive({
  Dni: "",
  Nombres: "",
  Apellidos: "",
  CargoId: 1,
  Tipo: "",
});

const submitting = ref(false);
const errorMsg = ref("");
const dniLookupLoading = ref(false);
const dniLookupError = ref("");
const mode = ref("auto");
const isAuto = computed(() => mode.value === "auto");
const dniDigitsCount = computed(() => String(form.Dni ?? "").replace(/\D/g, "").length);
const infoModal = reactive({
  open: false,
  title: "",
  message: "",
});
let dniTimer;
let lookupSeq = 0;

function openInfoModal(title, message = "") {
  infoModal.title = title || "";
  infoModal.message = message || "";
  infoModal.open = true;
}

function closeInfoModal() {
  infoModal.open = false;
}

function setMode(nextMode) {
  mode.value = nextMode;
  dniLookupError.value = "";
  if (isAuto.value && /^\d{8}$/.test(form.Dni.trim())) {
    onDniInput();
  }
}

function onDniInput() {
  if (!isAuto.value) return;
  dniLookupError.value = "";
  form.Dni = String(form.Dni ?? "").replace(/\D/g, "").slice(0, 8);
  const dni = form.Dni.trim();
  clearTimeout(dniTimer);

  if (!/^\d{8}$/.test(dni)) {
    form.Nombres = "";
    form.Apellidos = "";
    return;
  }

  dniTimer = setTimeout(() => {
    lookupDni(dni);
  }, 350);
}

async function lookupDni(dni) {
  const requestId = ++lookupSeq;
  dniLookupLoading.value = true;
  try {
    let searchResults = [];
    try {
      searchResults = await UserService.search(dni, { limit: 10 });
    } catch (searchError) {
      // El search es solo para verificar si existe. Si devuelve 404/no existe o falla, continuamos sin bloquear.
      const st = searchError?.response?.status;
      if (st !== 404) {
        console.warn("Error verificando usuario existente (search):", searchError);
      }
      searchResults = [];
    }
    const normalizedDni = String(dni).trim();
    const existing = (Array.isArray(searchResults) ? searchResults : []).find(user => {
      const userDni = String(user?.dni ?? "").trim();
      const username = String(user?.username ?? "").trim();
      return userDni === normalizedDni || username === normalizedDni;
    });

    if (requestId !== lookupSeq) return;

    if (existing) {
      form.Nombres = "";
      form.Apellidos = "";
      dniLookupError.value = "";
      openInfoModal(
        "Usuario existente",
        `Ya existe un usuario registrado con ese DNI (${existing.fullName || existing.username || normalizedDni}).`
      );
      return;
    }

    const response = await UserService.reniec(dni);
    const payload = response?.data ?? response;
    if (response?.success === false) {
      throw new Error(response?.message || "No se pudo consultar el DNI.");
    }
    if (requestId !== lookupSeq) return;
    form.Nombres = String(payload?.nombres ?? "").trim();
    form.Apellidos = String(payload?.apellidos ?? "").trim();
  } catch (e) {
    if (requestId !== lookupSeq) return;
    const status = e?.response?.status;
    const retryAfter = e?.response?.headers?.["retry-after"];
    form.Nombres = "";
    form.Apellidos = "";
    dniLookupError.value = "";

    if (status === 429 && retryAfter) {
      openInfoModal("Límite excedido", `Intenta nuevamente en ${retryAfter}s.`);
      return;
    }

    openInfoModal("DNI no existe", "No se encontraron datos para ese DNI.");
  } finally {
    if (requestId === lookupSeq) {
      dniLookupLoading.value = false;
    }
  }
}

async function submit() {
  errorMsg.value = "";

  if (!form.Tipo) {
    errorMsg.value = "Selecciona el tipo de usuario.";
    error(errorMsg.value);
    return;
  }

  if (isAuto.value && (!form.Nombres || !form.Apellidos)) {
    errorMsg.value = dniLookupError.value || "Completa un DNI válido para obtener nombres y apellidos.";
    error(errorMsg.value);
    return;
  }

  try {
    submitting.value = true;
    await store.create({ ...form });
    success("Usuario creado.");
    router.push({ name: "admin.users" });
  } catch (e) {
    errorMsg.value = e?.response?.data?.message || "No se pudo crear el usuario.";
    error(errorMsg.value);
  } finally {
    submitting.value = false;
  }
}
</script>
