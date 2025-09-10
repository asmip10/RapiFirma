<template>
  <section class="bg-white p-6 rounded-lg shadow max-w-2xl">
    <h2 class="text-xl font-semibold text-indigo-800 mb-4">Crear usuario</h2>

    <!-- Política -->
    <div class="mb-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
      No se permite crear usuarios con rol <b>Admin</b>.
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
        />
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
      <div class="md:col-span-2">
        <label class="block text-sm">Contraseña</label>
        <input
          v-model.trim="form.Password"
          type="password"
          class="border rounded-lg px-3 py-2 w-full"
          required
          minlength="6"
        />
        <p class="text-xs text-slate-500 mt-1">Mínimo 6 caracteres.</p>
      </div>


      <div>
        <label class="block text-sm">Rol</label>
        <select v-model="form.Tipo" class="border rounded-lg px-3 py-2 w-full" required>
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
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useUsersStore } from "../../stores/users";
import { useToasts } from "../../composables/useToasts";

const router = useRouter();
const store = useUsersStore();
const { success, error } = useToasts();

const form = reactive({
  Dni: "",
  Nombres: "",
  Apellidos: "",
  CargoId: 1,
  RolId: 2,   // 2 = User (permitido). 1 = Admin (bloqueado)
  Tipo: "",   // Requerido cuando RolId = 2 (a elección del negocio)
  Password: "",  // Password
});

const submitting = ref(false);
const errorMsg = ref("");

async function submit() {
  errorMsg.value = "";

  // Regla: no permitir Admin
  if (form.RolId === 1) {
    errorMsg.value = "No se permite crear usuarios con rol Admin.";
    error(errorMsg.value);
    return;
  }

  // Regla opcional: si es User, exigir Tipo (si tu negocio lo requiere)
  if (!form.Tipo) {
  errorMsg.value = "Selecciona el rol (Funcionario/Normal).";
  error(errorMsg.value);
  return;
  }
  
  if (!form.Password || form.Password.length < 6) {
    errorMsg.value = "La contraseña debe tener al menos 6 caracteres.";
    error(errorMsg.value);
    return;
  }

  
  try {
    submitting.value = true;
    // POST /api/users espera PascalCase (según tu backend)
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
