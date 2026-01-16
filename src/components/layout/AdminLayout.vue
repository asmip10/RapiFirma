<script setup>
import { onMounted, computed } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

onMounted(() => {
  auth.loadFromStorage?.();
});

// Mostrar advertencia de cambio de contraseña forzado
const requiresPasswordChange = computed(() => auth.requiresPasswordChange);

async function logout() {
  await auth.logout();
  router.push("/login");
}

function goToChangePassword() {
  router.push("/change-password");
}
</script>

<template>
  <div class="h-screen w-full bg-gray-50 overflow-y-scroll" style="scrollbar-gutter: stable both-edges;">
    <!-- Banner de cambio de contraseña forzado -->
    <div
      v-if="requiresPasswordChange"
      class="bg-yellow-50 border-b border-yellow-200 px-4 py-3"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm text-yellow-800">
            Por seguridad, debes cambiar tu contraseña.
          </span>
        </div>
        <button
          @click="goToChangePassword"
          class="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-4 py-1 rounded"
        >
          Cambiar ahora
        </button>
      </div>
    </div>

    <header class="sticky top-0 z-40 w-full">
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]"></div>
        <div class="relative mx-auto max-w-7xl px-4 py-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white shadow-lg">
                <span class="text-sm font-semibold">RF</span>
              </div>
              <div>
                <h1 class="text-lg font-semibold text-white">RapiFirma Admin</h1>
                <p class="text-xs text-white/70">Panel de control de la plataforma</p>
              </div>
            </div>

            <nav class="flex items-center gap-3 text-sm">
              <router-link
                to="/"
                class="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-white/90 transition hover:bg-white/10"
              >
                Panel Usuario
              </router-link>

              <button
                @click="logout"
                :disabled="auth.isRefreshing"
                class="inline-flex items-center rounded-full bg-rose-500/90 px-4 py-2 font-medium text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                {{ auth.isRefreshing ? 'Cerrando...' : 'Cerrar' }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading overlay durante refresh -->
    <div
      v-if="auth.isRefreshing"
      class="fixed top-0 left-0 right-0 bg-indigo-500/10 text-indigo-700 px-4 py-2 text-sm z-50 flex items-center justify-center"
    >
      <svg class="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Renovando sesión...
    </div>

    <main class="mx-auto max-w-7xl w-full p-4">
      <router-view />
    </main>
  </div>
</template>
