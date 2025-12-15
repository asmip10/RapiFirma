/**
 * Composable de Performance Optimization
 * Implementa lazy loading, virtualización, y optimizaciones para el sistema de colas
 * Basado en mejores prácticas y Fase 3.4 del plan de migración
 */

import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

/**
 * Hook para lazy loading de componentes pesados
 */
export function useLazyLoad() {
  const loadedComponents = ref(new Set());
  const loadingComponents = ref(new Set());

  /**
   * Cargar componente de manera lazy
   * @param {string} componentName - Nombre del componente
   * @param {Function} loader - Función que carga el componente
   * @returns {Promise<Component>}
   */
  const loadComponent = async (componentName, loader) => {
    if (loadedComponents.value.has(componentName)) {
      return; // Ya cargado
    }

    if (loadingComponents.value.has(componentName)) {
      return; // Ya se está cargando
    }

    loadingComponents.value.add(componentName);

    try {
      // Usar dynamic import con timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading component')), 10000);
      });

      const componentPromise = loader();
      await Promise.race([componentPromise, timeoutPromise]);

      loadedComponents.value.add(componentName);
    } catch (error) {
      console.error(`Error loading component ${componentName}:`, error);
      throw error;
    } finally {
      loadingComponents.value.delete(componentName);
    }
  };

  /**
   * Precargar componentes críticos
   */
  const preloadCriticalComponents = async () => {
    const criticalComponents = [
      'QueueDashboard',
      'QueueCard',
      'CreatedQueueCard',
      'SigningModal'
    ];

    // Precargar en background con baja prioridad
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        for (const component of criticalComponents) {
          try {
            // Import dinámico de componentes
            await import(`../components/${component}.vue`);
            loadedComponents.value.add(component);
          } catch (error) {
            console.warn(`Could not preload ${component}:`, error);
          }
        }
      });
    }
  };

  return {
    loadComponent,
    preloadCriticalComponents,
    isLoaded: (componentName) => loadedComponents.value.has(componentName),
    isLoading: (componentName) => loadingComponents.value.has(componentName)
  };
}

/**
 * Hook para virtualización de listas grandes
 */
export function useVirtualization(items = [], itemHeight = 80, containerHeight = 400) {
  const scrollTop = ref(0);
  const containerRef = ref(null);

  // Computar items visibles
  const visibleItems = computed(() => {
    if (!items.length) return [];

    const startIndex = Math.floor(scrollTop.value / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1, // Buffer extra
      items.length
    );

    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  });

  // Altura total del contenedor
  const totalHeight = computed(() => items.length * itemHeight);

  /**
   * Manejar scroll del contenedor
   */
  const handleScroll = (event) => {
    scrollTop.value = event.target.scrollTop;
  };

  /**
   * Scroll a item específico
   */
  const scrollToItem = (index) => {
    if (containerRef.value) {
      const targetScrollTop = index * itemHeight;
      containerRef.value.scrollTop = targetScrollTop;
    }
  };

  return {
    containerRef,
    visibleItems,
    totalHeight,
    handleScroll,
    scrollToItem,
    scrollTop
  };
}

/**
 * Hook para debouncing de búsqueda y filtros
 */
export function useDebounce(delay = 300) {
  const timeoutId = ref(null);

  /**
   * Crear función debounced
   * @param {Function} func - Función a debouncear
   * @returns {Function} Función debounced
   */
  const debounce = (func) => {
    return (...args) => {
      clearTimeout(timeoutId.value);
      timeoutId.value = setTimeout(() => func(...args), delay);
    };
  };

  /**
   * Cancelar debounce pendiente
   */
  const cancel = () => {
    clearTimeout(timeoutId.value);
  };

  onUnmounted(() => {
    cancel();
  });

  return { debounce, cancel };
}

/**
 * Hook para memoización de cálculos costosos
 */
export function useMemo() {
  const cache = ref(new Map());

  /**
   * Memoizar función con cache LRU
   * @param {Function} fn - Función a memoizar
   * @param {Function} keyGenerator - Función para generar clave de cache
   * @returns {Function} Función memoizada
   */
  const memoize = (fn, keyGenerator) => {
    return (...args) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      if (cache.value.has(key)) {
        return cache.value.get(key);
      }

      const result = fn(...args);

      // Limitar tamaño de cache a 100 entradas
      if (cache.value.size >= 100) {
        const firstKey = cache.value.keys().next().value;
        cache.value.delete(firstKey);
      }

      cache.value.set(key, result);
      return result;
    };
  };

  /**
   * Limpiar cache
   */
  const clearCache = () => {
    cache.value.clear();
  };

  return { memoize, clearCache };
}

/**
 * Hook para monitoreo de performance
 */
export function usePerformanceMonitor() {
  const metrics = ref({
    renderTime: 0,
    componentLoadTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
    lastUpdate: null
  });

  const observers = ref([]);

  /**
   * Medir tiempo de renderizado
   */
  const measureRenderTime = async (componentName, renderFn) => {
    const startTime = performance.now();
    await nextTick();
    await renderFn();
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    metrics.value.renderTime = renderTime;
    metrics.value.lastUpdate = new Date().toISOString();

    // Enviar a monitoreo si es muy lento
    if (renderTime > 100) { // 100ms threshold
      console.warn(`⚠️ Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  };

  /**
   * Medir tiempo de carga de componente
   */
  const measureComponentLoad = async (componentName, loadFn) => {
    const startTime = performance.now();
    await loadFn();
    const endTime = performance.now();

    const loadTime = endTime - startTime;
    metrics.value.componentLoadTime = loadTime;
    metrics.value.lastUpdate = new Date().toISOString();

    console.log(`📊 Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    return loadTime;
  };

  /**
   * Medir uso de memoria
   */
  const measureMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      metrics.value.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
  };

  /**
   * Crear Performance Observer para métricas de navegación
   */
  const createPerformanceObserver = () => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            console.log(`🚀 Page load time: ${entry.loadEventEnd - entry.fetchStart}ms`);
          } else if (entry.entryType === 'resource') {
            if (entry.duration > 1000) {
              console.warn(`⚠️ Slow resource: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });
      observers.value.push(observer);
    }
  };

  /**
   * Iniciar monitoreo
   */
  const startMonitoring = () => {
    createPerformanceObserver();

    // Medir memoria cada 30 segundos
    const memoryInterval = setInterval(measureMemoryUsage, 30000);

    onUnmounted(() => {
      clearInterval(memoryInterval);
      observers.value.forEach(observer => observer.disconnect());
    });
  };

  return {
    metrics,
    measureRenderTime,
    measureComponentLoad,
    measureMemoryUsage,
    startMonitoring
  };
}

/**
 * Hook para manejo de imágenes y archivos optimizados
 */
export function useOptimizedAssets() {
  const imageCache = ref(new Map());
  const loadingImages = ref(new Set());

  /**
   * Cargar imagen optimizada con lazy loading
   * @param {string} src - URL de la imagen
   * @param {Object} options - Opciones de carga
   * @returns {Promise<string>} URL de la imagen optimizada
   */
  const loadOptimizedImage = async (src, options = {}) => {
    if (imageCache.value.has(src)) {
      return imageCache.value.get(src);
    }

    if (loadingImages.value.has(src)) {
      return src; // Ya se está cargando
    }

    loadingImages.value.add(src);

    try {
      // Crear imagen para detectar dimensiones
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Optimizar tamaño si es necesario
          let optimizedSrc = src;

          if (options.maxWidth && img.width > options.maxWidth) {
            // En producción, esto debería usar un servicio de imágenes
            optimizedSrc = `${src}?w=${options.maxWidth}&q=80`;
          }

          imageCache.value.set(src, optimizedSrc);
          loadingImages.value.delete(src);
          resolve(optimizedSrc);
        };

        img.onerror = () => {
          loadingImages.value.delete(src);
          reject(new Error(`Failed to load image: ${src}`));
        };

        img.src = src;
      });
    } catch (error) {
      loadingImages.value.delete(src);
      throw error;
    }
  };

  /**
   * Precargar imágenes críticas
   */
  const preloadCriticalImages = async (imageUrls) => {
    const preloadPromises = imageUrls.map(url =>
      loadOptimizedImage(url, { maxWidth: 400 })
    );

    try {
      await Promise.all(preloadPromises);
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  };

  return {
    loadOptimizedImage,
    preloadCriticalImages,
    isLoaded: (src) => imageCache.value.has(src),
    isLoading: (src) => loadingImages.value.has(src)
  };
}