/**
 * Servicio de Integración con Backend Real
 * Maneja conexión, transformación de datos, y compatibilidad
 * Implementa la Fase 3.3 del plan de migración
 */

import axios from 'axios';
import { API_CONFIG, LEGACY_ENDPOINTS, QUEUE_ENDPOINTS } from '../config/api.config';
import { MIGRATION_CONFIG } from '../config/featureFlags';
import { useAuthStore } from '../stores/auth';

/**
 * Cliente HTTP configurado para la aplicación
 */
class ApiClient {
  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.DEFAULT_HEADERS
    });

    this.setupInterceptors();
    this.cache = new Map();
  }

  /**
   * Configurar interceptores para auth, errores, y logging
   */
  setupInterceptors() {
    // Interceptor de request - agregar auth token
    this.instance.interceptors.request.use(
      async (config) => {
        let tokenToUse = null;

        // Preferir store auth (permite refresh en memoria)
        try {
          const auth = useAuthStore();

          if (auth.isRefreshing && auth.refreshPromise) {
            try { await auth.refreshPromise; } catch { /* noop */ }
          }

          if (auth.shouldRefresh && !auth.isRefreshing && auth.refreshToken) {
            try { await auth.refreshAccessToken(); } catch { /* noop */ }
          }

          tokenToUse = auth.accessToken || auth.token || null;
        } catch {
          // Pinia puede no estar lista al inicio
        }

        // Fallback a storage actual (rf_auth)
        if (!tokenToUse) {
          const raw = localStorage.getItem('rf_auth');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              tokenToUse = parsed.accessToken || parsed.token || null;
            } catch {
              tokenToUse = null;
            }
          }
        }

        // Compatibilidad con claves antiguas
        if (!tokenToUse) {
          tokenToUse = localStorage.getItem('authToken');
        }

        if (tokenToUse) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${tokenToUse}`;
        }

        // Agregar headers de migración
        config.headers['X-Migration-Phase'] = 'phase3';
        config.headers['X-Client-System'] = MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED ? 'queue-enabled' : 'legacy-only';

        if (API_CONFIG.LOG_LEVEL === 'debug') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            headers: config.headers
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor de response - manejar errores y logging
    this.instance.interceptors.response.use(
      (response) => {
        if (API_CONFIG.LOG_LEVEL === 'debug') {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data
          });
        }

        return response;
      },
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Manejo centralizado de errores de API
   */
  handleApiError(error) {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      timestamp: new Date().toISOString()
    };

    console.error('❌ API Error:', errorInfo);

    // Manejo específico por tipo de error
    if (error.response?.status === 401) {
      // Token expirado - redirigir a login
      this.handleAuthError();
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      console.warn('⚠️ Rate limit exceeded, retrying...');
      return this.retryRequest(error.config);
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      console.warn('⏰ Request timeout');
    }

    // Notificar sistema de monitoreo
    this.notifyErrorMonitoring(errorInfo);
  }

  /**
   * Manejar error de autenticación
   */
  handleAuthError() {
    // Limpiar token
    localStorage.removeItem('rf_auth');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('rf_warn_exp');

    // Redirigir a login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Reintentar request con backoff exponencial
   */
  async retryRequest(config, attempt = 1) {
    if (attempt > API_CONFIG.RETRY_ATTEMPTS) {
      return Promise.reject(new Error('Max retry attempts exceeded'));
    }

    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await this.instance.request(config);
    } catch (error) {
      return this.retryRequest(config, attempt + 1);
    }
  }

  /**
   * Notificar sistema de monitoreo de errores
   */
  notifyErrorMonitoring(errorInfo) {
    // En producción, enviar a servicio de monitoreo
    if (API_CONFIG.LOG_LEVEL !== 'debug') {
      // Ejemplo: enviar a Sentry, LogRocket, etc.
      console.warn('📊 Error monitoring:', errorInfo);
    }
  }

  /**
   * Request con cache para endpoints de solo lectura
   */
  async requestWithCache(config) {
    const cacheKey = `${config.method}_${config.url}`;
    const cached = this.cache.get(cacheKey);

    // Verificar si tenemos cache válido
    if (cached && (Date.now() - cached.timestamp) < API_CONFIG.CACHE_TTL.DASHBOARD) {
      // Mantener la misma forma que AxiosResponse para que makeRequest() funcione igual
      return {
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        __fromCache: true
      };
    }

    // Hacer request
    const response = await this.instance.request(config);

    // Guardar en cache si es endpoint cacheable
    if (this.isCacheableEndpoint(config.url)) {
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }

    return response;
  }

  /**
   * Verificar si endpoint es cacheable
   */
  isCacheableEndpoint(url) {
    return API_CONFIG.CACHE_CONFIG.READ_ONLY_ENDPOINTS.some(endpoint =>
      url.includes(endpoint)
    );
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Servicio de Integración Principal
 */
export class IntegrationService {
  constructor() {
    this.apiClient = new ApiClient();
    this.migrationMetrics = {
      legacyRequests: 0,
      queueRequests: 0,
      errors: 0,
      lastSync: null
    };
  }

  /**
   * Transformar datos del backend al formato del frontend
   */
  transformBackendToFrontend(data, endpoint) {
    switch (endpoint) {
      case QUEUE_ENDPOINTS.QUEUE_DASHBOARD:
        return this.transformQueueDashboard(data);

      case QUEUE_ENDPOINTS.QUEUE_STATUS:
        return this.transformQueueStatus(data);

      case QUEUE_ENDPOINTS.SENT_DOCUMENTS:
      case QUEUE_ENDPOINTS.RECEIVED_DOCUMENTS:
        return this.unwrapSuccessEnvelope(data);

      case LEGACY_ENDPOINTS.DOCUMENTS:
        return this.transformLegacyDocuments(data);

      default:
        return data;
    }
  }

  /**
   * Desenvuelve respuestas tipo { success, data } segГєn doc_document.md.
   * Si el backend ya devuelve el objeto interno, no modifica.
   */
  unwrapSuccessEnvelope(data) {
    if (data && typeof data === "object" && "data" in data) {
      return data.data ?? data;
    }
    return data;
  }

  /**
   * Transformar respuesta de dashboard de colas
   */
  transformQueueDashboard(data) {
    return {
      createdQueues: (data.createdQueues || []).map(this.normalizeQueue),
      signingQueues: (data.signingQueues || []).map(this.normalizeQueue),
      myTurnCount: data.myTurnCount || 0,
      urgentCount: data.urgentCount || 0,
      completedCount: data.completedCount || 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transformar respuesta de estado de cola
   */
  transformQueueStatus(data) {
    const base = this.normalizeQueue(data);

    const rawParticipants =
      Array.isArray(data.participants) ? data.participants :
      Array.isArray(data.usersInQueue) ? data.usersInQueue :
      Array.isArray(data.signers) ? data.signers :
      [];

    const participants = rawParticipants.map(this.normalizeParticipant);
    const document = data.document || data.Document || null;

    const canAddUsers = data.canAddUsers ?? data.canAddParticipants ?? false;
    const canCancel = data.canCancel ?? false;

    return {
      // Preservar todos los campos que el backend envía por rol
      ...data,

      // Normalizar claves base
      ...base,

      // Alias consistentes para UI
      participants,
      usersInQueue: data.usersInQueue || participants,
      currentSigner: data.currentSigner ? this.normalizeParticipant(data.currentSigner) : null,

      // Campos según doc_document.md (manteniendo compatibilidad)
      peopleWaiting: data.peopleWaiting ?? null,
      userStatus: data.userStatus ?? null,
      canAddUsers,
      canAddParticipants: canAddUsers,
      canSign: data.canSign ?? document?.canSign ?? false,
      position: data.position ?? base.currentPosition ?? null,
      totalSigners: data.totalSigners ?? base.totalParticipants ?? participants.length,
      allowDynamicAddition: data.allowDynamicAddition ?? false,
      canCancel,
      isExpired: data.isExpired ?? false,
      document
    };
  }

  /**
   * Normalizar objeto de cola
   */
  normalizeQueue(queue) {
    return {
      queueId: queue.queueId || queue.QueueId,
      documentId: queue.documentId || queue.DocumentId,
      documentName: queue.documentName || queue.DocumentName || 'Sin nombre',
      status: queue.status || queue.Status || 'Pending',
      createdAt: queue.createdAt || queue.CreatedAt,
      expiresAt: queue.expiresAt || queue.ExpiresAt,
      currentPosition: queue.currentPosition || queue.CurrentPosition,
      totalParticipants: queue.totalParticipants || queue.TotalParticipants,
      isMyTurn: queue.isMyTurn || false,
      isEmitter: queue.isEmitter || false,
      completedCount: queue.completedCount || 0,
      createdBy: queue.createdBy ? this.normalizeUser(queue.createdBy) : null
    };
  }

  /**
   * Normalizar objeto de participante
   */
  normalizeParticipant(participant) {
    return {
      userId: participant.userId || participant.UserId,
      fullName: participant.fullName || participant.FullName || 'Usuario',
      email: participant.email || participant.Email || '',
      status: participant.status || participant.Status || 'Pending',
      position: participant.position || 0,
      signedAt: participant.signedAt || participant.SignedAt
    };
  }

  /**
   * Normalizar objeto de usuario
   */
  normalizeUser(user) {
    return {
      userId: user.userId || user.UserId,
      fullName: user.fullName || user.FullName,
      email: user.email || user.Email,
      role: user.role || user.Role || 'User'
    };
  }

  /**
   * Transformar documentos legacy
   */
  transformLegacyDocuments(data) {
    if (Array.isArray(data)) {
      return data.map(this.normalizeLegacyDocument);
    }
    return data;
  }

  /**
   * Normalizar documento legacy
   */
  normalizeLegacyDocument(doc) {
    return {
      id: doc.id || doc.Id,
      name: doc.name || doc.nombrePdf || 'Documento',
      status: doc.status || doc.estado || 'pendiente',
      date: doc.date || doc.fecha || new Date().toISOString(),
      sentBy: doc.sentBy || doc.enviadoPor || 'Desconocido',
      sentTo: doc.sentTo || doc.destinatario || 'Desconocido'
    };
  }

  /**
   * Request wrapper con métricas y transformación
   */
  async makeRequest(config, endpoint, useCache = false) {
    const isQueueEndpoint =
      (typeof endpoint === "function" &&
        Object.values(QUEUE_ENDPOINTS).includes(endpoint)) ||
      (typeof endpoint === "string" &&
        Object.values(QUEUE_ENDPOINTS).some(
          (e) => typeof e === "string" && endpoint.includes(e)
        ));

    // Actualizar métricas
    if (isQueueEndpoint) {
      this.migrationMetrics.queueRequests++;
    } else {
      this.migrationMetrics.legacyRequests++;
    }

    try {
      // Hacer request
      const response = useCache
        ? await this.apiClient.requestWithCache(config)
        : await this.apiClient.instance.request(config);

      // Transformar datos
      const transformedData = this.transformBackendToFrontend(response.data, endpoint);

      this.migrationMetrics.lastSync = new Date().toISOString();

      return {
        ...response,
        data: transformedData
      };

    } catch (error) {
      this.migrationMetrics.errors++;
      throw error;
    }
  }

  /**
   * Obtener métricas de migración
   */
  getMigrationMetrics() {
    return {
      ...this.migrationMetrics,
      queueSystemUsage: this.migrationMetrics.queueRequests /
        (this.migrationMetrics.queueRequests + this.migrationMetrics.legacyRequests),
      errorRate: this.migrationMetrics.errors /
        (this.migrationMetrics.queueRequests + this.migrationMetrics.legacyRequests + this.migrationMetrics.errors)
    };
  }

  /**
   * Sincronizar estado de la aplicación con el backend
   */
  async syncApplicationState() {
    // En modo de prueba o si los endpoints no están disponibles, usar datos mock
    if (API_CONFIG.MOCK_ENDPOINTS) {
      return this.getMockData();
    }

    try {
      // Sincronizar datos de colas
      if (MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        const queueData = await this.makeRequest({
          method: 'GET',
          url: QUEUE_ENDPOINTS.QUEUE_DASHBOARD
        }, QUEUE_ENDPOINTS.QUEUE_DASHBOARD, true);

        return queueData.data;
      }

      return null;
    } catch (error) {
      console.error('Error syncing application state:', error);
      // En caso de error, intentar con datos mock
      return this.getMockData();
    }
  }

  /**
   * Obtener datos mock para desarrollo
   */
  getMockData() {
    return {
      createdQueues: [],
      signingQueues: [],
      myTurnCount: 0,
      urgentCount: 0,
      completedCount: 0,
      mock: true
    };
  }

  /**
   * Validar compatibilidad con backend
   */
  async validateBackendCompatibility() {
    try {
      // Verificar endpoints básicos
      await this.apiClient.instance.get('/health');

      // Verificar endpoints legacy
      await this.apiClient.instance.get(LEGACY_ENDPOINTS.DOCUMENTS);

      // Verificar endpoints de cola si están habilitados
      if (MIGRATION_CONFIG.QUEUE_SYSTEM_ENABLED) {
        try {
          await this.apiClient.instance.get(QUEUE_ENDPOINTS.QUEUE_DASHBOARD);
        } catch (error) {
          if (error.response?.status === 404) {
            console.warn('⚠️ Queue endpoints not available on backend');
          }
        }
      }

      return { compatible: true, version: '1.0.0' };
    } catch (error) {
      return {
        compatible: false,
        error: error.message,
        fallback: 'Usando modo offline'
      };
    }
  }
}

// Exportar instancia única del servicio
export const integrationService = new IntegrationService();
export default integrationService;
