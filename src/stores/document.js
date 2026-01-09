// src/stores/document.js
import { defineStore } from "pinia";
import { DocumentService, mapDtoToItem } from "../services/document.service";
import { queueService } from "../services/queue.service";
import { UserService } from "../services/user.service";
import { useAuthStore } from "./auth";
import { MIGRATION_CONFIG } from "../config/featureFlags";
import {
  withMutex,
  createDebouncedFunction,
  RequestTracker,
  OperationQueue,
  TimedCache
} from "../utils/concurrency";

// Instancias globales para control de concurrencia
const requestTracker = new RequestTracker();
const dashboardQueue = new OperationQueue();
const cache = new TimedCache(50, 300000); // 50 items, 5 min TTL

export const useDocumentsStore = defineStore("documents", {
  state: () => ({
    // === SISTEMA ACTUAL (MANTENER) ===
    loading: false,
    received: [],      // Docs 1-a-1 recibidos
    sent: [],          // Docs 1-a-1 enviados
    filters: {
      nombrePdf: "",
      estadoReceived: "", // ""|"pendiente"|"firmado"
      estadoSent: "",
      fecha: "",          // YYYY-MM-DD
      fechaSent: "",
    },

    // === ADMIN (MANTENER) ===
    adminSummaryLoading: false,
    adminSummary: {
      totalDocs: 0,
      pendientes: 0,
      firmados: 0,
      enviadosHoy: 0,
      recibidosHoy: 0,
      usuariosActivos: 0,
      usuariosEliminados: 0,
      ultAct: null,
    },

    // === NUEVO SISTEMA DE COLAS ===
    queueLoading: false,
    queues: {
      // Dashboard principal
      createdQueues: [],    // Colas creadas por usuario (emisor)
      signingQueues: [],    // Colas donde firma (firmante)

      // Secciones dinámicas del dashboard
      myTurnQueues: [],     // Colas donde es su turno (urgente)
      waitingQueues: [],    // Colas esperando turno
      completedQueues: [],  // Colas completadas

      // Control de visibilidad
      hiddenQueues: []      // Colas ocultas por usuario
    },

    // Metadata del dashboard de colas
    queueMetrics: {
      myTurnCount: 0,
      urgentCount: 0,
      completedCount: 0,
      totalCount: 0
    },

    // Secciones explícitas para recibidos (NUEVO)
    receivedSections: {
      myTurn: {
        documents: [],
        count: 0
      },
      waiting: {
        documents: [],
        count: 0
      },
      completed: {
        documents: [],
        count: 0
      }
    },

    // Estado de modales y vistas
    ui: {
      showQueueDashboard: false,
      showLegacyWarning: true,
      currentView: 'legacy' // 'legacy' | 'queue'
    }
  }),

  getters: {
    // Id de usuario logueado (MANTENER EXISTENTE)
    currentUserId: () => {
      const auth = useAuthStore();
      const id = auth.user?.id ?? auth.user?.Id ?? null;
      return typeof id === "string" ? Number(id) : id;
    },

    // === NUEVOS GETTERS PARA SISTEMA DE COLAS (usando composable) ===

    // Verificar si sistema de colas está habilitado
    isQueueSystemEnabled: () => MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED,

    // Verificar si puede usar múltiples firmantes
    canUseMultiSigners: () =>
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.QUEUE_FEATURES.MULTI_SIGNERS,

    // Verificar si puede gestionar participantes
    canManageParticipants: () =>
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.QUEUE_FEATURES.DYNAMIC_PARTICIPANTS,

    // Verificar si tiene vistas basadas en roles
    hasRoleBasedViews: () =>
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.QUEUE_FEATURES.ROLE_BASED_VIEWS,

    // Verificar si puede ocultar/mostrar colas
    canHideShowQueues: () =>
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES,

    // Verificar si puede cancelar colas
    canCancelQueues: () =>
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.QUEUE_FEATURES.CANCEL_QUEUES,

    // Métricas del dashboard de colas
    hasUrgentQueues: (state) => state.queueMetrics.urgentCount > 0,
    pendingSignatures: (state) => state.queueMetrics.myTurnCount,
    queueCompletionRate: (state) => {
      const total = state.queues.createdQueues.length + state.queues.signingQueues.length;
      if (total === 0) return 0;
      return (state.queues.completedQueues.length / total) * 100;
    },

    // Vista actual del usuario
    shouldShowQueueView: (state) =>
      state.ui.currentView === 'queue' &&
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED,

    // Vista del dashboard legacy
    shouldShowLegacyView: (state) =>
      state.ui.currentView === 'legacy' &&
      MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED,

    // Advertencia de sistema antiguo
    shouldShowLegacyWarning: (state) =>
      state.ui.showLegacyWarning &&
      MIGRATION_CONFIG.UI_SETTINGS.SHOW_LEGACY_WARNING &&
      MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED,

    // Toggle para dashboard dual
    canToggleDashboard: () =>
      MIGRATION_CONFIG.UI_SETTINGS.SHOW_DASHBOARD_TOGGLE &&
      MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
      MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED,

    // Verificar si el usuario está en modo de migración forzada
    isMigrationForced: () => MIGRATION_CONFIG.MIGRATION_MODE === 'forced',

    // Verificar si el modo de migración es opt-in
    isMigrationOptIn: () => MIGRATION_CONFIG.MIGRATION_MODE === 'opt-in',

    // Helper para determinar qué vista mostrar por defecto
    defaultView: () => {
      if (MIGRATION_CONFIG.MIGRATION_MODE === 'forced' ||
          MIGRATION_CONFIG.UI_SETTINGS.DEFAULT_TO_QUEUE_VIEW) {
        return 'queue';
      }
      return 'legacy';
    }
  },

  actions: {
    // =========================
    // Usuario - Recibidos/Enviados
    // =========================
    async fetchReceived() {
      if (!this.currentUserId) return;
      this.loading = true;
      try {
        const data = await DocumentService.listByUser({
          userId: this.currentUserId,
          received: true,
          filtros: {
            nombrePdf: this.filters.nombrePdf || undefined,
            estado: this.filters.estadoReceived || undefined,
            fechaInicio: this.filters.fecha || undefined,
            fechaFin: this.filters.fecha || undefined,
          },
        });
        this.received = data.map(d => mapDtoToItem(d, this.currentUserId));
      } finally {
        this.loading = false;
      }
    },

    async fetchSent() {
      if (!this.currentUserId) return;
      this.loading = true;
      try {
        const data = await DocumentService.listByUser({
          userId: this.currentUserId,
          received: false,
          filtros: {
            nombrePdf: this.filters.nombrePdf || undefined,
            estado: this.filters.estadoSent || undefined,
            fechaInicio: this.filters.fechaSent || undefined,
            fechaFin: this.filters.fechaSent || undefined,
          },
        });
        this.sent = data.map(d => mapDtoToItem(d, this.currentUserId));
      } finally {
        this.loading = false;
      }
    },

    // =========================
    // Admin - Dashboard (resúmenes rápidos)
    // =========================
    /**
     * Carga métricas rápidas para las tarjetas del Dashboard Admin.
     * Acepta un rango opcional {fechaInicio, fechaFin} en formato YYYY-MM-DD
     * para acotar "pendientes/firmados" y calcular "enviadosHoy".
     */
    async fetchAdminSummary({ fechaInicio, fechaFin } = {}) {
      this.adminSummaryLoading = true;
      try {
        // 1) Documentos del sistema (usamos tu /api/documents existente)
        //    Aplica filtros si se pasan (estado, fechas) — ya soportado en listAll.
        const allDocs = await DocumentService.listAll({
          fechaInicio,
          fechaFin,
          includeDeleted: false,
        }); // GET /api/documents (Admin) :contentReference[oaicite:3]{index=3}

        // Conteos básicos
        const totalDocs = allDocs.length;
        const pendientes = allDocs.filter(d => (d.estado ?? d.Estado) === "pendiente").length;
        const firmados = allDocs.filter(d => (d.estado ?? d.Estado) === "firmado").length;

        // "enviadosHoy": contamos por fecha de creación igual a hoy (server/date string "YYYY-MM-DD")
        const todayStr = new Date().toISOString().slice(0, 10);
        const enviadosHoy = allDocs.filter(d => {
          const f = (d.fecha ?? d.Fecha ?? d.createdAt ?? d.CreatedAt ?? "").toString().slice(0,10);
          return f === todayStr;
        }).length;

        // si deseas un "recibidosHoy" simple, toma los que cambian de destinatario hoy (si tu DTO lo trae);
        // por ahora lo dejamos igual a enviadosHoy para no inventar backend.
        const recibidosHoy = enviadosHoy;

        // 2) Usuarios del sistema (activos vs eliminados)
        const users = await UserService.list({ includeDeleted: true }); // GET /api/users/list :contentReference[oaicite:4]{index=4}
        const usuariosEliminados = users.filter(u => Boolean(u.isDeleted ?? u.IsDeleted ?? false)).length;
        const usuariosActivos = users.length - usuariosEliminados;

        this.adminSummary = {
          totalDocs,
          pendientes,
          firmados,
          enviadosHoy,
          recibidosHoy,
          usuariosActivos,
          usuariosEliminados,
          ultAct: Date.now(),
        };
      } finally {
        this.adminSummaryLoading = false;
      }
    },

    resetAdminSummary() {
      this.adminSummary = {
        totalDocs: 0,
        pendientes: 0,
        firmados: 0,
        enviadosHoy: 0,
        recibidosHoy: 0,
        usuariosActivos: 0,
        usuariosEliminados: 0,
        ultAct: null,
      };
    },

    // =========================
    // SISTEMA DE COLAS - NUEVAS ACCIONES
    // =========================

    /**
     * Crear cola con múltiples firmantes
     */
    async createQueueWithParticipants(queueData) {
      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        throw new Error('Sistema de colas no habilitado. Use el sistema tradicional.');
      }

      if (!MIGRATION_CONFIG.QUEUE_FEATURES.MULTI_SIGNERS) {
        throw new Error('Funcionalidad de múltiples firmantes no habilitada.');
      }

      return withMutex('createQueueWithParticipants', async () => {
        this.queueLoading = true;
        try {
          const result = await queueService.createQueue(queueData);

          // Optimistic update: reflect the new queue immediately in UI (sent + createdQueues)
          try {
            const createdQueue = result?.queue || result?.data?.queue || null;
            const createdDocument = result?.document || result?.data?.document || null;

            if (createdQueue?.queueId) {
              const mappedQueue = this.mapQueueItems([createdQueue])[0];
              if (!this.queues.createdQueues.some(q => String(q.queueId) === String(mappedQueue.queueId))) {
                this.queues.createdQueues = [mappedQueue, ...this.queues.createdQueues];
              }

              const totalParticipants = createdQueue.totalParticipants || createdQueue.participants?.length || 0;
              const signedCount = createdQueue.participants?.filter(p => p?.status === 'Signed')?.length || 0;
              const pendingCount = Math.max(0, totalParticipants - signedCount);
              const completionPercentage = totalParticipants > 0 ? Math.round((signedCount / totalParticipants) * 100) : 0;

              const sentDoc = {
                queueId: createdQueue.queueId,
                documentId: createdQueue.documentId || createdDocument?.id,
                documentName: createdQueue.documentName || createdDocument?.nombrePDF || queueData?.nombrePDF || 'Documento',
                createdAt: createdQueue.createdAt || createdDocument?.createdAt || new Date().toISOString(),
                status: createdQueue.status || 'InProgress',
                statusDisplay: createdQueue.status || 'InProgress',
                signers: createdQueue.participants || [],
                progress: { totalParticipants, signedCount, pendingCount, completionPercentage }
              };

              this.sent = [sentDoc, ...this.sent.filter(d => String(d.queueId) !== String(sentDoc.queueId))];
            }
          } catch (e) {
            console.warn('Optimistic UI update failed:', e?.message || e);
          }

          // Invalidar cache forzar actualización
          cache.delete('queueDashboard');

          // Actualizar dashboard después de crear
          try { await this.fetchQueueDashboard(); } catch (e) { console.warn('No se pudo refrescar el dashboard tras crear la cola:', e?.message || e); }

          return result;
        } catch (error) {
          console.error('Error creando cola:', error);
          throw error;
        } finally {
          this.queueLoading = false;
        }
      });
    },

    /**
     * Cargar dashboard principal de colas
     */
    async fetchQueueDashboard() {
      return withMutex('fetchQueueDashboard', async () => {
        if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
          console.log('Sistema de colas no habilitado, omitiendo carga de dashboard');
          return;
        }

        if (!MIGRATION_CONFIG.QUEUE_FEATURES.ROLE_BASED_VIEWS) {
          console.log('Vistas por rol no habilitadas, omitiendo carga de dashboard');
          return;
        }

        this.queueLoading = true;

        try {
          // Verificar cache primero
          const cacheKey = 'queueDashboard';
          const cached = cache.get(cacheKey);
          if (cached) {
            this.updateQueuesFromResponse(cached);
            this.queueLoading = false;
            return;
          }

          const response = await queueService.getQueueDashboard();

          // Guardar en cache
          cache.set(cacheKey, response);

          // Actualizar estado principal
          this.queues.createdQueues = this.mapQueueItems(response.createdQueues || []);
          this.queues.signingQueues = this.mapQueueItems(response.signingQueues || []);

          // Actualizar secciones dinámicas
          this.queues.myTurnQueues = this.queues.signingQueues.filter(q => q.isMyTurn) || [];
          this.queues.waitingQueues = this.queues.signingQueues.filter(q => !q.isMyTurn && q.status === 'InProgress') || [];
          this.queues.completedQueues = [
            ...this.queues.createdQueues.filter(q => q.status === 'Completed'),
            ...this.queues.signingQueues.filter(q => q.status === 'Completed')
          ];

          // Actualizar métricas
          this.queueMetrics.myTurnCount = this.queues.myTurnQueues.length;
          this.queueMetrics.createdCount = this.queues.createdQueues.length;
          this.queueMetrics.signingCount = this.queues.signingQueues.length;
          this.queueMetrics.waitingCount = this.queues.waitingQueues.length;
          this.queueMetrics.completedCount = this.queues.completedQueues.length;
          this.queueMetrics.hiddenCount = this.queues.hiddenQueues.length;

      } catch (error) {
        // ⚠️ CORRECCIÓN CRÍTICA: Manejo robusto de errores
        console.error('❌ Error crítico cargando dashboard de colas:', error);

        // Informar al usuario del problema (no silenciar)
        const errorMessage = error.response?.data?.message ||
                           error.message ||
                           'Error al cargar el dashboard';

        // Guardar error para UI
        this.lastError = {
          type: 'dashboard_load_failed',
          message: errorMessage,
          timestamp: Date.now(),
          critical: true
        };

        // Resetear estado a valores seguros
        this.resetQueues();

        // EN PRODUCCIÓN: Relanzar para error boundary
        // EN DESARROLLO: Mostrar error detallado
        if (process.env.NODE_ENV === 'development') {
          console.error('Stack trace completo:', error.stack);
          throw new Error(`Dashboard error: ${errorMessage}`);
        } else {
          // En producción, al menos notificar el fallo
          console.warn('Dashboard falló - estado reseteado para proteger datos');
        }
      } finally {
        this.queueLoading = false;
      }
      }); // Cierre del withMutex
    },

    /**
     * Firmar turno actual en una cola
     */
    async signCurrentTurn(queueId, signedPdfData) {
      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        throw new Error('Sistema de colas no habilitado.');
      }

      this.queueLoading = true;
      try {
        const result = await queueService.signCurrentTurn(queueId, signedPdfData);

        // Refrescar dashboard después de firmar
        await this.fetchQueueDashboard();

        return result;
      } catch (error) {
        console.error('Error firmando documento:', error);
        throw error;
      } finally {
        this.queueLoading = false;
      }
    },

    /**
     * Agregar participantes a una cola existente
     */
    async addParticipantsToQueue(queueId, newUsers) {
      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        throw new Error('Sistema de colas no habilitado.');
      }

      if (!MIGRATION_CONFIG.QUEUE_FEATURES.DYNAMIC_PARTICIPANTS) {
        throw new Error('Gestión dinámica de participantes no habilitada.');
      }

      try {
        const result = await queueService.addParticipants(queueId, newUsers);

        // Refrescar dashboard después de agregar participantes
        await this.fetchQueueDashboard();

        return result;
      } catch (error) {
        console.error('Error agregando participantes:', error);
        throw error;
      }
    },

    /**
     * Descargar documento (compatible con ambos sistemas)
     */
    async downloadDocument(documentId, queueId = null) {
      try {
        if (queueId && MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
          // Usar QueueService con validación de permisos
          return await queueService.downloadDocument(documentId, queueId);
        } else {
          // Usar DocumentService tradicional
          return await DocumentService.download(documentId);
        }
      } catch (error) {
        console.error('Error descargando documento:', error);
        throw error;
      }
    },

    /**
     * Ocultar cola de la vista
     */
    async hideQueueFromView(queueId) {
      if (!MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES) {
        throw new Error('Funcionalidad de ocultar/mostrar colas no habilitada.');
      }

      try {
        const result = await queueService.hideQueueFromView(queueId);

        // Actualizar lista de colas ocultas
        await this.fetchHiddenQueues();

        return result;
      } catch (error) {
        console.error('Error ocultando cola:', error);
        throw error;
      }
    },

    /**
     * Mostrar cola oculta
     */
    async showHiddenQueue(queueId) {
      if (!MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES) {
        throw new Error('Funcionalidad de ocultar/mostrar colas no habilitada.');
      }

      try {
        const result = await queueService.showHiddenQueue(queueId);

        // Actualizar lista de colas ocultas
        await this.fetchHiddenQueues();

        return result;
      } catch (error) {
        console.error('Error mostrando cola:', error);
        throw error;
      }
    },

    /**
     * Obtener colas ocultas
     */
    async fetchHiddenQueues() {
      if (!MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES) {
        return;
      }

      try {
        const response = await queueService.getHiddenQueues();
        this.queues.hiddenQueues = response.hiddenQueues || [];
      } catch (error) {
        console.error('Error obteniendo colas ocultas:', error);
      }
    },

    /**
     * Cancelar cola (solo emisor)
     */
    async cancelQueue(queueId) {
      if (!MIGRATION_CONFIG.QUEUE_FEATURES.CANCEL_QUEUES) {
        throw new Error('Funcionalidad de cancelación de colas no habilitada.');
      }

      try {
        const result = await queueService.cancelQueue(queueId);

        // Refrescar dashboard después de cancelar
        await this.fetchQueueDashboard();

        return result;
      } catch (error) {
        console.error('Error cancelando cola:', error);
        throw error;
      }
    },

    /**
     * Cambiar vista entre legacy y queue system
     */
    setView(view) {
      if (view === 'legacy' || view === 'queue') {
        this.ui.currentView = view;

        // Cargar datos correspondientes a la vista
        if (view === 'queue') {
          this.fetchQueueDashboard();
        } else {
          // En vista legacy, cargar datos tradicionales si no están cargados
          if (this.received.length === 0) this.fetchReceived();
          if (this.sent.length === 0) this.fetchSent();
        }
      }
    },

    
    /**
     * ENDPOINT 11: Obtener documentos enviados (vista emisor)
     * GET /api/documents/sent
     */
    async fetchSentDocuments() {
      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        throw new Error('Sistema de colas no habilitado.');
      }

      this.queueLoading = true;
      try {
        const response = await queueService.getSentDocuments();

        // Procesar documentos enviados con datos enriquecidos
        const sentDocs = response?.documents || response?.data?.documents || [];
        this.sent = sentDocs.map(doc => {
          const signers = Array.isArray(doc.signers) ? doc.signers : [];
          const signedCount = signers.filter(s => s.status === 'Signed').length;
          const totalFromProgress = Number.isFinite(doc.progress?.totalParticipants) ? doc.progress.totalParticipants : 0;
          const totalParticipants = Math.max(totalFromProgress, signers.length);
          const pendingCount = Math.max(0, totalParticipants - signedCount);
          const completionPercentage = totalParticipants > 0
            ? Math.round((signedCount / totalParticipants) * 100)
            : 0;

          return {
            ...doc,
            queueId: doc.queueId,
            documentId: doc.documentId,
            progress: {
              totalParticipants,
              signedCount,
              pendingCount,
              completionPercentage
            }
          };
        });

        console.log(`✅ Cargados ${this.sent.length} documentos enviados`);
        return response;
      } catch (error) {
        console.error('❌ Error obteniendo documentos enviados:', error);
        this.sent = []; // Limpiar en caso de error
        throw error;
      } finally {
        this.queueLoading = false;
      }
    },

    /**
     * ENDPOINT 12: Obtener documentos recibidos (vista firmante)
     * GET /api/documents/received
     */
    async fetchReceivedDocuments() {
      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        throw new Error('Sistema de colas no habilitado.');
      }

      this.queueLoading = true;
      try {
        const response = await queueService.getReceivedDocuments();

        // Procesar documentos recibidos por secciones
        const sections = response?.sections || response?.data?.sections || {};
        const allReceivedDocs = [
          ...(sections.myTurn?.documents || []),
          ...(sections.waiting?.documents || []),
          ...(sections.completed?.documents || [])
        ];

        // Enriquecer cada documento con metadatos adicionales
        this.received = allReceivedDocs.map(doc => ({
          ...doc,
          // Asegurar compatibilidad con formato existente
          queueId: doc.queueId,
          documentId: doc.documentId,
          // Enriquecer con datos de sección
          section: this.getDocumentSection(doc, sections),
          // Datos de urgencia
          urgency: this.getDocumentUrgency(doc)
        }));

        // Actualizar contadores de secciones
        this.receivedSections = {
          myTurn: {
            documents: sections.myTurn?.documents || [],
            count: sections.myTurn?.count || 0
          },
          waiting: {
            documents: sections.waiting?.documents || [],
            count: sections.waiting?.count || 0
          },
          completed: {
            documents: sections.completed?.documents || [],
            count: sections.completed?.count || 0
          }
        };

        console.log(`✅ Cargados ${this.received.length} documentos recibidos (MiTurno: ${this.receivedSections.myTurn.count}, Espera: ${this.receivedSections.waiting.count}, Completados: ${this.receivedSections.completed.count})`);
        return response;
      } catch (error) {
        console.error('❌ Error obteniendo documentos recibidos:', error);
        this.received = []; // Limpiar en caso de error
        this.receivedSections = { myTurn: { documents: [], count: 0 }, waiting: { documents: [], count: 0 }, completed: { documents: [], count: 0 } };
        throw error;
      } finally {
        this.queueLoading = false;
      }
    },

    /**
     * Determina en qué sección está un documento recibido
     */
    getDocumentSection(document, sections) {
      if (sections.myTurn?.documents?.some(doc => doc.documentId === document.documentId)) {
        return 'myTurn';
      }
      if (sections.waiting?.documents?.some(doc => doc.documentId === document.documentId)) {
        return 'waiting';
      }
      if (sections.completed?.documents?.some(doc => doc.documentId === document.documentId)) {
        return 'completed';
      }
      return 'unknown';
    },

    /**
     * Calcula información de urgencia para un documento
     */
    getDocumentUrgency(document) {
      if (!document.expiresAt) {
        return { isUrgent: false, hoursRemaining: null, status: 'no-expiration' };
      }

      const now = new Date();
      const expiresAt = new Date(document.expiresAt);
      const hoursUntil = (expiresAt - now) / (1000 * 60 * 60);

      return {
        isUrgent: hoursUntil <= 24 && hoursUntil > 0,
        isExpired: hoursUntil <= 0,
        hoursRemaining: Math.max(0, Math.floor(hoursUntil)),
        status: hoursUntil <= 0 ? 'expired' : hoursUntil <= 24 ? 'urgent' : 'normal'
      };
    },

    /**
     * Resetear estado de colas (útil para logout)
     */
    resetQueueState() {
      this.queues = {
        createdQueues: [],
        signingQueues: [],
        myTurnQueues: [],
        waitingQueues: [],
        completedQueues: [],
        hiddenQueues: []
      };

      this.queueMetrics = {
        myTurnCount: 0,
        urgentCount: 0,
        completedCount: 0,
        totalCount: 0
      };

      // Resetear buzones (NUEVO)
      this.received = [];
      this.sent = [];
      this.receivedSections = {
        myTurn: { documents: [], count: 0 },
        waiting: { documents: [], count: 0 },
        completed: { documents: [], count: 0 }
      };

      this.ui = {
        showQueueDashboard: false,
        showLegacyWarning: true,
        currentView: this.defaultView  // ✅ CORRECCIÓN: Getter sin paréntesis
      };
    },

    /**
     * Inicializar vista según configuración de migración
     */
    initializeView() {
      // Si está en modo forzado o configurado para default queue, usar queue
      if (this.isMigrationForced() || this.defaultView === 'queue') {
        this.setView('queue');
      } else {
        this.setView('legacy');
      }
    },

    /**
     * Obtener estado de migración actual (para debugging/monitoring)
     */
    getMigrationStatus() {
      return {
        currentView: this.ui.currentView,
        queueSystemEnabled: MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED,
        legacySystemEnabled: MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED,
        migrationMode: MIGRATION_CONFIG.MIGRATION_MODE,
        featuresEnabled: MIGRATION_CONFIG.QUEUE_FEATURES,
        queueMetrics: this.queueMetrics,
        documentCounts: {
          legacyReceived: this.received.length,
          legacySent: this.sent.length,
          queueCreated: this.queues.createdQueues.length,
          queueSigning: this.queues.signingQueues.length,
          queueHidden: this.queues.hiddenQueues.length
        }
      };
    },

    /**
     * Validar configuración actual de feature flags
     */
    validateMigrationConfiguration() {
      const warnings = [];
      const errors = [];

      // Validaciones críticas
      if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED && !MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED) {
        errors.push('Ambos sistemas están deshabilitados - al menos uno debe estar activo');
      }

      if (MIGRATION_CONFIG.MIGRATION_MODE === 'forced' && MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED) {
        warnings.push('Modo forzado activo pero sistema legacy habilitado - puede causar confusión');
      }

      if (!MIGRATION_CONFIG.UI_SETTINGS.SHOW_DASHBOARD_TOGGLE &&
          MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED &&
          MIGRATION_CONFIG.LEGACY_SYSTEM_ENABLED &&
          MIGRATION_CONFIG.MIGRATION_MODE === 'opt-in') {
        warnings.push('Modo opt-in sin toggle visible - usuarios no podrán cambiar de sistema');
      }

      // Validaciones de características
      const requiredFeatures = ['MULTI_SIGNERS', 'ROLE_BASED_VIEWS'];
      const missingFeatures = requiredFeatures.filter(feature =>
        !MIGRATION_CONFIG.QUEUE_FEATURES[feature]
      );

      if (missingFeatures.length > 0 && MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        warnings.push(`Características faltantes que pueden limitar funcionalidad: ${missingFeatures.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        configuration: MIGRATION_CONFIG
      };
    },

    /**
     * Toggle de vista (si está habilitado)
     */
    toggleView() {
      if (!this.canToggleDashboard) {
        return;
      }

      this.ui.currentView = this.ui.currentView === 'legacy' ? 'queue' : 'legacy';
    },

    /**
     * Resetear estado de colas
     */
    resetQueues() {
      this.queues.createdQueues = [];
      this.queues.signingQueues = [];
      this.queues.myTurnQueues = [];
      this.queues.waitingQueues = [];
      this.queues.completedQueues = [];
      this.queues.hiddenQueues = [];

      this.queueMetrics = {
        myTurnCount: 0,
        urgentCount: 0,
        completedCount: 0,
        totalCount: 0
      };
    },
    /**
     * Mapea items de colas desde API a formato consistente
     * @param {Array} queues - Array de colas del API
     * @returns {Array} Colas mapeadas
     */
    mapQueueItems(queues) {
      if (!Array.isArray(queues)) return [];

      return queues.map(queue => ({
        ...queue,
        // Normalizar nombres de propiedades
        documentName: queue.document?.nombrePDF || queue.nombrePDF || queue.documentName || 'Documento',

        // Calcular participantes firmados
        signedParticipants: queue.participants?.filter(p =>
          p.status === 'Signed' || p.signed || p.firmado || p.firmado === true
        ).length || 0,

        // Determinar si es turno actual
        isMyTurn: queue.isMyTurn || queue.urgents || false,

        // Asegurar estado consistente
        status: queue.status || 'Pending',

        // Metadata útil
        createdAt: queue.createdAt || new Date().toISOString(),
        updatedAt: queue.updatedAt || new Date().toISOString()
      }));
    },

    /**
     * Actualiza estado de colas desde respuesta API
     * @param {Object} response - Respuesta del API
     */
    updateQueuesFromResponse(response) {
      if (!response) return;

      // Actualizar cada tipo de cola usando los helpers existentes
      if (response.createdQueues) {
        this.queues.createdQueues = this.mapQueueItems(response.createdQueues);
      }
      if (response.signingQueues) {
        this.queues.signingQueues = this.mapQueueItems(response.signingQueues);
      }

      // Actualizar secciones dinámicas
      this.queues.myTurnQueues = this.queues.signingQueues.filter(q => q.isMyTurn) || [];
      this.queues.waitingQueues = this.queues.signingQueues.filter(q => !q.isMyTurn && q.status === 'InProgress') || [];
      this.queues.completedQueues = [
        ...this.queues.createdQueues.filter(q => q.status === 'Completed'),
        ...this.queues.signingQueues.filter(q => q.status === 'Completed')
      ];

      // Actualizar métricas
      this.queueMetrics.myTurnCount = this.queues.myTurnQueues.length;
      this.queueMetrics.createdCount = this.queues.createdQueues.length;
      this.queueMetrics.signingCount = this.queues.signingQueues.length;
      this.queueMetrics.waitingCount = this.queues.waitingQueues.length;
      this.queueMetrics.completedCount = this.queues.completedQueues.length;
      this.queueMetrics.hiddenCount = this.queues.hiddenQueues.length;
      this.queueMetrics.totalCount = this.queues.createdQueues.length + this.queues.signingQueues.length;
    }
  },

  getters: {
    // Métricas del dashboard de colas (MIGRACIÓN)
    // NOTA: currentUserId se mantiene en la definición principal (línea 82) para evitar duplicación
    queueMetrics: (state) => ({
      ...state.queueMetrics,
      hasUrgentQueues: (state.queueMetrics?.myTurnCount || 0) > 0,
      pendingSignatures: state.queueMetrics?.myTurnCount || 0,
      completionRate: (state.queueMetrics?.totalCount || 0) === 0
        ? 0
        : Math.round((state.queueMetrics?.completedCount || 0) / (state.queueMetrics?.totalCount || 1) * 100),
    })
  }
});
