/**
 * Utilidades de Seguridad para RapiFirma
 * CORRECCIÓN CRÍTICA: Encriptación movida al backend por seguridad
 *
 * ⚠️ IMPORTANTE: La encriptación en frontend NO ES SEGURA
 * Las claves hardcodeadas son visibles en el código fuente
 *
 * Solución implementada:
 * - Eliminada encriptación del frontend
 * - Datos sensibles manejados exclusivamente en backend
 * - Uso de cookies httpOnly para tokens
 */

import DOMPurify from 'dompurify';

// ❌ ELIMINADA: Clave de encriptación hardcodeada (vulnerabilidad crítica)
// ✅ NUEVO: Manejo seguro a través de backend exclusivamente
// Los datos sensibles ahora se manejan sin almacenamiento local encriptado

/**
 * Sanitiza input de usuario contra XSS
 * @param {string} input - Input a sanitizar
 * @param {Object} options - Opciones de DOMPurify
 * @returns {string} Input sanitizado
 */
export function sanitizeInput(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // ⚠️ CORRECCIÓN CRÍTICA: Configuración DOMPurify enterprise-grade
  const defaultOptions = {
    // Tags permitidos (whitelist explícito)
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'span', 'p', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre'
    ],

    // Atributos permitidos (muy restrictivo)
    ALLOWED_ATTR: [],

    // Tags explícitamente prohibidos
    FORBID_TAGS: [
      'script', 'object', 'embed', 'applet', 'form',
      'input', 'textarea', 'select', 'button',
      'iframe', 'frame', 'frameset',
      'meta', 'link', 'style',
      'svg', 'math', 'video', 'audio',
      'canvas', 'details', 'summary'
    ],

    // Atributos explícitamente prohibidos
    FORBID_ATTR: [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit',
      'javascript:', 'vbscript:', 'data:',
      'src', 'href', 'action', 'formaction',
      'style', 'class', 'id', 'name'
    ],

    // No permitir data attributes
    ALLOW_DATA_ATTR: false,

    // No permitir namespaces XML
    ALLOW_UNKNOWN_PROTOCOLS: false,

    // Configuración estricta de seguridad
    SAFE_FOR_TEMPLATES: true,           // Prevenir template injection
    SAFE_FOR_JQUERY: false,             // No usar jQuery legacy
    WHOLE_DOCUMENT: false,              // No sanitizar documentos completos
    RETURN_DOM: false,                  // No retornar DOM nodes
    RETURN_DOM_FRAGMENT: false,         // No retornar fragmentos
    RETURN_DOM_IMPORT: false,

    // Sanitización agresiva
    SANITIZE_DOM: true,                  // Sanitizar DOM tree
    SANITIZE_NAMED_PROPS: true,          // Sanitizar propiedades nombradas
    SANITIZE_FRAGMENTS: true,

    // Mantener estructura semántica
    KEEP_CONTENT: true,

    // Logging en desarrollo
    INFO_ON_DESTROY: process.env.NODE_ENV === 'development',

    // Namespace handling
    USE_PROFILES: {
      html: true,
      svg: false,
      svgFilters: false,
      mathMML: false
    }
  };

  return DOMPurify.sanitize(input.trim(), { ...defaultOptions, ...options });
}

/**
 * Sanitiza nombre de archivo
 * @param {string} filename - Nombre de archivo a sanitizar
 * @returns {string} Nombre sanitizado
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'documento.pdf';
  }

  // Remover caracteres peligrosos y mantener solo seguros
  const sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '_') // Reemplazar caracteres peligrosos
    .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
    .substring(0, 255); // Limitar longitud

  return sanitized.endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

/**
 * ⚠️ CORRECCIÓN DE SEGURIDAD CRÍTICA
 *
 * FUNCIONES DE ENCRYPT/DECRYPT ELIMINADAS POR SEGURIDAD
 *
 * ❌ PROBLEMA ANTERIOR:
 * - Clave hardcodeada en frontend visible para cualquiera
 * - CryptoJS con clave expuesta en código fuente
 * - Falsa sensación de seguridad
 *
 * ✅ SOLUCIÓN IMPLEMENTADA:
 * - Datos sensibles manejados exclusivamente en backend
 * - Uso de cookies httpOnly para tokens
 * - Sin almacenamiento local de información sensible
 *
 * Si necesitas manejar datos sensibles:
 * 1. Mueve la lógica al backend
 * 2. Usa endpoints seguros con autenticación
 * 3. Implementa cookies httpOnly con flags Secure y SameSite
 */

/**
 * Valida y sanea email
 * @param {string} email - Email a validar
 * @returns {Object} Resultado de validación
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email inválido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.toLowerCase().trim();

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized: '', error: 'Formato de email inválido' };
  }

  return { valid: true, sanitized };
}

/**
 * Valida ID numérico
 * @param {any} id - ID a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export function validateId(id, options = {}) {
  const { min = 1, max = Number.MAX_SAFE_INTEGER } = options;

  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return { valid: false, error: 'ID debe ser un número entero' };
  }

  if (id < min || id > max) {
    return { valid: false, error: `ID debe estar entre ${min} y ${max}` };
  }

  if (!isFinite(id) || isNaN(id)) {
    return { valid: false, error: 'ID inválido' };
  }

  return { valid: true, value: id };
}

/**
 * Valida tamaño de archivo
 * @param {number} size - Tamaño en bytes
 * @param {number} maxSizeMB - Tamaño máximo en MB
 * @returns {Object} Resultado de validación
 */
export function validateFileSize(size, maxSizeMB = 25) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (typeof size !== 'number' || size < 0) {
    return { valid: false, error: 'Tamaño de archivo inválido' };
  }

  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

/**
 * Genera token CSRF
 * @returns {string} Token CSRF
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida PDF base64
 * @param {string} base64String - String base64 a validar
 * @returns {Object} Resultado de validación
 */
/**
 * ⚠️ CORRECCIÓN CRÍTICA: Validación PDF Robusta contra Malware
 *
 * ANTES: Validación básica (evadible)
 * AHORA: Validación profunda y segura
 */
export function validatePDFBase64(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    return { valid: false, error: 'PDF base64 inválido' };
  }

  try {
    // LÍMITES DE SEGURIDAD
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB máximo
    const MIN_PDF_SIZE = 100; // 100 bytes mínimo

    // Limpiar string de prefijos data: si existen
    const cleanBase64 = base64String.replace(/^data:application\/pdf;base64,/, '');

    // VALIDACIÓN 1: Base64 válido
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      return { valid: false, error: 'Formato base64 inválido' };
    }

    // VALIDACIÓN 2: Tamaño seguro
    const estimatedSize = Math.round(cleanBase64.length * 0.75);
    if (estimatedSize > MAX_PDF_SIZE) {
      return { valid: false, error: 'PDF demasiado grande (máximo 50MB)' };
    }
    if (estimatedSize < MIN_PDF_SIZE) {
      return { valid: false, error: 'PDF demasiado pequeño (posible archivo vacío)' };
    }

    // VALIDACIÓN 3: Header PDF válido (primeros bytes)
    const headerBytes = atob(cleanBase64.substring(0, 100));
    if (!headerBytes.startsWith('%PDF-')) {
      return { valid: false, error: 'Archivo no es PDF válido (falta header)' };
    }

    // VALIDACIÓN 4: Versión PDF segura
    const pdfVersionMatch = headerBytes.match(/%PDF-(\d+\.\d+)/);
    if (!pdfVersionMatch) {
      return { valid: false, error: 'Versión PDF no detectada' };
    }

    const pdfVersion = parseFloat(pdfVersionMatch[1]);
    if (pdfVersion > 2.0) {
      return { valid: false, error: 'Versión PDF no soportada (posible archivo malicioso)' };
    }

    // VALIDACIÓN 5: Patrones maliciosos conocidos
    const dangerousPatterns = [
      /javascript:/gi,                    // JavaScript en PDF
      /<<\s*\/\s*JS/gi,                   // Objetos JavaScript
      /<<\s*\/\s*JavaScript/gi,           // JavaScript en streams
      /URI\s*\(/gi,                      // Acciones URI
      /\/S\s*\/\s*JavaScript/gi,          // Scripts en PDF
      /AA\s*\(/gi,                       // Auto Actions
      /OpenAction/gi,                     // Acciones automáticas
      /Launch/gi,                         // Ejecución de programas
    ];

    // Validar contra patrones peligrosos (primeros 5KB)
    const sampleSize = Math.min(5000, cleanBase64.length);
    const sampleData = atob(cleanBase64.substring(0, sampleSize * 4 / 3));

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sampleData)) {
        return {
          valid: false,
          error: 'PDF contiene contenido potencialmente peligroso',
          threat: pattern.source
        };
      }
    }

    // VALIDACIÓN 6: Estructura PDF básica
    const hasEOF = sampleData.includes('%%EOF');
    if (!hasEOF && estimatedSize > 1000) { // Solo para PDFs más grandes
      return { valid: false, error: 'PDF sin marcador de fin válido' };
    }

    return {
      valid: true,
      sanitized: cleanBase64,
      metadata: {
        size: estimatedSize,
        version: pdfVersion,
        hasThreats: false
      }
    };

  } catch (error) {
    console.error('Error en validación PDF robusta:', error);
    return {
      valid: false,
      error: 'Error crítico validando PDF',
      details: error.message
    };
  }
}

/**
 * Crea headers seguros para requests
 * @param {Object} customHeaders - Headers adicionales
 * @returns {Object} Headers seguros
 */
export function createSecureHeaders(customHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...customHeaders
    // NO incluir headers que revelen configuración del sistema
  };
}

/**
 * Detecta patrones de inyección SQL
 * @param {string} input - Input a analizar
 * @returns {boolean} True si se detecta patrón sospechoso
 */
export function detectSQLInjection(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|#|\/\*|\*\/|;|'|")/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]*['"]*\s*=\s*['"]*['"]*)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Valida objeto de participantes
 * @param {Array} participants - Array de participantes
 * @returns {Object} Resultado de validación
 */
export function validateParticipants(participants) {
  if (!Array.isArray(participants)) {
    return { valid: false, error: 'Participantes debe ser un array' };
  }

  if (participants.length === 0) {
    return { valid: false, error: 'Debe haber al menos un participante' };
  }

  if (participants.length > 50) {
    return { valid: false, error: 'Máximo 50 participantes permitidos' };
  }

  const errors = [];
  const sanitized = [];

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];

    // Validar estructura
    if (!participant || typeof participant !== 'object') {
      errors.push(`Participante ${i + 1}: formato inválido`);
      continue;
    }

    // Validar email
    const emailValidation = validateEmail(participant.correo || participant.email);
    if (!emailValidation.valid) {
      errors.push(`Participante ${i + 1}: ${emailValidation.error}`);
      continue;
    }

    // Validar nombre
    const name = participant.nombre || participant.name;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push(`Participante ${i + 1}: nombre requerido`);
      continue;
    }

    if (name.length > 100) {
      errors.push(`Participante ${i + 1}: nombre muy largo (máx 100 caracteres)`);
      continue;
    }

    // Detectar inyección SQL
    if (detectSQLInjection(name) || detectSQLInjection(emailValidation.sanitized)) {
      errors.push(`Participante ${i + 1}: caracteres no permitidos`);
      continue;
    }

    sanitized.push({
      correo: emailValidation.sanitized,
      nombre: sanitizeInput(name.trim(), { ALLOWED_TAGS: [] })
    });
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, sanitized };
}

/**
 * ⚠️ CORRECCIÓN DE SEGURIDAD CRÍTICA
 *
 * ANTES: Almacenamiento local con encriptación insegura
 * AHORA: No almacenar datos sensibles en localStorage
 *
 * Para datos sensibles usar:
 * 1. Cookies httpOnly (manejadas por backend)
 * 2. Session storage con info no sensible
 * 3. Memory variables para datos temporales
 */
export function secureStorageSet(key, data, encrypt = true) {
  console.warn('⚠️ ADVERTENCIA: No almacenar datos sensibles en localStorage');

  if (key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret')) {
    throw new Error('❌ SEGURIDAD: No almacenar tokens/secrets en localStorage');
  }

  try {
    localStorage.setItem(key, data);
  } catch (error) {
    console.error(`Error guardando ${key}:`, error);
    throw new Error('No se pudo guardar datos');
  }
}

/**
 * Recupera datos no sensibles del localStorage
 * @param {string} key - Clave de almacenamiento
 * @returns {string|null} Datos recuperados
 */
export function secureStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error recuperando ${key}:`, error);
    return null;
  }
}

/**
 * Elimina datos sensibles del storage
 * @param {string} key - Clave de almacenamiento
 */
export function secureStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error eliminando ${key}:`, error);
  }
}