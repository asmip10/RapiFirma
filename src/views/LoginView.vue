<!-- src/views/LoginView.vue -->
<template>
  <div class="min-h-screen grid place-items-center bg-gray-50">
    <div class="w-full max-w-sm bg-white shadow rounded-2xl p-6 space-y-4">
      <h1 class="text-xl font-semibold text-center">Iniciar sesión</h1>

      <form @submit.prevent="onSubmit" class="space-y-3">
        <div>
          <label class="block text-sm mb-1">Usuario</label>
          <input v-model="username" type="text" class="w-full border rounded-lg px-3 py-2" required />
        </div>
        <div>
          <label class="block text-sm mb-1">Contraseña (DNI)</label>
          <input v-model="password" type="password" class="w-full border rounded-lg px-3 py-2" required />
        </div>

        <button :disabled="loading" class="w-full bg-blue-600 text-white py-2 rounded-lg">
          {{ loading ? "Ingresando..." : "Ingresar" }}
        </button>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login({ username: username.value, password: password.value });
    const redirect = route.query.r;
    if (redirect) router.push(String(redirect));
    else router.push("/"); // ⬅️ importante para renderizar MainPanel
  } catch {
    error.value = "Credenciales inválidas o servidor no disponible";
  } finally {
    loading.value = false;
  }
}
</script>
