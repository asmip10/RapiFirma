<template>
  <div class="h-full">
    <router-view />
    <ToastHost />
  </div>
</template>
<script setup>
import ToastHost from "./components/common/ToastHost.vue";
</script>