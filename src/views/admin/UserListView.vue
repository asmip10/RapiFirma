<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Usuarios</h2>
        <p class="text-sm text-slate-500">Gestiona usuarios activos e inactivos.</p>
      </div>
      <router-link
        :to="{ name: 'admin.users.create' }"
        class="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Crear usuario
      </router-link>
    </div>

    <div class="px-6 py-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="relative w-full md:max-w-sm">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model.trim="searchQuery"
            @input="onSearchInput"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Buscar por nombre o usuario"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            @click="clearSearch"
            aria-label="Limpiar busqueda"
          >
            Limpiar
          </button>
        </div>
        <div class="text-xs text-slate-500">
          {{ rows.length }} usuarios
        </div>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-6 py-3 text-left">Usuario</th>
            <th class="px-6 py-3 text-left">Nombres y Apellidos</th>
            <th class="px-6 py-3 text-left">Rol</th>
            <th class="px-6 py-3 text-left">Estado</th>
            <th class="px-6 py-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="u in pageItems"
            :key="u.id"
            class="transition hover:bg-slate-50"
          >
            <td class="px-6 py-3 font-medium text-slate-700">
              {{ u.username || u.dni || '-' }}
            </td>
            <td class="px-6 py-3 text-slate-600">
              {{ u.fullName || '-' }}
            </td>
            <td class="px-6 py-3 text-slate-600">
              {{ u.rol || '-' }}
            </td>
            <td class="px-6 py-3">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
              >
                {{ u.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-3">
              <div class="flex items-center gap-3">
                <button
                  v-if="u.isActive"
                  type="button"
                  class="text-slate-400 transition hover:text-indigo-600"
                  title="Resetear contrasena"
                  @click="resetPassword(u)"
                >
                  <KeyIcon class="h-5 w-5" />
                </button>

                <button
                  v-if="u.isActive"
                  type="button"
                  class="text-slate-400 transition hover:text-rose-600"
                  title="Deshabilitar usuario"
                  @click="disableUser(u)"
                >
                  <NoSymbolIcon class="h-5 w-5" />
                </button>
                <button
                  v-else
                  type="button"
                  class="text-slate-400 transition hover:text-emerald-600"
                  title="Habilitar usuario"
                  @click="enableUser(u)"
                >
                  <CheckCircleIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!store.loading && pageItems.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-sm text-slate-500">
              No hay usuarios para mostrar.
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.loading || searching" class="py-6 text-center text-sm text-slate-500">
        Cargando...
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-4 text-sm">
        <button
          @click="page--"
          :disabled="page === 1"
          class="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Anterior
        </button>
        <span class="text-slate-500">Pagina {{ page }} de {{ totalPages }}</span>
        <button
          @click="page++"
          :disabled="page === totalPages"
          class="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
import { UserService } from "../../services/user.service";
import { CheckCircleIcon, KeyIcon, MagnifyingGlassIcon, NoSymbolIcon } from "@heroicons/vue/24/outline";

const store = useUsersStore();
const { success, error } = useToasts();

const searchQuery = ref("");
const searchResults = ref([]);
const searching = ref(false);
let searchTimer;

const perPage = 15;
const page = ref(1);

const rows = computed(() => {
  if (searchQuery.value.trim().length >= 2) return searchResults.value;
  return store.items;
});

const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / perPage)));
const pageItems = computed(() => {
  const start = (page.value - 1) * perPage;
  return rows.value.slice(start, start + perPage);
});

function toRow(u) {
  const nombres = u.nombres ?? u.Nombres ?? "";
  const apellidos = u.apellidos ?? u.Apellidos ?? "";
  return {
    id: u.id ?? u.Id,
    dni: u.dni ?? u.Dni ?? "",
    username: u.username ?? u.Username ?? "",
    fullName: (u.fullName ?? u.FullName ?? `${nombres} ${apellidos}`).trim(),
    rol: u.rol ?? u.Rol ?? "",
    isActive: u.isActive ?? u.IsActive ?? true,
  };
}

function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 300);
}

async function runSearch() {
  const q = searchQuery.value.trim();
  if (q.length < 2) {
    searchResults.value = [];
    searching.value = false;
    page.value = 1;
    return;
  }
  searching.value = true;
  try {
    const results = await UserService.search(q, { limit: 10 });
    searchResults.value = results.map(toRow);
    page.value = 1;
  } catch (e) {
    error("No se pudo buscar usuarios.");
  } finally {
    searching.value = false;
  }
}

function clearSearch() {
  searchQuery.value = "";
  searchResults.value = [];
  page.value = 1;
}

async function resetPassword(user) {
  if (!confirm(`Resetear contrasena para ${user.fullName || user.username}?`)) return;
  try {
    await store.resetPassword(user.id);
    success("Contrasena reseteada.");
  } catch (e) {
    error("No se pudo resetear la contrasena.");
  }
}

async function disableUser(user) {
  if (!confirm(`Deshabilitar a ${user.fullName || user.username}?`)) return;
  try {
    await store.disable(user.id);
    await refreshData();
    success("Usuario deshabilitado.");
  } catch (e) {
    error("No se pudo deshabilitar el usuario.");
  }
}

async function enableUser(user) {
  if (!confirm(`Habilitar a ${user.fullName || user.username}?`)) return;
  try {
    await store.enable(user.id);
    await refreshData();
    success("Usuario habilitado.");
  } catch (e) {
    error("No se pudo habilitar el usuario.");
  }
}

async function refreshData() {
  await store.fetch();
  if (searchQuery.value.trim().length >= 2) {
    await runSearch();
  }
}

onMounted(refreshData);
</script>
