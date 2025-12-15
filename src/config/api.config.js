/**
 * Configuración de APIs para Sistema de Migración
 * Define URLs base, timeouts, y configuraciones específicas por entorno
 */

// Configuración base de APIs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_TIMEOUT = 30000; // 30 segundos timeout

// Endpoints del sistema legacy (existentes)
export const LEGACY_ENDPOINTS = {
  // Documentos
  DOCUMENTS: '/api/documents',
  DOCUMENT_BY_ID: (id) => `/api/documents/${id}`,
  UPLOAD: '/api/documents/upload',
  SIGN: (id) => `/Documents/sign/${id}`, // Notar mayúsculas
  DOWNLOAD: (id) => `/api/documents/download/${id}`,
  DELETE: (id) => `/api/documents/${id}`,

  // Usuarios
  USERS: '/api/users',
  USER_LIST: '/api/users/list'
};

// Endpoints del sistema de colas (nuevos)
export const QUEUE_ENDPOINTS = {
  // Colas
  CREATE_WITH_QUEUE: '/api/documents/create-with-queue',
  QUEUE_STATUS: (queueId) => `/api/documents/queue-status/${queueId}`,
  QUEUE_DASHBOARD: '/api/documents/queue-dashboard',
  SIGN_CURRENT_TURN: (queueId) => `/api/documents/sign-current-turn/${queueId}`,
  ADD_PARTICIPANTS: (queueId) => `/api/documents/add-to-queue/${queueId}`,
  CANCEL_QUEUE: (queueId) => `/api/documents/queue/${queueId}`,

  // Visibilidad de documentos (endpoints 12 y 13 de la documentación)
  SENT_DOCUMENTS: '/api/documents/sent',
  RECEIVED_DOCUMENTS: '/api/documents/received',

  // Gestión de visibilidad
  HIDE_FROM_VIEW: (queueId) => `/api/documents/hide-from-view/${queueId}`,
  SHOW_FROM_VIEW: (queueId) => `/api/documents/show-from-view/${queueId}`,
  HIDDEN_QUEUES: '/api/documents/hidden-queues'
};

// Configuración específica por entorno
export const ENVIRONMENTS = {
  development: {
    BASE_URL: 'http://localhost:5000',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    LOG_LEVEL: 'debug',
    MOCK_ENDPOINTS: true // Habilitar mocks para desarrollo
  },

  staging: {
    BASE_URL: 'https://staging.rapifirma.com',
    TIMEOUT: 25000,
    RETRY_ATTEMPTS: 2,
    LOG_LEVEL: 'info',
    MOCK_ENDPOINTS: false
  },

  production: {
    BASE_URL: 'https://api.rapifirma.com',
    TIMEOUT: 20000,
    RETRY_ATTEMPTS: 2,
    LOG_LEVEL: 'error',
    MOCK_ENDPOINTS: false
  }
};

// Obtener configuración del entorno actual
export function getEnvironmentConfig() {
  const env = import.meta.env.MODE || 'development';
  return ENVIRONMENTS[env] || ENVIRONMENTS.development;
}

// Configuración de reintentos y caché
export const CACHE_CONFIG = {
  // Cache para endpoints de solo lectura
  READ_ONLY_ENDPOINTS: [
    QUEUE_ENDPOINTS.QUEUE_DASHBOARD,
    QUEUE_ENDPOINTS.HIDDEN_QUEUES,
    LEGACY_ENDPOINTS.USER_LIST
  ],

  // TTL en milisegundos
  CACHE_TTL: {
    DASHBOARD: 30000, // 30 segundos
    QUEUE_STATUS: 10000, // 10 segundos
    USER_LIST: 300000 // 5 minutos
  }
};

// Configuración de límites y cuotas
export const RATE_LIMITS = {
  // Límite de peticiones por minuto
  UPLOAD_PER_MINUTE: 10,
  SIGN_PER_MINUTE: 20,
  DOWNLOAD_PER_MINUTE: 50,

  // Tamaño máximo de archivos
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB

  // Límites de participantes por cola
  MAX_PARTICIPANTS_PER_QUEUE: 50
};

// Configuración de headers estándar
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Version': '1.0.0',
  'X-Migration-Phase': 'phase3'
};

// Configuración de responses esperados
export const RESPONSE_SCHEMAS = {
  // Schema para respuesta de creación de cola
  CREATE_QUEUE: {
    success: true,
    data: {
      queueId: 'number',
      documentId: 'number',
      status: 'string', // 'Pending' | 'InProgress' | 'Completed'
      expiresAt: 'string',
      participants: 'array'
    }
  },

  // Schema para dashboard de colas
  QUEUE_DASHBOARD: {
    success: true,
    data: {
      createdQueues: 'array',
      signingQueues: 'array',
      myTurnCount: 'number',
      urgentCount: 'number',
      completedCount: 'number'
    }
  }
};

// Exportar configuración completa
export const API_CONFIG = {
  ...getEnvironmentConfig(),
  BASE_URL: API_BASE_URL,
  LEGACY_ENDPOINTS,
  QUEUE_ENDPOINTS,
  CACHE_CONFIG,
  RATE_LIMITS,
  DEFAULT_HEADERS,
  RESPONSE_SCHEMAS
};

export default API_CONFIG;
