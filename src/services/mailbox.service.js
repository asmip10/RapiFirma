/**
 * Mailbox Service - Coordinador de Buzones de Documentos
 * Gestiona la carga y sincronización de buzones recibidos/enviados
 * Fase 3.3: Integración con endpoints de buzones especializados
 */

import { queueService } from "./queue.service";
import { QUEUE_ENDPOINTS } from "../config/api.config";
import { MIGRATION_CONFIG } from "../config/featureFlags";

export class MailboxService {

  /**
   * Carga ambos buzones de forma coordinada
   * @returns {Promise<Object>} Datos completos de ambos buzones
   */
  async loadCompleteMailbox() {
    if (!MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
      throw new Error('Sistema de colas no habilitado.');
    }

    try {
      // Cargar ambos buzones en paralelo para mejor performance
      const [sentResponse, receivedResponse] = await Promise.all([
        queueService.getSentDocuments(),
        queueService.getReceivedDocuments()
      ]);

      const sentData = sentResponse?.data ?? sentResponse;
      const receivedData = receivedResponse?.data ?? receivedResponse;

      return {
        sent: sentData,
        received: receivedData,
        summary: this.calculateCombinedSummary(sentData, receivedData),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error cargando buzones:', error);
      throw new Error('No se pudieron cargar los buzones de documentos');
    }
  }

  /**
   * Combina métricas de ambos buzones para dashboard principal
   * @param {Object} sent - Datos del buzón de enviados
   * @param {Object} received - Datos del buzón de recibidos
   * @returns {Object} Métricas combinadas
   */
  calculateCombinedSummary(sent, received) {
    const totalSent = sent.totalCount || 0;
    const totalReceived = received.totalCount || 0;
    const myTurnCount = received.myTurnCount || 0;
    const completedInReceived = received.completedCount || 0;
    const completedInSent = sent.summary?.completed || 0;
    const inProgressInSent = sent.summary?.inProgress || 0;

    return {
      // Métricas principales
      totalDocuments: totalSent + totalReceived,
      urgentActions: myTurnCount,
      waitingForMe: received.waitingCount || 0,
      sentByMe: totalSent,

      // Estadísticas detalladas
      completionRate: this.calculateCompletionRate(sent, received),
      averageTurnTime: this.calculateAverageTurnTime(sent.documents || [], received.sections?.myTurn?.documents || []),

      // Desglose por estado
      inProgressDocuments: inProgressInSent,
      completedDocuments: completedInSent + completedInReceived,
      expiredDocuments: sent.summary?.expired || 0,
      cancelledDocuments: sent.summary?.cancelled || 0,

      // Indicadores para UI
      hasUrgentDocuments: myTurnCount > 0,
      hasSentDocuments: totalSent > 0,
      hasReceivedDocuments: totalReceived > 0,

      // Timestamps
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Calcula tasa de finalización combinada
   * @param {Object} sent - Datos enviados
   * @param {Object} received - Datos recibidos
   * @returns {number} Porcentaje de finalización
   */
  calculateCompletionRate(sent, received) {
    const totalSent = sent.totalCount || 0;
    const totalReceived = received.totalCount || 0;
    const total = totalSent + totalReceived;

    if (total === 0) return 0;

    const completedInSent = sent.summary?.completed || 0;
    const completedInReceived = received.completedCount || 0;
    const completed = completedInSent + completedInReceived;

    return Math.round((completed / total) * 100);
  }

  /**
   * Calcula tiempo promedio de turnaround (días)
   * @param {Array} sentDocs - Documentos enviados
   * @param {Array} myTurnDocs - Documentos en turno actual
   * @returns {number} Días promedio
   */
  calculateAverageTurnTime(sentDocs, myTurnDocs) {
    if (!sentDocs.length && !myTurnDocs.length) return 0;

    // Para documentos en mi turno, calcular días desde received hasta now
    const now = new Date();
    let totalDays = 0;
    let count = 0;

    // Procesar documentos en mi turno
    myTurnDocs?.forEach(doc => {
      if (doc.receivedAt) {
        const receivedDate = new Date(doc.receivedAt);
        const daysSinceReceived = (now - receivedDate) / (1000 * 60 * 60 * 24);
        totalDays += daysSinceReceived;
        count++;
      }
    });

    // Procesar documentos enviados completados
    sentDocs?.forEach(doc => {
      if (doc.status === 'Completed' && doc.createdAt && doc.signers?.length > 0) {
        const createdDate = new Date(doc.createdAt);
        const lastSignedDate = new Date(
          Math.max(...doc.signers
            .filter(s => s.signedAt)
            .map(s => new Date(s.signedAt).getTime())
          )
        );
        const totalTurnaround = (lastSignedDate - createdDate) / (1000 * 60 * 60 * 24);
        totalDays += totalTurnaround;
        count++;
      }
    });

    return count > 0 ? Math.round(totalDays / count * 10) / 10 : 0;
  }

  /**
   * Filtra documentos según criterios
   * @param {Array} documents - Lista de documentos
   * @param {Object} filters - Criterios de filtrado
   * @returns {Array} Documentos filtrados
   */
  filterDocuments(documents, filters) {
    if (!documents || !Array.isArray(documents)) return [];

    return documents.filter(doc => {
      // Filtro por nombre
      if (filters.nombrePdf) {
        const searchTerm = filters.nombrePdf.toLowerCase();
        if (!doc.documentName?.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Filtro por estado
      if (filters.estado) {
        if (doc.userStatus?.status) {
          // Para documentos recibidos
          if (doc.userStatus.status !== filters.estado) return false;
        } else if (doc.status) {
          // Para documentos enviados
          if (doc.status !== filters.estado) return false;
        }
      }

      // Filtro por fecha
      if (filters.fecha) {
        const filterDate = filters.fecha;
        const docDate = doc.receivedAt || doc.createdAt;
        if (docDate && !docDate.startsWith(filterDate)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Obtiene estadísticas para un documento específico
   * @param {Object} document - Documento a analizar
   * @param {string} type - 'sent' | 'received'
   * @returns {Object} Estadísticas del documento
   */
  getDocumentStatistics(document, type) {
    const stats = {
      id: document.documentId,
      name: document.documentName,
      type,
      status: document.status || document.userStatus?.status,
      createdAt: document.createdAt || document.receivedAt
    };

    if (type === 'sent') {
      // Estadísticas para documentos enviados
      stats.progress = document.progress || {};
      stats.signers = document.signers || [];
      stats.allowDynamicAddition = document.allowDynamicAddition || false;
      stats.actions = document.actions || [];
    } else {
      // Estadísticas para documentos recibidos
      stats.userStatus = document.userStatus || {};
      stats.emisor = document.emisor || {};
      stats.actions = document.actions || [];
      stats.urgency = this.getUrgencyInfo(document);
    }

    return stats;
  }

  /**
   * Calcula información de urgencia para un documento
   * @param {Object} document - Documento recibido
   * @returns {Object} Información de urgencia
   */
  getUrgencyInfo(document) {
    const now = new Date();
    const expiresAt = document.expiresAt ? new Date(document.expiresAt) : null;

    if (!expiresAt) {
      return {
        isUrgent: false,
        isExpired: false,
        hoursRemaining: null,
        message: 'Sin fecha de expiración'
      };
    }

    const hoursUntil = (expiresAt - now) / (1000 * 60 * 60);

    return {
      isUrgent: hoursUntil <= 24 && hoursUntil > 0,
      isExpired: hoursUntil <= 0,
      hoursRemaining: Math.max(0, Math.floor(hoursUntil)),
      message: hoursUntil <= 0 ? 'Expirado' :
              hoursUntil <= 24 ? `Expira en ${Math.floor(hoursUntil)} horas` :
              `${Math.floor(hoursUntil / 24)} días restantes`
    };
  }

  /**
   * Sincronizar caché de buzones
   * @param {boolean} force - Forzar recarga completa
   * @returns {Promise<Object>} Estado de sincronización
   */
  async syncMailbox(force = false) {
    try {
      const startTime = Date.now();
      const result = await this.loadCompleteMailbox();
      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        cacheUpdated: true,
        documentsLoaded: {
          sent: result.sent.totalCount || 0,
          received: result.received.totalCount || 0,
          total: result.summary.totalDocuments
        },
        lastSync: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error sincronizando buzones:', error);
      return {
        success: false,
        error: error.message,
        lastSync: new Date().toISOString()
      };
    }
  }

  /**
   * Refresca un buzón específico
   * @param {string} mailboxType - 'sent' | 'received'
   * @returns {Promise<Object>} Resultado del refresh
   */
  async refreshMailbox(mailboxType) {
    try {
      let result;

      switch (mailboxType) {
        case 'sent':
          result = await queueService.getSentDocuments();
          break;
        case 'received':
          result = await queueService.getReceivedDocuments();
          break;
        default:
          throw new Error(`Tipo de buzón inválido: ${mailboxType}`);
      }

      return {
        success: true,
        mailboxType,
        data: result?.data ?? result,
        refreshedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error refrescando buzón ${mailboxType}:`, error);
      return {
        success: false,
        mailboxType,
        error: error.message
      };
    }
  }
}

// Exportar instancia única para uso en toda la aplicación
export const mailboxService = new MailboxService();
export default mailboxService;
