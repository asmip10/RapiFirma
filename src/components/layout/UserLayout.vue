<script setup>
import { computed, onMounted } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useRouter } from "vue-router";
import { useDisplayName } from "../../composables/useDisplayName";

const auth = useAuthStore();
const router = useRouter();
const { displayName, resolve } = useDisplayName();

onMounted(() => {
  auth.loadFromStorage();
  resolve();  
});

const username = computed(() => auth.user?.username || "usuario");
const isAdmin = computed(() => auth.user?.role === "Admin");

function logout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="h-screen w-full bg-gray-50 overflow-y-scroll" style="scrollbar-gutter: stable both-edges;">
    <header class="sticky top-0 z-40 w-full bg-slate-800 text-white">
      <div class="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between">
        <span class="font-semibold truncate">Bienvenido {{ displayName }}</span>
        <div class="flex items-center gap-3 whitespace-nowrap">
          <router-link v-if="isAdmin" to="/admin" class="bg-white/10 px-3 py-1 rounded hover:bg-white/20 text-sm">Ir a Admin</router-link>
          <button @click="logout" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm">Cerrar sesión</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl w-full p-4">
      <router-view />
    </main>
  </div>
</template>
