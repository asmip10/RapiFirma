/**
 * Utilidades de Concurrencia y Race Conditions
 * Implementa mutex, semáforos y control de concurrencia
 */

/**
 * Mutex simple para controlar acceso exclusivo a recursos compartidos
 */
export class Mutex {
  constructor() {
    this._locked = false;
    this._queue = [];
  }

  /**
   * Adquiere el mutex
   * @returns {Promise<void>}
   */
  async acquire() {
    return new Promise((resolve) => {
      if (!this._locked) {
        this._locked = true;
        resolve();
      } else {
        this._queue.push(resolve);
      }
    });
  }

  /**
   * Libera el mutex
   */
  release() {
    if (this._locked) {
      this._locked = false;
      const next = this._queue.shift();
      if (next) {
        this._locked = true;
        next();
      }
    }
  }

  /**
   * Verifica si está bloqueado
   * @returns {boolean}
   */
  isLocked() {
    return this._locked;
  }
}

/**
 * Semáforo para limitar concurrencia
 */
export class Semaphore {
  constructor(maxConcurrent = 1) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.queue = [];
  }

  /**
   * Adquiere un permiso
   * @returns {Promise<void>}
   */
  async acquire() {
    return new Promise((resolve) => {
      if (this.current < this.maxConcurrent) {
        this.current++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * Libera un permiso
   */
  release() {
    if (this.current > 0) {
      this.current--;
      const next = this.queue.shift();
      if (next) {
        this.current++;
        next();
      }
    }
  }

  /**
   * Ejecuta una función con control de concurrencia
   * @param {Function} fn - Función a ejecutar
   * @returns {Promise<any>} Resultado de la función
   */
  async execute(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Request ID único para tracking de operaciones
 */
export class RequestTracker {
  constructor() {
    this.requests = new Map();
    this.counter = 0;
  }

  /**
   * Genera un nuevo request ID
   * @returns {number} Request ID único
   */
  generateId() {
    return Date.now() + this.counter++;
  }

  /**
   * Registra una nueva operación
   * @param {string} operation - Nombre de la operación
   * @returns {number} Request ID
   */
  register(operation) {
    const requestId = this.generateId();
    this.requests.set(requestId, {
      operation,
      timestamp: Date.now(),
      status: 'pending'
    });
    return requestId;
  }

  /**
   * Actualiza el estado de una operación
   * @param {number} requestId - Request ID
   * @param {string} status - Nuevo estado
   */
  updateStatus(requestId, status) {
    const request = this.requests.get(requestId);
    if (request) {
      request.status = status;
      request.updatedAt = Date.now();
    }
  }

  /**
   * Elimina una operación completada
   * @param {number} requestId - Request ID
   */
  complete(requestId) {
    this.requests.delete(requestId);
  }

  /**
   * Cancela operaciones expiradas
   * @param {number} timeoutMs - Timeout en ms
   */
  cleanupExpired(timeoutMs = 30000) {
    const now = Date.now();
    const expired = [];

    for (const [requestId, request] of this.requests) {
      if (now - request.timestamp > timeoutMs) {
        expired.push(requestId);
      }
    }

    expired.forEach(requestId => this.complete(requestId));
  }

  /**
   * Obtiene operaciones activas
   * @returns {Array} Lista de operaciones activas
   */
  getActiveOperations() {
    const now = Date.now();
    return Array.from(this.requests.entries())
      .filter(([, request]) => now - request.timestamp < 30000)
      .map(([requestId, request]) => ({
        requestId,
        ...request
      }));
  }
}

/**
 * Debounce con cancelación de operaciones previas
 * @param {Function} func - Función a debouncear
 * @param {number} wait - Tiempo de espera
 * @param {RequestTracker} tracker - Tracker para cancelar operaciones
 * @returns {Function} Función debounced
 */
export function createDebouncedFunction(func, wait, tracker) {
  let timeoutId = null;
  let lastRequestId = null;

  return function(...args) {
    const requestId = tracker.register(func.name || 'debounced');

    // Cancelar la operación anterior
    if (lastRequestId) {
      tracker.updateStatus(lastRequestId, 'cancelled');
    }

    // Limpiar timeout anterior
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    lastRequestId = requestId;

    timeoutId = setTimeout(async () => {
      try {
        tracker.updateStatus(requestId, 'executing');
        await func.apply(this, args);
        tracker.updateStatus(requestId, 'completed');
      } catch (error) {
        tracker.updateStatus(requestId, 'error');
        throw error;
      } finally {
        tracker.complete(requestId);
      }
    }, wait);
  };
}

/**
 * Queue serial de operaciones
 */
export class OperationQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Agrega una operación a la cola
   * @param {Function} operation - Operación a ejecutar
   * @param {*} args - Argumentos de la operación
   * @returns {Promise<any>} Resultado de la operación
   */
  async enqueue(operation, ...args) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, args, resolve, reject });
      this.process();
    });
  }

  /**
   * Procesa la cola de operaciones
   */
  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { operation, args, resolve, reject } = this.queue.shift();
      try {
        const result = await operation(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }
}

/**
 * Cache con invalidación por tiempo y capacidad
 */
export class TimedCache {
  constructor(maxSize = 100, ttlMs = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Obtiene un valor del cache
   * @param {string} key - Clave del valor
   * @returns {*} Valor cacheado o null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Actualizar LRU (Least Recently Used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  /**
   * Almacena un valor en cache
   * @param {string} key - Clave del valor
   * @param {*} value - Valor a almacenar
   */
  set(key, value) {
    // Eliminar el item más antiguo si excede capacidad
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Elimina un valor del cache
   * @param {string} key - Clave del valor
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * Factory para crear mutexes con nombre
 */
export class MutexFactory {
  constructor() {
    this.mutexes = new Map();
  }

  /**
   * Obtiene o crea un mutex por nombre
   * @param {string} name - Nombre del mutex
   * @returns {Mutex} Instancia del mutex
   */
  get(name) {
    if (!this.mutexes.has(name)) {
      this.mutexes.set(name, new Mutex());
    }
    return this.mutexes.get(name);
  }
}

/**
 * Instancia global del factory
 */
export const globalMutexFactory = new MutexFactory();

/**
 * Wrapper para operaciones asíncronas con mutex
 * @param {string} mutexName - Nombre del mutex
 * @param {Function} operation - Operación a ejecutar
 * @returns {Promise<any>} Resultado de la operación
 */
export async function withMutex(mutexName, operation) {
  const mutex = globalMutexFactory.get(mutexName);
  await mutex.acquire();
  try {
    return await operation();
  } finally {
    mutex.release();
  }
}

/**
 * Variables atómicas simples para sincronización
 */
export class AtomicVariable {
  constructor(initialValue = 0) {
    this._value = initialValue;
  }

  /**
   * Obtiene el valor actual
   * @returns {*} Valor actual
   */
  get() {
    return this._value;
  }

  /**
   * Establece un nuevo valor
   * @param {*} value - Nuevo valor
   * @returns {*} Valor anterior
   */
  set(value) {
    const previous = this._value;
    this._value = value;
    return previous;
  }

  /**
   * Incrementa el valor
   * @param {number} delta - Incremento
   * @returns {number} Nuevo valor
   */
  increment(delta = 1) {
    this._value += delta;
    return this._value;
  }

  /**
   * Compara y establece si es mayor
   * @param {*} value - Valor a comparar
   * @returns {boolean} True si se actualizó
   */
  maxSet(value) {
    if (value > this._value) {
      this._value = value;
      return true;
    }
    return false;
  }
}