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
          Automatico
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
        <label class="block text-sm">DNI</label>
        <input
          v-model.trim="form.Dni"
          class="border rounded-lg px-3 py-2 w-full"
          required
          minlength="8"
          maxlength="8"
          inputmode="numeric"
          @input="onDniInput"
        />
        <p v-if="dniLookupLoading" class="text-xs text-slate-500 mt-1">Consultando RENIEC...</p>
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
let dniTimer;
let lookupSeq = 0;

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
  const dni = form.Dni.trim();
  clearTimeout(dniTimer);

  if (!/^\d{8}$/.test(dni)) {
    form.Nombres = "";
    form.Apellidos = "";
    return;
  }

  dniTimer = setTimeout(() => {
    lookupReniec(dni);
  }, 350);
}

async function lookupReniec(dni) {
  const requestId = ++lookupSeq;
  dniLookupLoading.value = true;
  try {
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
    if (status === 429 && retryAfter) {
      dniLookupError.value = `Limite excedido. Intenta en ${retryAfter}s.`;
    } else {
      dniLookupError.value = e?.response?.data?.message || e?.response?.data || e?.message || "No se pudo consultar el DNI.";
    }
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
    errorMsg.value = "Completa un DNI valido para obtener nombres y apellidos.";
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
