<script setup>
import { onMounted, computed } from "vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
onMounted(() => { auth.loadFromStorage?.(); });

const roleText = computed(() => auth?.user?.role ?? "—");
const tipoText = computed(() => auth?.user?.tipo ?? "—");
</script>

<template>
  <div class="h-screen w-full bg-gray-50 overflow-y-scroll" style="scrollbar-gutter: stable both-edges;">
    <!-- HEADER rígido, sticky, 2 niveles con alturas fijas -->
    <header class="sticky top-0 z-40 w-full bg-indigo-600 text-white shadow">
      <div class="mx-auto max-w-7xl px-4">
        <!-- Barra superior: h-12 fija, sin wrap -->
        <div class="h-12 flex items-center justify-between gap-3">
          <h1 class="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
            RapiFirma · Admin
          </h1>

          <!-- nav: sin wrap; si no entra, trunca -->
          <nav class="flex items-center gap-4 text-sm whitespace-nowrap overflow-hidden">
            <router-link to="/admin" class="shrink-0 hover:underline">Dashboard</router-link>
            <router-link to="/admin/users" class="shrink-0 hover:underline">Usuarios</router-link>
            <router-link to="/admin/docs" class="shrink-0 hover:underline">Documentos</router-link>
            <router-link
              to="/"
              class="shrink-0 ml-2 bg-white/10 px-3 py-1 rounded hover:bg-white/20"
            >
              Panel Usuario
            </router-link>
          </nav>
        </div>

        <!-- Sub-barra: h-6 fija, sin wrap -->
        <div class="h-6 flex items-center justify-end text-[11px] leading-none text-indigo-100 whitespace-nowrap overflow-hidden">
          <span class="truncate">Rol: {{ roleText }} · Tipo: {{ tipoText }}</span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl w-full p-4">
      <router-view />
    </main>
  </div>
</template>
