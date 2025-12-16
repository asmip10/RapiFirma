<!-- src/views/LoginView.vue -->
<template>
  <div class="min-h-screen relative flex items-center justify-center p-0 md:p-4 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
    <!-- Page Background -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <img src="/draaLogin.png" alt="" class="h-full w-full object-cover blur-md scale-110 opacity-35" />
      <div class="absolute inset-0 bg-gradient-to-br from-slate-200/75 via-slate-100/55 to-slate-200/80" />
      <div class="absolute inset-0 bg-grid-white/[0.06] bg-[length:56px_56px]" />
      <div class="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/12 blur-3xl" />
      <div class="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
    </div>

    <!-- Stage -->
    <div class="relative z-10 w-full max-w-screen-2xl">
      <div class="relative overflow-hidden rounded-[2.25rem] border border-white/15 shadow-[0_30px_120px_rgba(0,0,0,0.55)] bg-white/5">
        <div class="relative min-h-[560px] md:min-h-[70vh]">
          <!-- Background -->
          <div class="absolute inset-0">
            <div class="absolute inset-y-0 left-0 w-full md:w-[82%] overflow-hidden">
              <img src="/draaLogin.png" alt="" class="h-full w-full object-cover object-left scale-125 -translate-x-6" />
              <div class="absolute inset-0 bg-gradient-to-r from-slate-900/10 via-transparent to-transparent" />
            </div>
            <div class="absolute inset-y-0 right-0 hidden md:block w-[18%] bg-gradient-to-b from-white via-amber-50 to-lime-50" />
          </div>

          <!-- Login Panel -->
          <div class="relative z-10 mx-auto w-full max-w-md px-4 py-10 md:absolute md:top-1/2 md:right-3 md:w-[460px] md:px-0 md:py-0 md:-translate-y-1/2 md:-translate-x-12">
            <div class="rounded-3xl bg-white border border-emerald-300 shadow-[0_28px_80px_rgba(4,120,87,0.28)] p-6 md:p-7">
              <div class="mb-6">
                <h1 class="text-3xl md:text-4xl font-semibold text-emerald-800 text-center">Login</h1>
              </div>

        <form @submit.prevent="onSubmit" class="space-y-4">
          <div class="space-y-4">
            <div>
              <label class="block text-base font-semibold text-slate-800 mb-2">Usuario (DNI)</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-emerald-700 group-hover:text-emerald-800 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  v-model="username"
                  type="text"
                  class="w-full pl-12 pr-4 py-3.5 border border-emerald-300 rounded-2xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 bg-white text-base text-slate-900 placeholder-slate-500 transition-all duration-200 group-hover:border-emerald-400"
                  placeholder="Ingrese su DNI"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-base font-semibold text-slate-800 mb-2">Contraseña</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-emerald-700 group-hover:text-emerald-800 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full pl-12 pr-12 py-3.5 border border-emerald-300 rounded-2xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 bg-white text-base text-slate-900 placeholder-slate-500 transition-all duration-200 group-hover:border-emerald-400"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-700 hover:text-emerald-900 transition-colors duration-200"
                  :aria-label="showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'"
                  @mousedown.prevent
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? EyeSlashIcon : EyeIcon" class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-700 via-lime-600 to-amber-500 hover:from-emerald-800 hover:via-lime-700 hover:to-amber-600 disabled:from-slate-200 disabled:via-slate-200 disabled:to-slate-200 text-white text-base font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
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
              Iniciar sesion
            </span>
          </button>

          <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4">
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
        </div>
      </div>
    </div>

    <!-- Copyright Footer -->
    <div class="absolute bottom-4 right-4 z-10">
      <p class="text-xs text-white/45">
        © 2024 RapiFirma. Todos los derechos reservados.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";
import { isFeatureEnabled } from "@/config/featureFlags";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { success, warning } = useToasts();

const username = ref("");
const password = ref("");
const showPassword = ref(false);
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
