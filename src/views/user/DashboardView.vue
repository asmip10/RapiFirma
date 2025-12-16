<template>
  <div class="dashboard-container">
    <!-- 📋 ÚNICAMENTE SISTEMA DE COLAS -->
    <QueueDashboard
      @view-change="handleViewChange"
    />

    <!-- Modal para crear documentos (solo sistema de colas) -->
    <UploadModalHybrid
      v-if="showUploadModal"
      :force-system="'queue'"
      @close="showUploadModal = false"
      @upload-success="handleUploadSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDocumentsStore } from '../../stores/document';
import { useToasts } from '../../composables/useToasts';

// Componentes
import QueueDashboard from '../../components/QueueDashboard.vue';
import UploadModalHybrid from '../../components/UploadModalHybrid.vue';

const documentStore = useDocumentsStore();
const { success } = useToasts();

// Estado local
const showUploadModal = ref(false);

// Métodos del sistema de colas
function handleViewChange(view) {
  console.log('View change:', view);
}

function handleUploadSuccess() {
  success('Documento creado exitosamente');
  showUploadModal.value = false;

  // Refrescar dashboard de colas
  documentStore.fetchQueueDashboard();
}

// Exponer método para abrir el modal de creación
function openUploadModal() {
  showUploadModal.value = true;
}

// Cargar datos iniciales
onMounted(async () => {
  await documentStore.fetchQueueDashboard();
});

// Exponer para que otros componentes puedan llamarlo
defineExpose({
  openUploadModal
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100%;
}
</style>
