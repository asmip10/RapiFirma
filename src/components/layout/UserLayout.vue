<script setup>
import { computed, onMounted } from "vue";
import { ArrowRightOnRectangleIcon, Cog6ToothIcon } from "@heroicons/vue/24/outline";
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

const isAdmin = computed(() => auth.user?.role === "Admin");

const initials = computed(() => {
  const name = String(displayName.value ?? "").trim();
  if (!name) return "U";
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase()).filter(Boolean);
  return (letters.join("") || name[0]?.toUpperCase() || "U").slice(0, 2);
});

// Estado del token para debugging (solo en desarrollo)
const tokenStatus = computed(() => {
  if (auth.isRefreshing) return "🔄 Renovando...";
  if (auth.shouldRefresh) return "⚠️ Expira pronto";
  if (auth.isTokenExpired) return "❌ Expirado";
  return "✅ Válido";
});

// Mostrar advertencia de cambio de contraseña forzado
const requiresPasswordChange = computed(() => auth.requiresPasswordChange);

const tokenStatusText = computed(() => {
  if (auth.isRefreshing) return "Renovando...";
  if (auth.shouldRefresh) return "Expira pronto";
  if (auth.isTokenExpired) return "Expirado";
  return "Válido";
});

// 🚨 FIX: computed property para import.meta.env.DEV
const isDev = computed(() => import.meta.env.DEV);

const tokenBadgeText = computed(() => {
  if (auth.isRefreshing) return "Renovando...";
  if (auth.shouldRefresh) return "Expira pronto";
  if (auth.isTokenExpired) return "Expirado";
  return "Valido";
});

// Tiempo restante del token en formato legible
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
      <div class="max-w-screen-2xl mx-auto flex items-center justify-between">
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

    <header class="sticky top-0 z-40 w-full bg-slate-200/95 backdrop-blur border-b border-slate-300 shadow-md">
      <div class="mx-auto max-w-screen-2xl h-16 px-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
            {{ initials }}
          </div>
          <div class="min-w-0">
            <div class="text-xs text-gray-500">Bienvenido</div>
            <div class="text-sm font-semibold text-gray-900 truncate">{{ displayName }}</div>
          </div>
        </div>

        <div class="flex items-center gap-3 whitespace-nowrap">
          <!-- Status del token (solo en desarrollo) -->
          <span
            v-if="isDev"
            class="text-xs text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-md"
            :title="`Token: ${tokenBadgeText} - ${tokenTimeRemaining || 'N/A'}`"
          >
            {{ tokenBadgeText }}
          </span>

          <!-- Tiempo restante (si hay token con expiración) -->
          <span
            v-if="tokenTimeRemaining && !isDev"
            class="text-xs text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-md"
          >
            {{ tokenTimeRemaining }}
          </span>

          <router-link
            v-if="isAdmin"
            to="/admin"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Cog6ToothIcon class="w-5 h-5 text-gray-600" />
            <span>Admin</span>
          </router-link>

          <button
            @click="logout"
            :disabled="auth.isRefreshing"
            class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
          >
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            {{ auth.isRefreshing ? 'Cerrando...' : 'Cerrar sesión' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Loading overlay durante refresh -->
    <div
      v-if="auth.isRefreshing"
      class="fixed top-0 left-0 right-0 bg-blue-500/10 text-blue-700 px-4 py-2 text-sm z-50 flex items-center justify-center"
    >
      <svg class="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Renovando sesión...
    </div>

    <main class="mx-auto max-w-screen-2xl w-full p-4">
      <router-view />
    </main>
  </div>
</template>
