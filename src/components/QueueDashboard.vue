<template>
  <div class="queue-dashboard">

    <!-- MÉTRICAS PRINCIPALES -->
    <div class="dashboard-header p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Mi Turno - URGENTE -->
        <div class="metric-card bg-white p-4 rounded-lg border-l-4 border-red-500">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-red-700 flex items-center gap-2">
                <ExclamationTriangleIcon class="w-5 h-5 text-red-600" />
                <span>Mi Turno</span>
              </h3>
              <div class="text-3xl font-bold text-red-600">{{ myTurnCount }}</div>
              <p class="text-sm text-gray-600">Firmar ahora</p>
            </div>
            <div v-if="myTurnCount > 0" class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
              Urgente
            </div>
          </div>
        </div>

        <!-- En Progreso -->
        <div class="metric-card bg-white p-4 rounded-lg border-l-4 border-orange-500">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-orange-700 flex items-center gap-2">
                <ClockIcon class="w-5 h-5 text-orange-600" />
                <span>En Progreso</span>
              </h3>
              <div class="text-3xl font-bold text-orange-600">
                {{ inProgressCount }}
              </div>
              <p class="text-sm text-gray-600">Firmando</p>
            </div>
          </div>
        </div>

        <!-- Completados -->
        <div class="metric-card bg-white p-4 rounded-lg border-l-4 border-green-500">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-green-700 flex items-center gap-2">
                <CheckCircleIcon class="w-5 h-5 text-green-600" />
                <span>Completados</span>
              </h3>
              <div class="text-3xl font-bold text-green-600">{{ completedCount }}</div>
              <p class="text-sm text-gray-600">Finalizados</p>
            </div>
          </div>
        </div>

        <!-- Total Documentos -->
        <div class="metric-card bg-white p-4 rounded-lg border-l-4 border-blue-500">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-blue-700 flex items-center gap-2">
                <DocumentTextIcon class="w-5 h-5 text-blue-600" />
                <span>Total</span>
              </h3>
              <div class="text-3xl font-bold text-blue-600">
                {{ totalCount }}
              </div>
              <p class="text-sm text-gray-600">Documentos</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN: MI TURNO (URGENTE) -->
    <section v-if="queueStore.queues.myTurnQueues.length > 0" class="urgent-section mb-8">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 9 9 0 11-2 0 9-9 0 012-2z" clip-rule="evenodd" />
          </svg>
          <h2 class="text-xl font-semibold text-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon class="w-6 h-6 text-red-600" />
            <span>Mi Turno - Firmar Ahora</span>
          </h2>
        </div>
        <span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
          {{ queueStore.queues.myTurnQueues.length }} documento{{ queueStore.queues.myTurnQueues.length !== 1 ? 's' : '' }} urgente{{ queueStore.queues.myTurnQueues.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QueueCard
          v-for="queue in queueStore.queues.myTurnQueues"
          :key="queue.queueId"
          :queue="queue"
          priority="urgent"
          @sign="handleSign"
          @download="handleDownload"
          @hide="handleHide"
        />
      </div>
    </section>

    <!-- 🔄 SECCIÓN DE TABLAS CON TOGGLE -->
    <section class="tables-section mb-8">

      <!-- Toggle y Botón Crear -->
      <div class="flex items-center justify-between mb-6">
        <!-- Toggle Recibidos/Enviados -->
        <div class="bg-white p-1 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center space-x-1">
            <button
              @click="activeTable = 'received'"
              :class="[
                'px-6 py-2 rounded-md text-[0px] font-medium transition-colors',
                activeTable === 'received'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              ]"
            >
              📥 Recibidos
              <span class="inline-flex items-center gap-2 text-sm">
                <InboxIcon class="w-4 h-4" />
                <span>Recibidos</span>
              </span>
              <span
                v-if="receivedDocuments.length > 0"
                :class="[
                  'ml-2 inline-flex items-center justify-center min-w-6 h-5 px-2 rounded-full text-xs font-semibold',
                  activeTable === 'received' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                ]"
              >
                {{ receivedDocuments.length }}
              </span>
            </button>
            <button
              @click="activeTable = 'sent'"
              :class="[
                'px-6 py-2 rounded-md text-[0px] font-medium transition-colors',
                activeTable === 'sent'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              ]"
            >
              📤 Enviados
              <span class="inline-flex items-center gap-2 text-sm">
                <PaperAirplaneIcon class="w-4 h-4 -rotate-45" />
                <span>Enviados</span>
              </span>
              <span
                v-if="sentDocuments.length > 0"
                :class="[
                  'ml-2 inline-flex items-center justify-center min-w-6 h-5 px-2 rounded-full text-xs font-semibold',
                  activeTable === 'sent' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                ]"
              >
                {{ sentDocuments.length }}
              </span>
            </button>
          </div>
        </div>

        <!-- Botón Crear (solo visible en Enviados) -->
        <button
          v-if="activeTable === 'sent'"
          @click="openCreateModal"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Crear Nueva Cola
        </button>
      </div>

      <!-- 📋 TABLA DE RECIBIDOS -->
      <div v-if="activeTable === 'received'" class="bg-white rounded-lg shadow-sm border border-gray-200">

        <!-- FILTROS DE RECIBIDOS -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Búsqueda por nombre -->
            <div class="relative">
              <input
                v-model="receivedFilters.nombrePdf"
                type="text"
                placeholder="Buscar documento..."
                class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
              <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <!-- Filtro de estado -->
            <select
              v-model="receivedFilters.estado"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos los estados</option>
              <option value="myTurn">Mi Turno</option>
              <option value="waiting">En Espera</option>
              <option value="completed">Completados</option>
            </select>

            <!-- Filtro de fecha -->
            <input
              v-model="receivedFilters.fecha"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >

            <!-- Limpiar filtros -->
            <button
              @click="clearReceivedFilters"
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <!-- TABLA DE DATOS RECIBIDOS -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enviado por</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recibido</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expira</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="doc in paginatedReceivedDocuments" :key="doc.documentId" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ doc.documentName }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ doc.emisor.name }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <ReceivedStatusBadge :status="doc.userStatus.status" :display="doc.userStatus.statusDisplay" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(doc.receivedAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <ExpirationCell :expires-at="doc.expiresAt" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <ReceivedActions
                    :document="doc"
                    @sign="handleSign"
                    @preview="handlePreview"
                    @download="handleDownload"
                    @remove-from-view="handleRemoveFromView"
                    @view-details="handleViewDetails"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Pagination
            :current-page="receivedPagination.page"
            :total-items="filteredReceivedDocuments.length"
            :per-page="receivedPagination.perPage"
            @page-change="handleReceivedPageChange"
            @previous-page="handleReceivedPreviousPage"
            @next-page="handleReceivedNextPage"
          />
        </div>
      </div>

      <!-- 📋 TABLA DE ENVIADOS -->
      <div v-if="activeTable === 'sent'" class="bg-white rounded-lg shadow-sm border border-gray-200">

        <!-- FILTROS DE ENVIADOS -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Búsqueda por nombre -->
            <div class="relative">
              <input
                v-model="sentFilters.nombrePdf"
                type="text"
                placeholder="Buscar documento..."
                class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
              <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <!-- Filtro de estado -->
            <select
              v-model="sentFilters.estado"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos los estados</option>
              <option value="InProgress">En Progreso</option>
              <option value="Completed">Completados</option>
              <option value="Expired">Expirados</option>
              <option value="Cancelled">Cancelados</option>
            </select>

            <!-- Filtro de fecha -->
            <input
              v-model="sentFilters.fecha"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >

            <!-- Limpiar filtros -->
            <button
              @click="clearSentFilters"
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <!-- TABLA DE DATOS ENVIADOS -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progreso</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firmantes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="doc in paginatedSentDocuments" :key="doc.documentId" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ doc.documentName }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(doc.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <ProgressBar
                    :signed="doc.progress.signedCount"
                    :total="doc.progress.totalParticipants"
                    :percentage="doc.progress.completionPercentage"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <SignersCell :signers="doc.signers" :total="doc.progress.totalParticipants" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <SentStatusBadge :status="doc.status" :display="doc.statusDisplay" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <SentActions
                    :document="doc"
                    @add-users="handleAddUsers"
                    @delete="handleDeleteSent"
                    @preview="handlePreview"
                    @download="handleDownload"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Pagination
            :current-page="sentPagination.page"
            :total-items="filteredSentDocuments.length"
            :per-page="sentPagination.perPage"
            @page-change="handleSentPageChange"
            @previous-page="handleSentPreviousPage"
            @next-page="handleSentNextPage"
          />
        </div>
      </div>
    </section>

    <!-- Refresh Button -->
    <div class="fixed bottom-6 right-6">
      <button
        @click="refreshDashboard"
        :disabled="queueStore.queueLoading"
        class="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        <svg
          v-if="!queueStore.queueLoading"
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 11.416M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <svg
          v-else
          class="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </button>
    </div>

    <!-- Modales existentes (MANTENER) -->
    <UploadModalHybrid
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @upload-success="handleUploadSuccess"
    />
    <SigningModal
      v-if="showSigningModal"
      :queue="currentSigningQueue"
      @close="showSigningModal = false"
      @sign-success="handleSignSuccess"
    />
    <QueueDetailsModal
      v-if="showDetailsModal"
      :queue="currentDetailsQueue"
      @close="showDetailsModal = false"
    />

    <!-- Modal: Agregar usuarios a cola (simple) -->
    <transition name="fade">
      <div
        v-if="showAddUserModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      >
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-emerald-200 p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-xl font-semibold text-emerald-800">Agregar usuarios a la cola</h3>
              <p class="text-sm text-slate-600 mt-1">
                Busca por nombre, DNI o usuario y selecciona. Solo disponible en progreso.
              </p>
            </div>
            <button
              type="button"
              class="text-slate-500 hover:text-slate-700"
              @click="showAddUserModal = false"
              :disabled="addUserLoading"
            >
              ✕
            </button>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-semibold text-slate-800">Buscar usuarios</label>
            <input
              v-model="addUserQuery"
              type="text"
              class="w-full rounded-xl border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/40 px-4 py-3 text-slate-900 placeholder-slate-400"
              placeholder="Ej: Jeremy, 66666666"
              :disabled="addUserLoading"
              @input="searchAddUsers"
            />
            <div v-if="addUserSearching" class="text-sm text-slate-500">Buscando...</div>
            <div v-if="addUserResults.length" class="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
              <button
                v-for="user in addUserResults"
                :key="user.id"
                type="button"
                class="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-emerald-50 transition"
                @click="toggleSelectUser(user.id)"
              >
                <div>
                  <div class="font-medium text-slate-800">{{ user.fullName || user.username || user.dni }}</div>
                  <div class="text-xs text-slate-500">ID: {{ user.id }} — DNI: {{ user.dni || 'N/D' }}</div>
                </div>
                <div
                  :class="[
                    'w-4 h-4 rounded-full border',
                    addUserSelected.includes(user.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  ]"
                ></div>
              </button>
            </div>
            <div v-if="addUserSelected.length" class="flex flex-wrap gap-2 pt-1">
              <span
                v-for="id in addUserSelected"
                :key="id"
                class="inline-flex items-center bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                ID {{ id }}
                <button class="ml-2 text-emerald-700 hover:text-emerald-900" @click="toggleSelectUser(id)">✕</button>
              </span>
            </div>
            <p v-if="addUserError" class="text-sm text-red-600">{{ addUserError }}</p>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              @click="showAddUserModal = false"
              :disabled="addUserLoading"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              @click="confirmAddUsers"
              :disabled="addUserLoading"
            >
              {{ addUserLoading ? 'Agregando...' : 'Agregar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
  import { CheckCircleIcon, ClockIcon, DocumentTextIcon, ExclamationTriangleIcon, InboxIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline';
import { useDocumentsStore } from '../stores/document';
import { useToasts } from '../composables/useToasts';
import {
  createTrackedInterval,
  generateComponentId,
  useResourceCleanup,
  debounce,
  throttle
} from '../utils/performance';
import { UserService } from '../services/user.service';
import QueueCard from './QueueCard.vue';
import UploadModalHybrid from './UploadModalHybrid.vue';
import SigningModal from './SigningModal.vue';
import QueueDetailsModal from './QueueDetailsModal.vue';

// Importar nuevos componentes de tabla
import ReceivedStatusBadge from './table/ReceivedStatusBadge.vue';
import SentStatusBadge from './table/SentStatusBadge.vue';
import ProgressBar from './table/ProgressBar.vue';
import SignersCell from './table/SignersDropdownCell.vue';
import ExpirationCell from './table/ExpirationCell.vue';
import ReceivedActions from './table/ReceivedActions.vue';
import SentActions from './table/SentActions.vue';
import Pagination from './table/Pagination.vue';

const emit = defineEmits(['view-change']);

const queueStore = useDocumentsStore();
const { success, error } = useToasts();

// Métricas: basadas en endpoints /sent y /received (no en queue-dashboard)
const receivedMyTurnCount = computed(() => Number(queueStore.receivedSections?.myTurn?.count ?? 0));
const receivedWaitingCount = computed(() => Number(queueStore.receivedSections?.waiting?.count ?? 0));
const receivedCompletedCount = computed(() => Number(queueStore.receivedSections?.completed?.count ?? 0));

const sentInProgressCount = computed(() =>
  Array.isArray(queueStore.sent)
    ? queueStore.sent.filter(d => d?.status === 'InProgress').length
    : 0
);

const sentCompletedCount = computed(() =>
  Array.isArray(queueStore.sent)
    ? queueStore.sent.filter(d => d?.status === 'Completed').length
    : 0
);

const myTurnCount = computed(() => receivedMyTurnCount.value);
const inProgressCount = computed(() => receivedWaitingCount.value + sentInProgressCount.value);
const completedCount = computed(() => receivedCompletedCount.value + sentCompletedCount.value);
const totalCount = computed(() => inProgressCount.value + completedCount.value);

// ID único para tracking de resources
const componentId = generateComponentId('QueueDashboard');

// Estado principal
const activeTable = ref('received'); // 'received' | 'sent'
const showCreateModal = ref(false);
const showSigningModal = ref(false);
const showDetailsModal = ref(false);
const showAddUserModal = ref(false);

// Estado para operaciones
const currentSigningQueue = ref(null);
const currentDetailsQueue = ref(null);
const addUserQueue = ref(null);
const addUserInput = ref(''); // deprecated (text IDs), mantenemos para no romper pero no se usa
const addUserQuery = ref('');
const addUserResults = ref([]);
const addUserSelected = ref([]);
const addUserError = ref('');
const addUserLoading = ref(false);
const addUserSearching = ref(false);

// Filtros
const receivedFilters = ref({
  nombrePdf: '',
  estado: '',
  fecha: ''
});

const sentFilters = ref({
  nombrePdf: '',
  estado: '',
  fecha: ''
});

// Paginación
const receivedPagination = ref({
  page: 1,
  perPage: 10
});

const sentPagination = ref({
  page: 1,
  perPage: 10
});

// Datos de los buzones
const receivedDocuments = computed(() => queueStore.received || []);
const sentDocuments = computed(() => queueStore.sent || []);

// Datos filtrados
const filteredReceivedDocuments = computed(() => {
  let docs = [...receivedDocuments.value];

  if (receivedFilters.value.nombrePdf) {
    docs = docs.filter(doc =>
      doc.documentName.toLowerCase().includes(receivedFilters.value.nombrePdf.toLowerCase())
    );
  }

  if (receivedFilters.value.estado) {
    docs = docs.filter(doc => {
      const status = doc.userStatus?.status || '';
      if (receivedFilters.value.estado === 'myTurn') return status === 'Current' || status === 'myTurn';
      if (receivedFilters.value.estado === 'waiting') return status === 'Waiting' || status === 'waiting';
      if (receivedFilters.value.estado === 'completed') return status === 'Signed' || status === 'completed';
      return false;
    });
  }

  if (receivedFilters.value.fecha) {
    docs = docs.filter(doc =>
      doc.receivedAt?.startsWith(receivedFilters.value.fecha)
    );
  }

  return docs;
});

const filteredSentDocuments = computed(() => {
  let docs = [...sentDocuments.value];

  if (sentFilters.value.nombrePdf) {
    docs = docs.filter(doc =>
      doc.documentName.toLowerCase().includes(sentFilters.value.nombrePdf.toLowerCase())
    );
  }

  if (sentFilters.value.estado) {
    docs = docs.filter(doc => doc.status === sentFilters.value.estado);
  }

  if (sentFilters.value.fecha) {
    docs = docs.filter(doc =>
      doc.createdAt?.startsWith(sentFilters.value.fecha)
    );
  }

  return docs;
});

// Datos paginados
const paginatedReceivedDocuments = computed(() => {
  const start = (receivedPagination.value.page - 1) * receivedPagination.value.perPage;
  const end = start + receivedPagination.value.perPage;
  return filteredReceivedDocuments.value.slice(start, end);
});

const paginatedSentDocuments = computed(() => {
  const start = (sentPagination.value.page - 1) * sentPagination.value.perPage;
  const end = start + sentPagination.value.perPage;
  return filteredSentDocuments.value.slice(start, end);
});

// Métodos
function clearReceivedFilters() {
  receivedFilters.value = { nombrePdf: '', estado: '', fecha: '' };
  receivedPagination.value.page = 1;
}

function clearSentFilters() {
  sentFilters.value = { nombrePdf: '', estado: '', fecha: '' };
  sentPagination.value.page = 1;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Manejo de paginación recibidos
function handleReceivedPageChange(page) {
  receivedPagination.value.page = page;
}

function handleReceivedPreviousPage() {
  if (receivedPagination.value.page > 1) {
    receivedPagination.value.page--;
  }
}

function handleReceivedNextPage() {
  const maxPage = Math.ceil(filteredReceivedDocuments.value.length / receivedPagination.value.perPage);
  if (receivedPagination.value.page < maxPage) {
    receivedPagination.value.page++;
  }
}

// Manejo de paginación enviados
function handleSentPageChange(page) {
  sentPagination.value.page = page;
}

function handleSentPreviousPage() {
  if (sentPagination.value.page > 1) {
    sentPagination.value.page--;
  }
}

function handleSentNextPage() {
  const maxPage = Math.ceil(filteredSentDocuments.value.length / sentPagination.value.perPage);
  if (sentPagination.value.page < maxPage) {
    sentPagination.value.page++;
  }
}

// Métodos optimizados
const loadDashboard = debounce(async () => {
  try {
    await Promise.all([
      queueStore.fetchQueueDashboard(),
      queueStore.fetchReceivedDocuments(),
      queueStore.fetchSentDocuments()
    ]);
  } catch (err) {
    console.error('Error cargando dashboard:', err);
    error('No se pudo cargar el dashboard');
  }
}, 500);

const refreshDashboard = throttle(async () => {
  await loadDashboard();
  success('Dashboard actualizado');
}, 1000);

// Manejadores de eventos
function openCreateModal() {
  showCreateModal.value = true;
}

function handleUploadSuccess() {
  success('Documento creado exitosamente');
  loadDashboard();
}

function handleSign(queue) {
  currentSigningQueue.value = queue;
  showSigningModal.value = true;
}

function handleSignSuccess() {
  success('Documento firmado exitosamente');
  loadDashboard();
  currentSigningQueue.value = null;
}

async function handleDownload(queue) {
  try {
    const blob = await queueStore.downloadDocument(queue.documentId, queue.queueId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = queue.documentName || `documento_${queue.queueId}`;
    a.download = /\.pdf$/i.test(baseName) ? baseName : `${baseName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    success('Documento descargado exitosamente');
  } catch (err) {
    console.error('Error descargando documento:', err);
    error('No se pudo descargar el documento');
  }
}

async function handlePreview(queue) {
  try {
    const blob = await queueStore.downloadDocument(queue.documentId, queue.queueId);
    const pdfBlob = blob?.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(pdfBlob);

    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win && !document.hasFocus()) {
      error('Tu navegador bloqueó la previsualización. Permite popups para abrir el PDF.');
    }

    setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    console.error('Error previsualizando documento:', err);
    error('No se pudo abrir el documento');
  }
}

async function handleHide(queue) {
  try {
    await queueStore.hideQueueFromView(queue.queueId);
    success('Cola ocultada de la vista');
    loadDashboard();
  } catch (err) {
    console.error('Error ocultando cola:', err);
    error('No se pudo ocultar la cola');
  }
}

async function handleRemoveFromView(queue) {
  if (!queue?.queueId) return;
  if (!confirm('Eliminar este documento de tu vista?')) return;

  try {
    await queueStore.hideQueueFromView(queue.queueId);
    success('Documento eliminado de tu vista');
    loadDashboard();
  } catch (err) {
    console.error('Error eliminando de la vista:', err);
    error('No se pudo eliminar de tu vista');
  }
}

function handleAddUsers(queue) {
  addUserQueue.value = queue;
  addUserInput.value = '';
  addUserQuery.value = '';
  addUserResults.value = [];
  addUserSelected.value = [];
  addUserError.value = '';
  showAddUserModal.value = true;
}

async function confirmAddUsers() {
  if (!addUserQueue.value?.queueId) return;
  addUserError.value = '';

  const ids = addUserSelected.value.filter(id => Number.isInteger(id) && id > 0);
  if (ids.length === 0) {
    addUserError.value = 'Selecciona al menos un usuario.';
    return;
  }

  addUserLoading.value = true;
  try {
    await queueStore.addParticipantsToQueue(addUserQueue.value.queueId, ids);
    success('Usuarios agregados a la cola');
    showAddUserModal.value = false;
    addUserQueue.value = null;
    addUserInput.value = '';
    addUserQuery.value = '';
    addUserResults.value = [];
    addUserSelected.value = [];
    loadDashboard();
  } catch (err) {
    console.error('Error agregando usuarios:', err);
    addUserError.value = err.message || 'No se pudo agregar usuarios.';
  } finally {
    addUserLoading.value = false;
  }
}

const searchAddUsers = debounce(async () => {
  const q = addUserQuery.value.trim();
  addUserError.value = '';
  if (q.length < 2) {
    addUserResults.value = [];
    return;
  }
  addUserSearching.value = true;
  try {
    addUserResults.value = await UserService.search(q, { limit: 10 });
  } catch (err) {
    console.error('Error buscando usuarios:', err);
    addUserError.value = 'No se pudo buscar usuarios.';
    addUserResults.value = [];
  } finally {
    addUserSearching.value = false;
  }
}, 300);

function toggleSelectUser(userId) {
  if (!userId) return;
  const idx = addUserSelected.value.indexOf(userId);
  if (idx >= 0) {
    addUserSelected.value.splice(idx, 1);
  } else {
    addUserSelected.value.push(userId);
  }
}

async function handleCancel(queue) {
  if (confirm(`¿Estás seguro de cancelar la cola "${queue.documentName}"? Esta acción no se puede deshacer.`)) {
    try {
      await queueStore.cancelQueue(queue.queueId);
      success('Cola cancelada exitosamente');
      loadDashboard();
    } catch (err) {
      console.error('Error cancelando cola:', err);
      error('No se pudo cancelar la cola');
    }
  }
}

function handleViewDetails(queue) {
  currentDetailsQueue.value = queue;
  showDetailsModal.value = true;
}

async function handleDeleteSent(queue) {
  if (!queue?.queueId) return;
  if (confirm(`¿Estás seguro de eliminar la cola "${queue.documentName}"?`)) {
    try {
      await queueStore.cancelQueue(queue.queueId);
      success('Documento eliminado');
      loadDashboard();
    } catch (err) {
      console.error('Error eliminando cola:', err);
      error('No se pudo eliminar el documento');
    }
  }
}

// Lifecycle con cleanup automático
onMounted(async () => {
  // Cargar dashboard al montar
  await loadDashboard();

  // Setup cleanup automático
  useResourceCleanup(componentId);
});

// Exponer método para que el componente padre pueda refrescar
defineExpose({
  refreshDashboard,
  loadDashboard
});
</script>

<style scoped>
.queue-dashboard {
  min-height: 100vh;
  padding: 1rem;
}

.metric-card {
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Animaciones de entrada */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.urgent-section,
.tables-section {
  animation: fadeIn 0.5s ease-out;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-header .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard-header .grid {
    grid-template-columns: 1fr;
  }
}
</style>
