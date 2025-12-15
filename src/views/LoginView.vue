<!-- src/views/LoginView.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-4 relative">
    <!-- Enhanced Background Pattern -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 bg-grid-blue-200/[0.08] bg-[length:50px_50px]" />
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl animate-pulse" />
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-200/10 rounded-full blur-3xl animate-pulse delay-500" />
    </div>

    <!-- Login Container -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Login Form -->
      <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-10">

        <form @submit.prevent="onSubmit" class="space-y-6">
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">Usuario (DNI)</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  v-model="username"
                  type="text"
                  class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                  placeholder="Ingrese su DNI"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">Contraseña</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  v-model="password"
                  type="password"
                  class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </div>
          </div>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ingresando...
            </span>
            <span v-else class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Iniciar sesión
            </span>
          </button>

          <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 backdrop-blur-sm">
            <div class="flex items-center">
              <svg class="h-5 w-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-red-700 font-medium">{{ error }}</span>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Copyright Footer -->
    <div class="absolute bottom-4 right-4 z-10">
      <p class="text-xs text-gray-500">
        © 2024 RapiFirma. Todos los derechos reservados.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";
import { isFeatureEnabled } from "@/config/featureFlags";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { success, warning } = useToasts();

const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  loading.value = true;

  // Validaciones de seguridad
  if (!username.value.trim()) {
    error.value = "El usuario es requerido.";
    loading.value = false;
    return;
  }

  if (!password.value.trim()) {
    error.value = "La contraseña es requerida.";
    loading.value = false;
    return;
  }

  // Validación de DNI si aplica
  if (username.value.trim().length < 7) {
    error.value = "El usuario debe tener al menos 7 caracteres.";
    loading.value = false;
    return;
  }

  try {
    // Verificar feature flags antes de login
    if (!isFeatureEnabled('REFRESH_TOKEN_ENABLED')) {
      error.value = "El sistema de login no está disponible temporalmente.";
      loading.value = false;
      return;
    }

    const tokens = await auth.login({
      username: username.value.trim(), // Sanitizar input
      password: password.value
    });

    // Manejar cambio de contraseña forzado (con feature flag)
    if (isFeatureEnabled('FORCED_PASSWORD_CHANGE_ENABLED') && tokens.requiresPasswordChange) {
      warning("Debes cambiar tu contraseña para continuar.");
      const redirect = route.query.r;
      if (redirect) {
        router.push(`/change-password?r=${encodeURIComponent(redirect)}`);
      } else {
        router.push("/change-password");
      }
      return;
    }

    success("¡Bienvenido! Has iniciado sesión correctamente.");

    // FORZAR actualización del store para asegurar consistencia
    await auth.loadFromStorage();

    // Pequeña pausa para asegurar que el estado se actualice completamente
    await new Promise(resolve => setTimeout(resolve, 100));

    const redirect = route.query.r;
    console.log("[Login] Estado auth después de loadFromStorage:", {
      isAuthenticated: auth.isAuthenticated,
      hasToken: !!auth.accessToken,
      hasUser: !!auth.user,
      redirectTo: redirect || "/"
    });

    if (redirect) {
      await router.replace(String(redirect));
    } else {
      await router.replace("/");
    }
  } catch (err) {
    // Manejo mejorado de errores
    if (err.response?.status === 400) {
      const errors = err.response.data?.errors;
      if (errors?.[""]?.[0]) {
        error.value = errors[""][0];
      } else if (errors?.Username?.[0]) {
        error.value = errors.Username[0];
      } else if (errors?.Password?.[0]) {
        error.value = errors.Password[0];
      } else {
        error.value = "Credenciales inválidas.";
      }
    } else if (err.response?.status === 429) {
      error.value = "Demasiados intentos. Espera unos minutos antes de intentar nuevamente.";
    } else if (err.response?.status >= 500) {
      error.value = "Error del servidor. Intenta más tarde.";
    } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      error.value = "Tiempo de espera agotado. Verifica tu conexión.";
    } else if (err.message?.includes('Network Error')) {
      error.value = "Error de conexión. Verifica tu internet.";
    } else if (err.message?.includes('refresh tokens')) {
      error.value = "El sistema de autenticación no está disponible. Intenta más tarde.";
    } else {
      error.value = "Error inesperado. Intenta nuevamente.";
    }

    // Logging para debugging (solo en development)
    if (import.meta.env.DEV) {
      console.error('Login error:', err);
    }
  } finally {
    loading.value = false;
  }
}
</script>
