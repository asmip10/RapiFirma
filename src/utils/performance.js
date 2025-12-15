/**
 * Utilidades de Performance y Gestión de Memoria
 * CORRECCIÓN CRÍTICA: Import faltante de onUnmounted
 *
 * ❌ PROBLEMA: onUnmounted no estaba importado (memory leaks garantizados)
 * ✅ SOLUCIÓN: Importar onUnmounted desde Vue
 */

import { onUnmounted } from 'vue';

// Map para tracking de intervals activos por componente
const activeIntervals = new Map();

// Map para tracking de event listeners activos
const activeEventListeners = new Map();

// Map para tracking de timeouts activos
const activeTimeouts = new Map();

/**
 * Crea un interval con tracking automático
 * @param {string} componentId - ID del componente
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Delay en ms
 * @returns {number} ID del interval
 */
export function createTrackedInterval(componentId, callback, delay) {
  const intervalId = setInterval(callback, delay);

  if (!activeIntervals.has(componentId)) {
    activeIntervals.set(componentId, []);
  }

  activeIntervals.get(componentId).push(intervalId);

  return intervalId;
}

/**
 * Limpia todos los intervals de un componente
 * @param {string} componentId - ID del componente
 */
export function clearComponentIntervals(componentId) {
  const intervals = activeIntervals.get(componentId);
  if (intervals) {
    intervals.forEach(intervalId => clearInterval(intervalId));
    activeIntervals.delete(componentId);
  }
}

/**
 * Crea un timeout con tracking automático
 * @param {string} componentId - ID del componente
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Delay en ms
 * @returns {number} ID del timeout
 */
export function createTrackedTimeout(componentId, callback, delay) {
  const timeoutId = setTimeout(callback, delay);

  if (!activeTimeouts.has(componentId)) {
    activeTimeouts.set(componentId, []);
  }

  activeTimeouts.get(componentId).push(timeoutId);

  return timeoutId;
}

/**
 * Limpia todos los timeouts de un componente
 * @param {string} componentId - ID del componente
 */
export function clearComponentTimeouts(componentId) {
  const timeouts = activeTimeouts.get(componentId);
  if (timeouts) {
    timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    activeTimeouts.delete(componentId);
  }
}

/**
 * Agrega un event listener con tracking automático
 * @param {string} componentId - ID del componente
 * @param {Element|Window|Document} element - Elemento target
 * @param {string} event - Tipo de evento
 * @param {Function} callback - Callback del evento
 * @param {Object} options - Opciones del listener
 */
export function addTrackedEventListener(componentId, element, event, callback, options = {}) {
  const listener = callback;
  element.addEventListener(event, listener, options);

  const listenerInfo = {
    element,
    event,
    listener,
    options
  };

  if (!activeEventListeners.has(componentId)) {
    activeEventListeners.set(componentId, []);
  }

  activeEventListeners.get(componentId).push(listenerInfo);
}

/**
 * Limpia todos los event listeners de un componente
 * @param {string} componentId - ID del componente
 */
export function clearComponentEventListeners(componentId) {
  const listeners = activeEventListeners.get(componentId);
  if (listeners) {
    listeners.forEach(({ element, event, listener, options }) => {
      element.removeEventListener(event, listener, options);
    });
    activeEventListeners.delete(componentId);
  }
}

/**
 * Limpia todos los recursos de un componente (intervals, timeouts, listeners)
 * @param {string} componentId - ID del componente
 */
export function cleanupComponentResources(componentId) {
  clearComponentIntervals(componentId);
  clearComponentTimeouts(componentId);
  clearComponentEventListeners(componentId);
}

/**
 * Hook de Vue para cleanup automático en unmounted
 * @param {string} componentId - ID del componente
 * @returns {Function} Función de cleanup
 */
export function useResourceCleanup(componentId) {
  if (typeof onUnmounted !== 'undefined') {
    onUnmounted(() => {
      cleanupComponentResources(componentId);
    });
  }

  return () => cleanupComponentResources(componentId);
}

/**
 * debounce para evitar llamadas excesivas
 * @param {Function} func - Función a debouncear
 * @param {number} wait - Tiempo de espera en ms
 * @param {boolean} immediate - Si ejecutar inmediatamente
 * @returns {Function} Función debounced
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * throttle para limitar frecuencia de ejecución
 * @param {Function} func - Función a throttlear
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} Función throttled
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoización simple para cálculos costosos
 * @param {Function} fn - Función a memorizar
 * @returns {Function} Función memorizada
 */
export function memoize(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Genera ID único para componente
 * @param {string} componentName - Nombre del componente
 * @returns {string} ID único
 */
export function generateComponentId(componentName) {
  return `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mide el tiempo de ejecución de una función
 * @param {Function} fn - Función a medir
 * @param {string} label - Etiqueta para el log
 * @returns {*} Resultado de la función
 */
export function measureTime(fn, label) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`${label}: ${end - start}ms`);

  return result;
}

/**
 * Mide el tiempo de ejecución de una función asíncrona
 * @param {Function} fn - Función asíncrona a medir
 * @param {string} label - Etiqueta para el log
 * @returns {Promise} Resultado de la función
 */
export async function measureTimeAsync(fn, label) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  console.log(`${label}: ${end - start}ms`);

  return result;
}

/**
 * Lazy loading de imágenes
 * @param {string} src - URL de la imagen
 * @param {Object} options - Opciones del Intersection Observer
 * @returns {Promise<void>}
 */
export function lazyLoadImage(src, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    // Usar Intersection Observer si está disponible
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(entry.target);
          }
        });
      }, options);

      // Necesitamos un elemento para observar
      const tempElement = document.createElement('div');
      observer.observe(tempElement);
    } else {
      // Fallback para browsers sin Intersection Observer
      img.src = src;
    }
  });
}

/**
 * Detecta si el navegador está en modo low-end
 * @returns {boolean} True si es low-end
 */
export function isLowEndDevice() {
  // Basado en navigator.hardwareConcurrency y memory
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;

  return cores <= 2 || memory <= 2;
}

/**
 * Obtiene configuración de animación basada en el dispositivo
 * @returns {Object} Configuración de animación
 */
export function getAnimationConfig() {
  const isLowEnd = isLowEndDevice();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    duration: isLowEnd || prefersReduced ? 0 : 300,
    easing: isLowEnd ? 'linear' : 'cubic-bezier(0.4, 0, 0.2, 1)',
    disableAnimations: isLowEnd || prefersReduced
  };
}

/**
 * Optimiza el renderizado de listas grandes con virtual scrolling simple
 * @param {Array} items - Items a renderizar
 * @param {number} itemHeight - Altura de cada item en px
 * @param {number} containerHeight - Altura del contenedor en px
 * @param {number} scrollTop - Posición de scroll
 * @returns {Object} Items visibles y offsets
 */
export function getVisibleItems(items, itemHeight, containerHeight, scrollTop = 0) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return {
    items: visibleItems,
    startIndex,
    endIndex,
    offsetY,
    totalHeight: items.length * itemHeight
  };
}

/**
 * Monitor de memoria simple
 */
export class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 10;
  }

  // Muestra uso de memoria si está disponible
  sampleMemory() {
    if (performance.memory) {
      const sample = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      this.samples.push(sample);

      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }

      return sample;
    }

    return null;
  }

  // Verifica si hay leak sospechoso
  hasMemoryLeak() {
    if (this.samples.length < 3) return false;

    const recent = this.samples.slice(-3);
    const trend = recent[2].used - recent[0].used;

    // Si creció más de 10MB en las últimas 3 muestras
    return trend > 10 * 1024 * 1024;
  }

  // Obtiene estadísticas
  getStats() {
    if (this.samples.length === 0) return null;

    const latest = this.samples[this.samples.length - 1];
    const usagePercent = (latest.used / latest.limit) * 100;

    return {
      current: latest.used,
      total: latest.total,
      limit: latest.limit,
      usagePercent: Math.round(usagePercent),
      hasLeak: this.hasMemoryLeak()
    };
  }
}

// Instancia global del monitor de memoria
export const memoryMonitor = new MemoryMonitor();