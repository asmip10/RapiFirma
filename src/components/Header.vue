<template>
  <div class="flex justify-between items-center p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
    <div class="text-2xl font-bold tracking-wide transform hover:scale-105 transition duration-300">
      Bienvenido {{ userName }}
    </div>
    <button @click="logout" class="bg-red-700 text-white px-5 py-2 rounded-full hover:bg-red-800 hover:shadow-md transition duration-300">
      Salir de la sesión
    </button>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const userName = authStore.userName;

const logout = () => {
  authStore.logout();
  // Agregar redirección a login con vue-router
};
</script>