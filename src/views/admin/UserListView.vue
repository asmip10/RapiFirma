<template>
  <section class="bg-white p-6 rounded-lg shadow">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-indigo-800">Usuarios</h2>
      <router-link
        :to="{ name: 'admin.users.create' }"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
      >
        Crear usuario
      </router-link>
    </div>

    <!-- Filtros -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
      <input
        v-model.trim="store.filters.q"
        @input="debouncedApply"
        class="border rounded-lg px-3 py-2"
        placeholder="Buscar por nombre/DNI/cargo"
      />
      <select v-model="store.filters.rol" @change="applyFilters" class="border rounded-lg px-3 py-2">
        <option value="">Rol (todos)</option>
        <option>Admin</option>
        <option>User</option>
      </select>
      <select v-model="store.filters.tipo" @change="applyFilters" class="border rounded-lg px-3 py-2">
        <option value="">Tipo (todos)</option>
        <option>Funcionario</option>
        <option>Normal</option>
      </select>
      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="store.filters.includeDeleted" @change="refetch" class="accent-indigo-600" />
        Incluir eliminados
      </label>
      <button @click="resetFilters" class="border rounded-lg px-3 py-2">Limpiar</button>
    </div>

    <!-- Tabla -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-indigo-100 text-indigo-800">
          <tr>
            <th class="px-4 py-2">DNI</th>
            <th class="px-4 py-2">Nombres y Apellidos</th>
            <th class="px-4 py-2">Cargo</th>
            <th class="px-4 py-2">Rol</th>
            <th class="px-4 py-2">Tipo</th>
            <th class="px-4 py-2">Estado</th>
            <th class="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in pageItems" :key="u.id" class="border-b">
            <td class="px-4 py-2">{{ u.dni }}</td>
            <td class="px-4 py-2">{{ u.fullName }}</td>
            <td class="px-4 py-2">{{ u.cargo || '—' }}</td>
            <td class="px-4 py-2">{{ u.rol || '—' }}</td>
            <td class="px-4 py-2">{{ u.tipo || '—' }}</td>
            <td class="px-4 py-2">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="u.isDeleted ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'"
              >
                {{ u.isDeleted ? 'Eliminado' : 'Activo' }}
              </span>
            </td>
            <td class="px-4 py-2">
              <!-- Admin: sin acciones -->
              <template v-if="isAdmin(u)">
                <span class="text-slate-400 select-none" title="Los Admin no se pueden editar ni eliminar">—</span>
              </template>

              <!-- No Admin: acciones con iconos -->
              <template v-else>
                <div class="flex items-center gap-3">
                  <!-- Editar solo si NO está eliminado -->
                  <router-link
                    v-if="!u.isDeleted"
                    :to="{ name:'admin.users.edit', params:{ id: u.id } }"
                    title="Editar usuario"
                    class="text-blue-600 hover:text-blue-700"
                  >
                    <PencilIcon class="h-5 w-5 cursor-pointer inline" />
                  </router-link>
                
                  <!-- Eliminar (soft) si está activo -->
                  <button
                    v-if="!u.isDeleted"
                    @click="softDelete(u)"
                    title="Eliminar usuario"
                    class="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon class="h-5 w-5 cursor-pointer inline" />
                  </button>
                
                  <!-- Restaurar si está eliminado -->
                  <button
                    v-if="u.isDeleted"
                    @click="restoreUser(u)"
                    title="Restaurar usuario"
                    class="text-green-700 hover:text-green-800 font-semibold"
                  >
                    Restaurar
                  </button>
                
                  <!-- Eliminar (hard) si está eliminado -->
                  <button
                    v-if="u.isDeleted"
                    @click="hardDelete(u)"
                    title="Eliminar definitivamente"
                    class="text-red-800 hover:text-red-900 font-semibold"
                  >
                    <TrashIcon class="h-5 w-5 cursor-pointer inline" />
                  </button>
                </div>
              </template>
            </td>
          </tr>

          <tr v-if="!store.loading && pageItems.length === 0">
            <td colspan="7" class="px-6 py-6 text-center text-gray-500">
              No hay usuarios para mostrar.
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.loading" class="py-6 text-center text-gray-500">
        Cargando...
      </div>

      <!-- Paginación -->
      <div class="mt-4 flex justify-between items-center">
        <button
          @click="page--"
          :disabled="page === 1"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
        >
          Anterior
        </button>
        <span>Página {{ page }} de {{ totalPages }}</span>
        <button
          @click="page++"
          :disabled="page === totalPages"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
        >
          Siguiente
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useUsersStore } from "../../stores/users";
import { useToasts } from "../../composables/useToasts";
import { PencilIcon, TrashIcon } from "@heroicons/vue/24/solid";

const store = useUsersStore();
const { success, error } = useToasts();

// helpers
const isAdmin = (u) => store.isAdmin(u);

// Paginación client-side
const page = ref(1);
const perPage = 10;
const totalPages = computed(() => Math.max(1, Math.ceil(store.filtered.length / perPage)));
const pageItems = computed(() => {
  const start = (page.value - 1) * perPage;
  return store.filtered.slice(start, start + perPage);
});

// Filtros
let timer;
function debouncedApply() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
  }, 300);
}
function applyFilters() {
  page.value = 1;
}
async function refetch() {
  page.value = 1;
  try {
    await store.fetch();
  } catch (e) {
    error(e?.response?.data?.message || "No se pudo cargar la lista de usuarios.");
  }
}
function resetFilters() {
  store.filters.q = "";
  store.filters.rol = "";
  store.filters.tipo = "";
  page.value = 1;
}

// Acciones
async function softDelete(u) {
  if (!confirm(`¿Eliminar (soft) al usuario: ${u.fullName}?`)) return;
  try {
    await store.remove(u.id, { hard: false });
    success("Usuario eliminado (soft).");
  } catch (e) {
    error(e?.message || e?.response?.data?.message || "No se pudo eliminar el usuario.");
  }
}
async function hardDelete(u) {
  if (!confirm(`⚠ Eliminación definitiva de ${u.fullName}. Esta acción es irreversible. ¿Continuar?`)) return;
  try {
    await store.remove(u.id, { hard: true });
    success("Usuario eliminado definitivamente.");
  } catch (e) {
    error(e?.message || e?.response?.data?.message || "No se pudo eliminar definitivamente al usuario.");
  }
}
async function restoreUser(u) {
  if (!confirm(`¿Restaurar al usuario: ${u.fullName}?`)) return;
  try {
    await store.restore(u.id);
    success("Usuario restaurado.");
  } catch (e) {
    error(e?.response?.data?.message || "No se pudo restaurar el usuario.");
  }
}

onMounted(refetch);
</script>

<!-- Sin estilos scoped extra; usamos utilidades Tailwind. -->
