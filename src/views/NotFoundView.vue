<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center">
    <h1 class="text-9xl font-extrabold text-indigo-600">404</h1>
    <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-4">Página no encontrada</p>
    <p class="text-gray-600 mt-2">Lo sentimos, la página que buscas no existe.</p>

    <router-link
      to="/"
      class="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition"
    >
      Volver al inicio
    </router-link>
  </div>
</template>
