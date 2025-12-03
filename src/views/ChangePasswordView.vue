<!-- src/views/ChangePasswordView.vue - NUEVO COMPONENTE -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-4">
    <!-- Background Pattern (similar a LoginView) -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 bg-grid-blue-200/[0.08] bg-[length:50px_50px]" />
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl animate-pulse" />
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/15 rounded-full blur-3xl animate-pulse delay-1000" />
    </div>

    <!-- Change Password Container -->
    <div class="relative z-10 w-full max-w-md">
      <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-10">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Cambiar Contraseña</h2>
          <p class="text-gray-600">Por seguridad, debes cambiar tu contraseña</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Current Password -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3">Contraseña Actual</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                v-model="currentPassword"
                type="password"
                required
                class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                placeholder="Ingresa tu contraseña actual"
              />
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3">Nueva Contraseña</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <input
                v-model="newPassword"
                type="password"
                required
                minlength="6"
                class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                placeholder="Ingresa tu nueva contraseña"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">Mínimo 6 caracteres</p>
          </div>

          <!-- Confirm New Password -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3">Confirmar Nueva Contraseña</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                v-model="confirmPassword"
                type="password"
                required
                class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                placeholder="Confirma tu nueva contraseña"
              />
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-xl p-4 backdrop-blur-sm">
            <div class="flex items-center">
              <svg class="h-5 w-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-red-700 font-medium">{{ errorMessage }}</span>
            </div>
          </div>

          <!-- Success Display -->
          <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-xl p-4 backdrop-blur-sm">
            <div class="flex items-center">
              <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-green-700 font-medium">{{ successMessage }}</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cambiando contraseña...
            </span>
            <span v-else class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Cambiar Contraseña
            </span>
          </button>
        </form>
      </div>
    </div>

    <!-- Footer -->
    <div class="absolute bottom-4 right-4 z-10">
      <p class="text-xs text-gray-500">
        © 2024 RapiFirma. Todos los derechos reservados.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { success, error } = useToasts();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

function validateForm() {
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "Las contraseñas no coinciden";
    return false;
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = "La contraseña debe tener al menos 6 caracteres";
    return false;
  }

  if (currentPassword.value === newPassword.value) {
    errorMessage.value = "La nueva contraseña debe ser diferente a la actual";
    return false;
  }

  return true;
}

async function handleSubmit() {
  errorMessage.value = "";
  successMessage.value = "";

  if (!validateForm()) {
    return;
  }

  loading.value = true;

  try {
    const result = await auth.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });

    success(result.message);
    successMessage.value = result.message;

    // Redirigir después de 2 segundos
    setTimeout(() => {
      if (result.requiresNewLogin) {
        router.push("/login");
      } else {
        // Usar query param 'r' si existe para redirección inteligente
        const redirect = route.query.r;
        if (redirect) {
          router.push(String(redirect));
        } else {
          router.push("/");
        }
      }
    }, 2000);
  } catch (err) {
    if (err.response?.status === 400) {
      const errors = err.response.data?.errors;
      errorMessage.value = Object.values(errors).flat().join(". ");
    } else {
      errorMessage.value = "Error al cambiar la contraseña. Intenta nuevamente.";
    }
  } finally {
    loading.value = false;
  }
}
</script>