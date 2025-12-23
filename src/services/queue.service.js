/**
 * Queue Service - Sistema de Gestión de Colas de Firma Secuencial
 * Implementa endpoints del nuevo sistema manteniendo compatibilidad
 * Fase 3.3: Integración con backend real
 */

import { integrationService } from "./integration.service";
import api from "./api";
import { MIGRATION_CONFIG } from "../config/featureFlags";
import { QUEUE_ENDPOINTS } from "../config/api.config";
import {
  sanitizeFilename,
  validatePDFBase64,
  validateId
} from "../utils/security";

export class QueueService {

  /**
   * ENDPOINT 1: Crear cola con múltiples firmantes
   * POST /api/documents/create-with-queue
   */
  async createQueue(documentData) {
    // Verificar si el sistema de colas está habilitado
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado. Use el sistema tradicional.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.MULTI_SIGNERS) {
      throw new Error('Funcionalidad de múltiples firmantes no habilitada.');
    }

    const { nombrePDF, pdfData, firmantes } = documentData;

    // Validaciones críticas con seguridad
    if (!nombrePDF || typeof nombrePDF !== 'string') {
      throw new Error('El nombre del PDF es requerido y debe ser un string válido.');
    }

    // Sanitizar nombre de archivo y remover .pdf si viene en el nombre
    const sanitizedNombrePDF = sanitizeFilename(nombrePDF).replace(/\.pdf$/i, '');

    // Validar PDF base64 con seguridad
    const pdfValidation = validatePDFBase64(pdfData);
    if (!pdfValidation.valid) {
      throw new Error(pdfValidation.error);
    }

    // Validar firmantes (array[int] en orden, segun doc_document.md)
    if (!Array.isArray(firmantes) || firmantes.length === 0) {
      throw new Error('Debe especificar al menos un firmante.');
    }

    const signerIds = firmantes.map(id =>
      typeof id === 'string' ? Number(id) : id
    );

    if (!signerIds.every(id => Number.isInteger(id) && id > 0)) {
      throw new Error('Todos los IDs de firmantes deben ser numeros enteros positivos.');
    }

    const uniqueIds = [...new Set(signerIds)];
    if (uniqueIds.length !== signerIds.length) {
      throw new Error('No se permiten firmantes duplicados.');
    }

    const MAX_PARTICIPANTS = 50;
    if (signerIds.length > MAX_PARTICIPANTS) {
      throw new Error(`Maximo ${MAX_PARTICIPANTS} firmantes permitidos.`);
    }

    // Validar que todos los IDs de firmantes sean números válidos
    if (false && !firmantes.every(id => typeof id === 'number' && id > 0)) {
      throw new Error('Todos los IDs de firmantes deben ser números positivos.');
    }

    // Validar tamaño del PDF (ej: máximo 20MB)
    const pdfSizeBytes = this.getBase64Size(pdfValidation.sanitized);
    const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
    if (pdfSizeBytes > MAX_SIZE_BYTES) {
      throw new Error(`El PDF excede el tamaño máximo permitido (${MAX_SIZE_BYTES / 1024 / 1024}MB).`);
    }

    const payload = {
      nombrePDF: sanitizedNombrePDF,           // Nombre sanitizado
      pdfData: pdfValidation.sanitized,        // PDF base64 validado
      firmantes: signerIds  // IDs de firmantes en orden
    };

    try {
      // Usar servicio de integración con manejo de errores y métricas
      const response = await integrationService.makeRequest({
        method: 'POST',
        url: QUEUE_ENDPOINTS.CREATE_WITH_QUEUE,
        data: payload
      }, QUEUE_ENDPOINTS.CREATE_WITH_QUEUE);

      return response.data;
    } catch (error) {
      // Manejo específico de errores de validación
      if (error.response?.status === 400) {
        const message = error.response.data?.message || 'Datos inválidos para crear cola';
        throw new Error(`Error de validación: ${message}`);
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 2: Estado de cola por rol (3 vistas diferentes)
   * GET /api/documents/queue-status/{queueId}
   */
  async getQueueStatus(queueId) {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.ROLE_BASED_VIEWS) {
      throw new Error('Vistas por rol no habilitadas.');
    }

    // Validar ID de forma segura
    const idValidation = validateId(queueId, { min: 1, max: 999999999 });
    if (!idValidation.valid) {
      throw new Error('ID de cola inválido.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'GET',
        url: QUEUE_ENDPOINTS.QUEUE_STATUS(queueId)
      }, QUEUE_ENDPOINTS.QUEUE_STATUS);

      // El backend devuelve vista específica según rol (manejado en integrationService)
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Cola no encontrada o no tienes acceso a ella.');
      }
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver esta cola.');
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 3: Dashboard principal
   * GET /api/documents/queue-dashboard
   */
  async getQueueDashboard() {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.ROLE_BASED_VIEWS) {
      throw new Error('Dashboard de colas no habilitado.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'GET',
        url: QUEUE_ENDPOINTS.QUEUE_DASHBOARD
      }, QUEUE_ENDPOINTS.QUEUE_DASHBOARD); // Cache ya se maneja en el store

      // Estructura transformada por integrationService:
      // {
      //   createdQueues: [...],    // Colas creadas por el usuario (emisor)
      //   signingQueues: [...],    // Colas donde el usuario firma (firmante)
      //   myTurnCount: 1,         // Número de colas donde es su turno
      //   urgentCount: 1,         // Número de colas urgentes (≤24h)
      //   completedCount: 5       // Total de colas completadas
      //   lastUpdated: timestamp
      // }

      return response.data;
    } catch (error) {
      console.error('Error cargando dashboard de colas:', error);
      throw new Error('No se pudo cargar el dashboard de colas.');
    }
  }

  /**
   * ENDPOINT 4: Firmar turno actual
   * POST /api/documents/sign-current-turn/{queueId}
   */
  async signCurrentTurn(queueId, signedPdfData) {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    // Validar ID de forma segura
    const idValidation = validateId(queueId, { min: 1, max: 999999999 });
    if (!idValidation.valid) {
      throw new Error('ID de cola inválido.');
    }

    if (!signedPdfData || typeof signedPdfData !== 'string') {
      throw new Error('Los datos del PDF firmado son requeridos.');
    }

    // Validar que sea un PDF válido en base64
    if (!this.isValidPDFBase64(signedPdfData)) {
      throw new Error('Los datos del PDF firmado no están en formato base64 válido.');
    }

    try {
      // Usar integrationService para consistencia
      const response = await integrationService.makeRequest({
        method: 'POST',
        url: QUEUE_ENDPOINTS.SIGN_CURRENT_TURN(queueId),
        data: {
          signedPdfData: signedPdfData.trim()
        },
        endpointName: 'signCurrentTurn'
      });

      // Response esperado con estado actualizado de la cola:
      // {
      //   queueId: 45,
      //   status: "InProgress",
      //   currentPosition: 2,  // Avanza al siguiente firmante
      //   totalParticipants: 3,
      //   participants: [...]
      // }

      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        const message = error.response.data?.message || 'Error al firmar documento';
        throw new Error(`Error de firma: ${message}`);
      }
      if (error.response?.status === 403) {
        throw new Error('No es tu turno de firmar o no tienes acceso a esta cola.');
      }
      if (error.response?.status === 404) {
        throw new Error('Cola no encontrada.');
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 5: Agregar participantes a cola existente
   * POST /api/documents/add-to-queue/{queueId}
   */
  async addParticipants(queueId, newUsers) {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.DYNAMIC_PARTICIPANTS) {
      throw new Error('Gestión dinámica de participantes no habilitada.');
    }

    // Validar ID de forma segura
    const idValidation = validateId(queueId, { min: 1, max: 999999999 });
    if (!idValidation.valid) {
      throw new Error('ID de cola inválido.');
    }

    if (!newUsers || !Array.isArray(newUsers) || newUsers.length === 0) {
      throw new Error('Debe especificar al menos un nuevo participante.');
    }

    // Validar IDs de usuarios
    if (!newUsers.every(id => typeof id === 'number' && id > 0)) {
      throw new Error('Todos los IDs de usuarios deben ser números positivos.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'POST',
        url: QUEUE_ENDPOINTS.ADD_PARTICIPANTS(queueId),
        data: {
          newUsers: [...new Set(newUsers)] // Eliminar duplicados
        }
      }, QUEUE_ENDPOINTS.ADD_PARTICIPANTS);

      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Datos inválidos para agregar participantes.');
      }
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para agregar participantes a esta cola.');
      }
      if (error.response?.status === 404) {
        throw new Error('Cola no encontrada.');
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 6: Descargar documento (binario)
   * GET /api/documents/download/{id}
   * - Reutiliza endpoint existente pero con validación de permisos de cola
   */
  async downloadDocument(documentId, queueId = null) {
    if (!documentId || typeof documentId !== 'number' || documentId <= 0) {
      throw new Error('ID de documento inválido.');
    }

    // Si se proporciona queueId, verificar permisos en el sistema de colas
    if (queueId && MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      try {
        const queueStatus = await this.getQueueStatus(queueId);
        if (!queueStatus.document?.canDownload) {
          throw new Error('No tienes permisos para descargar este documento.');
        }
      } catch (error) {
        console.warn('No se pudo verificar permisos de cola, procediendo con descarga:', error.message);
      }
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'GET',
        url: `/api/documents/download/${documentId}`,
        responseType: 'blob'
      }, `/api/documents/download/${documentId}`);

      return response.data; // Blob binary data
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Documento no encontrado.');
      }
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para descargar este documento.');
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 7: Ocultar cola de la vista
   * DELETE /api/documents/hide-from-view/{queueId}
   */
  async hideQueueFromView(queueId) {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES) {
      throw new Error('Funcionalidad de ocultar/mostrar colas no habilitada.');
    }

    // Validar ID de forma segura
    const idValidation = validateId(queueId, { min: 1, max: 999999999 });
    if (!idValidation.valid) {
      throw new Error('ID de cola inválido.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'DELETE',
        url: QUEUE_ENDPOINTS.HIDE_FROM_VIEW(queueId)
      }, QUEUE_ENDPOINTS.HIDE_FROM_VIEW);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Cola no encontrada.');
      }
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ocultar esta cola.');
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 8: Mostrar cola oculta
   * POST /api/documents/show-from-view/{queueId}
   */
  async showHiddenQueue(queueId) {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES) {
      throw new Error('Funcionalidad de ocultar/mostrar colas no habilitada.');
    }

    // Validar ID de forma segura
    const idValidation = validateId(queueId, { min: 1, max: 999999999 });
    if (!idValidation.valid) {
      throw new Error('ID de cola inválido.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'POST',
        url: QUEUE_ENDPOINTS.SHOW_FROM_VIEW(queueId)
      }, QUEUE_ENDPOINTS.SHOW_FROM_VIEW);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Cola no encontrada.');
      }
      throw error;
    }
  }

  /**
   * ENDPOINT 9: Listar colas ocultas
   * GET /api/documents/hidden-queues
   */
  async getHiddenQueues() {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.HIDE_SHOW_QUEUES) {
      throw new Error('Funcionalidad de ocultar/mostrar colas no habilitada.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'GET',
        url: QUEUE_ENDPOINTS.HIDDEN_QUEUES
      }, QUEUE_ENDPOINTS.HIDDEN_QUEUES, true); // Usar cache
      return response.data;
    } catch (error) {
      console.error('Error obteniendo colas ocultas:', error);
      throw new Error('No se pudieron obtener las colas ocultas.');
    }
  }

  /**
   * ENDPOINT 11: Documentos enviados (vista emisor)
   * GET /api/documents/sent
   */
  async getSentDocuments() {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'GET',
        url: QUEUE_ENDPOINTS.SENT_DOCUMENTS
      }, QUEUE_ENDPOINTS.SENT_DOCUMENTS, true); // Usar cache

      return response.data; // Estructura según documentación: { success, data: { totalCount, documents, summary } }
    } catch (error) {
      console.error('Error obteniendo documentos enviados:', error);
      throw new Error('No se pudieron obtener los documentos enviados.');
    }
  }

  /**
   * ENDPOINT 12: Documentos recibidos (vista firmante)
   * GET /api/documents/received
   */
  async getReceivedDocuments() {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'GET',
        url: QUEUE_ENDPOINTS.RECEIVED_DOCUMENTS
      }, QUEUE_ENDPOINTS.RECEIVED_DOCUMENTS, true); // Usar cache

      return response.data; // Estructura según documentación: { success, data: { totalCount, myTurnCount, sections, summary } }
    } catch (error) {
      console.error('Error obteniendo documentos recibidos:', error);
      throw new Error('No se pudieron obtener los documentos recibidos.');
    }
  }

  /**
   * ENDPOINT 13: Cancelar cola (solo emisor)
   * DELETE /api/documents/queue/{queueId}
   */
  async cancelQueue(queueId) {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    if (!MIGRATION_CONFIG.QUEUE_FEATURES.CANCEL_QUEUES) {
      throw new Error('Funcionalidad de cancelación de colas no habilitada.');
    }

    // Validar ID de forma segura
    const idValidation = validateId(queueId, { min: 1, max: 999999999 });
    if (!idValidation.valid) {
      throw new Error('ID de cola inválido.');
    }

    try {
      const response = await integrationService.makeRequest({
        method: 'DELETE',
        url: QUEUE_ENDPOINTS.CANCEL_QUEUE(queueId)
      }, QUEUE_ENDPOINTS.CANCEL_QUEUE);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Cola no encontrada.');
      }
      if (error.response?.status === 403) {
        throw new Error('Solo el emisor puede cancelar la cola.');
      }
      throw error;
    }
  }

  // === HELPER METHODS ===

  /**
   * Validar si un string es un PDF válido en base64
   */
  isValidPDFBase64(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      return false;
    }

    try {
      // Verificar formato base64
      const cleanBase64 = base64String.trim();
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        return false;
      }

      // Decodificar y verificar header PDF
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Verificar que sea un PDF (debe empezar con %PDF-)
      const pdfHeader = String.fromCharCode(...bytes.slice(0, 5));
      return pdfHeader === '%PDF-';
    } catch (error) {
      return false;
    }
  }

  /**
   * Calcular tamaño en bytes de un string base64
   */
  getBase64Size(base64String) {
    if (!base64String) return 0;

    // El tamaño real es ~3/4 del tamaño del base64 (sin padding)
    const cleanBase64 = base64String.trim().replace(/=/g, '');
    return Math.floor(cleanBase64.length * 0.75);
  }

  /**
   * Calcular fecha de expiración (período configurable)
   */
  calculateExpiration(baseDate = new Date()) {
    if (!MIGRATION_CONFIG.QUEUE_FEATURES.EXPIRATION_MANAGEMENT) {
      return null;
    }

    const EXPIRATION_DAYS = 5; // Configurable según negocio
    const EXPIRATION_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    return new Date(baseDate.getTime() + EXPIRATION_MS).toISOString();
  }

  /**
   * Verificar si un documento está por expirar
   */
  isExpiringSoon(expiresAt) {
    if (!expiresAt) return { isExpiring: false, isExpired: false };

    const now = new Date();
    const expires = new Date(expiresAt);
    const hoursUntil = (expires - now) / (1000 * 60 * 60);

    return {
      isExpiring: hoursUntil <= 24 && hoursUntil > 0,
      isExpired: hoursUntil <= 0,
      hoursRemaining: Math.max(0, Math.floor(hoursUntil))
    };
  }

  /**
   * Actualizar feature flag de migración
   * @param {string} flagName - Nombre del flag
   * @param {boolean} value - Nuevo valor
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateFeatureFlag(flagName, value) {
    try {
      const response = await api.post('/api/documents/queue/admin/feature-flags', {
        flagName,
        value
      });

      return response.data;
    } catch (error) {
      console.error(`Error updating feature flag ${flagName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener métricas de migración
   * @returns {Promise<Object>} Métricas y estadísticas
   */
  async getMigrationMetrics() {
    try {
      const response = await api.get('/api/documents/queue/admin/migration-metrics');

      return {
        metrics: response.data.metrics,
        migratedUsers: response.data.migratedUsers,
        recentActivity: response.data.recentActivity
      };
    } catch (error) {
      console.error('Error getting migration metrics:', error);
      throw error;
    }
  }

  /**
   * Añadir usuario a migración
   * @param {string} email - Email del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async addMigrationUser(email) {
    try {
      const response = await api.post('/api/documents/queue/admin/migration-users', {
        email
      });

      return response.data;
    } catch (error) {
      console.error(`Error adding migration user ${email}:`, error);
      throw error;
    }
  }

  /**
   * Remover usuario de migración
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async removeMigrationUser(userId) {
    try {
      const response = await api.delete(`/api/documents/queue/admin/migration-users/${userId}`);

      return response.data;
    } catch (error) {
      console.error(`Error removing migration user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar prueba de migración
   * @returns {Promise<Object>} Resultados de la prueba
   */
  async runMigrationTest() {
    try {
      const response = await api.post('/api/documents/queue/admin/migration-test');

      return response.data;
    } catch (error) {
      console.error('Error running migration test:', error);
      throw error;
    }
  }
}

// Exportar instancia única para uso en toda la aplicación
export const queueService = new QueueService();
export default queueService;
