<script setup>
import { onMounted, computed } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useRouter } from "vue-router";
import { useToasts } from "../../composables/useToasts";

const auth = useAuthStore();
const router = useRouter();
const { info } = useToasts();

onMounted(() => {
  auth.loadFromStorage?.();
});

const roleText = computed(() => auth?.user?.role ?? "—");
const tipoText = computed(() => auth?.user?.tipo ?? "—");

// Estado del token para debugging (solo en desarrollo)
const tokenStatus = computed(() => {
  if (auth.isRefreshing) return "🔄 Renovando...";
  if (auth.shouldRefresh) return "⚠️ Expira pronto";
  if (auth.isTokenExpired) return "❌ Expirado";
  return "✅ Válido";
});

// Tiempo restante del token
const tokenTimeRemaining = computed(() => {
  if (!auth.expiresAt) return null;

  const now = new Date();
  const expires = new Date(auth.expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return "Expirado";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Mostrar advertencia de cambio de contraseña forzado
const requiresPasswordChange = computed(() => auth.requiresPasswordChange);

// 🚨 FIX: computed property para import.meta.env.DEV
const isDev = computed(() => import.meta.env.DEV);

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

            <!-- Status del token (solo en desarrollo) -->
            <span
              v-if="isDev"
              class="shrink-0 text-xs bg-indigo-700 px-2 py-1 rounded"
              :title="`Token: ${tokenStatus} - ${tokenTimeRemaining || 'N/A'}`"
            >
              {{ tokenStatus }}
            </span>

            <!-- Tiempo restante -->
            <span
              v-if="tokenTimeRemaining && !isDev"
              class="shrink-0 text-xs bg-indigo-700 px-2 py-1 rounded"
            >
              {{ tokenTimeRemaining }}
            </span>

            <router-link
              to="/"
              class="shrink-0 ml-2 bg-white/10 px-3 py-1 rounded hover:bg-white/20"
            >
              Panel Usuario
            </router-link>

            <button
              @click="logout"
              :disabled="auth.isRefreshing"
              class="shrink-0 bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {{ auth.isRefreshing ? 'Cerrando...' : 'Cerrar' }}
            </button>
          </nav>
        </div>

        <!-- Sub-barra: h-6 fija, sin wrap -->
        <div class="h-6 flex items-center justify-end text-[11px] leading-none text-indigo-100 whitespace-nowrap overflow-hidden">
          <span class="truncate">
            Rol: {{ roleText }} · Tipo: {{ tipoText }}
            <span v-if="auth.isRefreshing" class="ml-2 text-yellow-300">(Renovando...)</span>
          </span>
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
