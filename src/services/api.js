// src/services/api.js
import axios from "axios";
import { API_CONFIG } from "../config/api.config";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const auth = useAuthStore();

  // Si hay un refresh en proceso, esperar
  if (auth.isRefreshing && auth.refreshPromise) {
    await auth.refreshPromise;
  }

  // Verificar si necesito refresh (solo si hay refresh token disponible)
  if (auth.shouldRefresh && !auth.isRefreshing) {
    try {
      await auth.refreshAccessToken();
    } catch (error) {
      // Refresh falló, el interceptor de response manejará el logout
      return config;
    }
  }

  // Inyectar access token (uso accessToken para el nuevo sistema, pero mantengo compatibilidad)
  const tokenToUse = auth.accessToken || auth.token;
  if (tokenToUse) {
    config.headers.Authorization = `Bearer ${tokenToUse}`;
  }

  // Mantener lógica de advertencia para tokens viejos sin refresh
  if (auth?.user?.exp && !auth.hasRefreshCookie) {
    const now = Math.floor(Date.now() / 1000);
    const secs = auth.user.exp - now;
    const warned = sessionStorage.getItem("rf_warn_exp");
    if (secs <= 0) {
      // token ya expiró
      const { error } = useToasts();
      error("Tu sesión expiró. Vuelve a iniciar sesión.");
      auth.logout();
      const params = new URLSearchParams({ r: location.pathname + location.search });
      window.location.href = `/login?${params.toString()}`;
      return Promise.reject(new axios.Cancel("Token expirado"));
    } else if (secs <= 120 && !warned) {
      const { info } = useToasts();
      info("Tu sesión expirará pronto.");
      sessionStorage.setItem("rf_warn_exp", "1");
    }
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,

  async (err) => {
    const auth = useAuthStore();
    const originalRequest = err.config;
    const { error: showError } = useToasts();
    const status = err?.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Si hay refresh token disponible, intentar refrescar
        if (!auth.isRefreshing) {
          await auth.refreshAccessToken();

          // Reintentar request original con nuevo token
          const tokenToUse = auth.accessToken || auth.token;
          originalRequest.headers.Authorization = `Bearer ${tokenToUse}`;
          return api(originalRequest);
        } else {
          // No hay refresh token o ya está en proceso, forzar logout
          throw err;
        }
      } catch (refreshError) {
        // Refresh falló: logout y redirigir
        await auth.logout();
        showError("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");

        if (!location.pathname.startsWith("/login")) {
          const params = new URLSearchParams({ r: location.pathname + location.search });
          window.location.href = `/login?${params.toString()}`;
        }

        return Promise.reject(refreshError);
      }
    }

    // Manejo de otros errores (403, 404, network)
    if (status === 403) {
      showError("Sin permiso para realizar esta acción.");
    } else if (status === 404) {
      showError("Documento no existe o fue eliminado.");
    } else if (!err.response) {
      // Timeout / red
      showError("No se pudo conectar con el servidor.");
    }

    return Promise.reject(err);
  }
);

export default api;
