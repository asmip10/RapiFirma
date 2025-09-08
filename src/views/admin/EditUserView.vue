<!-- src/views/admin/EditUserView.vue -->
<template>
  <section class="bg-white p-6 rounded-lg shadow max-w-2xl">
    <h2 class="text-xl font-semibold text-indigo-800 mb-4">Editar usuario #{{ id }}</h2>

    <!-- Error duro (usuario no encontrado u otro) -->
    <div v-if="loaded && fatalError" class="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
      {{ fatalError }}
      <div class="mt-3">
        <router-link to="/admin/users" class="px-3 py-2 bg-slate-200 rounded">Volver al listado</router-link>
      </div>
    </div>

    <!-- Mensaje si es Admin (bloqueado) -->
    <div
      v-if="loaded && isAdminUser"
      class="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm"
    >
      Los usuarios con rol <b>Admin</b> no pueden ser editados.
      <div class="mt-3">
        <router-link to="/admin/users" class="px-3 py-2 bg-slate-200 rounded">Volver al listado</router-link>
      </div>
    </div>

    <form v-if="loaded && !fatalError && !isAdminUser" class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm">DNI</label>
        <input v-model.trim="form.Dni" class="border rounded-lg px-3 py-2 w-full" required minlength="8" maxlength="8"/>
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
        <input v-model.trim="form.Nombres" class="border rounded-lg px-3 py-2 w-full" required />
      </div>

      <div class="md:col-span-2">
        <label class="block text-sm">Apellidos</label>
        <input v-model.trim="form.Apellidos" class="border rounded-lg px-3 py-2 w-full" required />
      </div>

      <!-- Username editable -->
      <div class="md:col-span-2">
        <label class="block text-sm">Username</label>
        <input
          v-model.trim="newUsername"
          class="border rounded-lg px-3 py-2 w-full"
          :placeholder="currentUsername || 'sin username'"
        />
        <p class="text-xs text-slate-500 mt-1">
          Se enviará como <code>newUsername</code> solo si es distinto al actual.
        </p>
      </div>

      <div>
        <label class="block text-sm">Rol</label>
        <select v-model.number="form.RolId" class="border rounded-lg px-3 py-2 w-full">
          <option :value="1" disabled>Admin (bloqueado)</option>
          <option :value="2">User</option>
        </select>
        <p class="text-xs text-slate-500 mt-1">No se permite asignar Admin.</p>
      </div>

      <div>
        <label class="block text-sm">Tipo (si Rol=User)</label>
        <select v-model="form.Tipo" class="border rounded-lg px-3 py-2 w-full">
          <option value="">—</option>
          <option>Funcionario</option>
          <option>Normal</option>
        </select>
      </div>

      <div class="md:col-span-2 flex justify-end gap-2 pt-2">
        <router-link to="/admin/users" class="px-4 py-2 bg-gray-200 rounded-lg">Cancelar</router-link>
        <button :disabled="submitting" type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
          {{ submitting ? "Guardando..." : "Guardar cambios" }}
        </button>
      </div>

      <p v-if="errorMsg" class="md:col-span-2 text-sm text-red-600">{{ errorMsg }}</p>
    </form>

    <p v-if="!loaded" class="text-gray-500">Cargando datos del usuario...</p>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { UserService } from "../../services/user.service";
import { useUsersStore } from "../../stores/users";
import { useToasts } from "../../composables/useToasts";

const route = useRoute();
const router = useRouter();
const store = useUsersStore();
const { success, error } = useToasts();

const id = String(route.params.id);

const form = reactive({
  Dni: "",
  Nombres: "",
  Apellidos: "",
  CargoId: 1,
  RolId: 2,  // 1=Admin (bloqueado), 2=User
  Tipo: "",
});

const loaded = ref(false);
const submitting = ref(false);
const errorMsg = ref("");
const fatalError = ref("");

const currentUsername = ref(""); // el que viene del backend/lista
const newUsername = ref("");

const isAdminUser = computed(() => form.RolId === 1);

function fillFrom(raw) {
  form.Dni = raw.dni ?? raw.Dni ?? "";
  form.Nombres = raw.nombres ?? raw.Nombres ?? "";
  form.Apellidos = raw.apellidos ?? raw.Apellidos ?? "";
  form.CargoId = raw.cargoId ?? raw.CargoId ?? 1;
  form.RolId = raw.rolId ?? raw.RolId ?? (raw.rol === "Admin" ? 1 : 2);
  form.Tipo = raw.tipo ?? raw.Tipo ?? "";

  currentUsername.value = raw.username ?? raw.Username ?? "";
  newUsername.value = currentUsername.value;
}

onMounted(async () => {
  try {
    // 1) intenta del store si ya fue cargado
    if (store.items?.length) {
      const fromStore = store.items.find(u => String(u.id) === id);
      if (fromStore) {
        fillFrom(fromStore);
        loaded.value = true;
        return;
      }
    }
    // 2) intenta del backend con fallback
    const raw = await UserService.getById(id);
    if (!raw) {
      fatalError.value = "Usuario no encontrado.";
      loaded.value = true;
      return;
    }
    fillFrom(raw);
    loaded.value = true;
  } catch (e) {
    fatalError.value = e?.response?.data?.message || "No se pudo cargar el usuario.";
    loaded.value = true; // ⬅️ importante: salimos del estado 'Cargando…'
    error(fatalError.value);
  }
});

async function submit() {
  errorMsg.value = "";

  // Reglas de negocio
  if (form.RolId === 1) {
    errorMsg.value = "No se permite asignar el rol Admin.";
    error(errorMsg.value);
    return;
  }
  if (form.RolId === 2 && !form.Tipo) {
    errorMsg.value = "Selecciona el 'Tipo' para usuarios con rol User.";
    error(errorMsg.value);
    return;
  }

  const payload = {
    dni: form.Dni,
    nombres: form.Nombres,
    apellidos: form.Apellidos,
    cargoId: Number(form.CargoId),
    rolId: Number(form.RolId),
    tipo: form.Tipo || "",
  };

  const candidate = (newUsername.value ?? "").trim();
  if (candidate && candidate !== (currentUsername.value ?? "").trim()) {
    payload.newUsername = candidate;
  }

  try {
    submitting.value = true;
    await UserService.update(id, payload);
    await store.fetch();
    success("Usuario actualizado.");
    router.push({ name: "admin.users" });
  } catch (e) {
    errorMsg.value = e?.response?.data?.message || "No se pudo actualizar el usuario.";
    error(errorMsg.value);
  } finally {
    submitting.value = false;
  }
}
</script>
