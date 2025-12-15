<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="$emit('close')"></div>

    <!-- Modal container -->
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-white bg-opacity-20 rounded-full p-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">Agregar Participantes</h2>
                <p class="text-blue-100 text-sm">{{ queue.document?.namePDF || queue.nombrePDF }}</p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="text-white hover:text-blue-200 transition-colors duration-200"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <!-- Current participants -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Participantes Actuales</h3>
            <div class="space-y-2 mb-4">
              <div
                v-for="(participant, index) in currentParticipants"
                :key="participant.id || participant.usuario_id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                    {{ getUserInitial(participant) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ participant.name || participant.nombre }}</p>
                    <p class="text-sm text-gray-600">Turno {{ index + 1 }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="getParticipantStatusClass(participant)"
                  >
                    {{ getParticipantStatus(participant) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="bg-blue-50 p-3 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>Nota:</strong> Los nuevos participantes se agregarán al final de la cola.
              </p>
            </div>
          </div>

          <!-- Search and select -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Buscar Usuarios</h3>

            <!-- Search input -->
            <div class="relative mb-4">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                v-model="searchQuery"
                @input="searchUsers"
                type="text"
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buscar por nombre o email..."
              />
            </div>

            <!-- Quick filters -->
            <div class="flex flex-wrap gap-2 mb-4">
              <button
                v-for="filter in quickFilters"
                :key="filter.id"
                @click="applyQuickFilter(filter)"
                class="px-3 py-1 text-sm border rounded-full transition-colors duration-200"
                :class="activeFilter === filter.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                "
              >
                {{ filter.label }}
              </button>
            </div>

            <!-- Search results -->
            <div v-if="searching" class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p class="text-sm text-gray-600">Buscando usuarios...</p>
            </div>

            <div v-else-if="searchResults.length === 0 && searchQuery" class="text-center py-8">
              <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <p class="text-gray-500">No se encontraron usuarios</p>
              <p class="text-sm text-gray-400 mt-1">Intenta con otros términos de búsqueda</p>
            </div>

            <div v-else-if="searchResults.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="user in searchResults"
                :key="user.id"
                class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div class="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    :id="`user-${user.id}`"
                    v-model="selectedUsers"
                    :value="user.id"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    :disabled="isAlreadyParticipant(user.id)"
                  />
                  <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                    {{ getUserInitial(user) }}
                  </div>
                  <div>
                    <label :for="`user-${user.id}`" class="font-medium text-gray-900 cursor-pointer">
                      {{ user.name || user.nombre }}
                    </label>
                    <p class="text-sm text-gray-600">{{ user.email || user.correo }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <span
                    v-if="isAlreadyParticipant(user.id)"
                    class="text-xs text-gray-500"
                  >
                    Ya participante
                  </span>
                  <span
                    v-else
                    class="text-xs text-gray-400"
                  >
                    {{ user.role || 'Usuario' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected users -->
          <div v-if="selectedUsers.length > 0" class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Nuevos Participantes ({{ selectedUsers.length }})
            </h3>
            <div class="space-y-2">
              <div
                v-for="userId in selectedUsers"
                :key="userId"
                class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">
                    {{ getUserInitial(getUserById(userId)) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ getUserById(userId)?.name || getUserById(userId)?.nombre }}</p>
                    <p class="text-sm text-gray-600">{{ getUserById(userId)?.email || getUserById(userId)?.correo }}</p>
                  </div>
                </div>
                <button
                  @click="removeUser(userId)"
                  class="text-red-600 hover:text-red-800 transition-colors duration-200"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">
              <p>Se agregarán {{ selectedUsers.length }} nuevo{{ selectedUsers.length !== 1 ? 's' : '' }} participante{{ selectedUsers.length !== 1 ? 's' : '' }}</p>
              <p v-if="selectedUsers.length > 0" class="text-xs text-gray-500 mt-1">
                Se notificará a los usuarios seleccionados
              </p>
            </div>
            <div class="flex space-x-3">
              <button
                @click="$emit('close')"
                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                @click="addParticipants"
                :disabled="selectedUsers.length === 0 || adding"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                <svg v-if="adding" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ adding ? 'Agregando...' : 'Agregar Participantes' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { queueService } from '@/services/queue.service';

const emit = defineEmits(['close', 'added', 'error']);

const props = defineProps({
  queue: {
    type: Object,
    required: true
  }
});

// Estado
const searchQuery = ref('');
const searchResults = ref([]);
const selectedUsers = ref([]);
const searching = ref(false);
const adding = ref(false);
const activeFilter = ref(null);

// Quick filters
const quickFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'admin', label: 'Administradores' },
  { id: 'recent', label: 'Recientes' }
];

// Participantes actuales
const currentParticipants = computed(() => {
  return props.queue.participants || [];
});

// IDs de participantes actuales
const currentParticipantIds = computed(() => {
  return currentParticipants.value.map(p => p.id || p.usuario_id);
});

// Métodos
const searchUsers = async () => {
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = [];
    return;
  }

  searching.value = true;

  try {
    // Simulación de búsqueda - en producción esto llamaría a un servicio real
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simular resultados de búsqueda
    const mockUsers = [
      { id: 101, name: 'Ana García', email: 'ana.garcia@empresa.com', role: 'Gerente' },
      { id: 102, name: 'Carlos Rodríguez', email: 'carlos.rodriguez@empresa.com', role: 'Desarrollador' },
      { id: 103, name: 'María López', email: 'maria.lopez@empresa.com', role: 'Designer' },
      { id: 104, name: 'Juan Martínez', email: 'juan.martinez@empresa.com', role: 'Analista' },
      { id: 105, name: 'Laura Sánchez', email: 'laura.sanchez@empresa.com', role: 'QA' }
    ];

    // Filtrar por query
    const filtered = mockUsers.filter(user => {
      const query = searchQuery.value.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    });

    // Filtrar por si ya son participantes
    searchResults.value = filtered.filter(user => !isAlreadyParticipant(user.id));

  } catch (error) {
    console.error('Error searching users:', error);
    searchResults.value = [];
  } finally {
    searching.value = false;
  }
};

const applyQuickFilter = (filter) => {
  activeFilter.value = filter.id;

  // Simular filtros rápidos
  switch (filter.id) {
    case 'active':
      searchQuery.value = 'activo';
      break;
    case 'admin':
      searchQuery.value = 'admin';
      break;
    case 'recent':
      searchQuery.value = 'nuevo';
      break;
    default:
      searchQuery.value = '';
  }

  searchUsers();
};

const isAlreadyParticipant = (userId) => {
  return currentParticipantIds.value.includes(userId);
};

const getUserById = (userId) => {
  return searchResults.value.find(user => user.id === userId);
};

const removeUser = (userId) => {
  const index = selectedUsers.value.indexOf(userId);
  if (index > -1) {
    selectedUsers.value.splice(index, 1);
  }
};

const getUserInitial = (user) => {
  if (!user) return '?';
  const name = user.name || user.nombre;
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const getParticipantStatus = (participant) => {
  if (participant.signed || participant.firmado) {
    return 'Firmado';
  }
  return 'Pendiente';
};

const getParticipantStatusClass = (participant) => {
  if (participant.signed || participant.firmado) {
    return 'bg-green-100 text-green-800';
  }
  return 'bg-yellow-100 text-yellow-800';
};

const addParticipants = async () => {
  if (selectedUsers.value.length === 0) return;

  adding.value = true;

  try {
    // Llamar al servicio para agregar participantes
    await queueService.addParticipants(props.queue.queueId, selectedUsers.value);

    emit('added', {
      queueId: props.queue.queueId,
      users: selectedUsers.value.map(userId => getUserById(userId)),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error adding participants:', error);
    emit('error', error.message || 'Error al agregar participantes');
  } finally {
    adding.value = false;
  }
};

// Watch para limpiar búsqueda cuando se vacía
watch(searchQuery, (newQuery) => {
  if (newQuery === '') {
    searchResults.value = [];
  }
});
</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>