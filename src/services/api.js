import axios from "axios";
import { API_CONFIG } from "../config/api.config";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true
});

const requestInterceptor = async (config) => {
  const auth = useAuthStore();
  const url = String(config.url || "").toLowerCase();
  const isAuthRefresh = url.includes("/api/auth/refresh");
  const isAuthLogout = url.includes("/api/auth/logout");

  if (isAuthRefresh || isAuthLogout) {
    return config;
  }

  if (auth.isLoggingOut) {
    return Promise.reject(new axios.Cancel("logout_in_progress"));
  }

  if (auth.shouldRefresh && !auth.isRefreshing) {
    try {
      await auth.refreshAccessToken();
    } catch {
      if (auth.isTokenExpired) {
        return Promise.reject(new axios.Cancel("Token expirado"));
      }
    }
  }

  if (auth.isRefreshing && auth.refreshPromise) {
    try {
      await auth.refreshPromise;
    } catch {
      return Promise.reject(new axios.Cancel("Refresh fallo"));
    }
  }

  const token = auth.accessToken;
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  return config;
};

const responseSuccessInterceptor = (r) => r;

const responseErrorInterceptor = async (err) => {
  const auth = useAuthStore();
  const originalRequest = err.config;
  const { error: showError } = useToasts();
  const status = err?.response?.status;
  const silent = Boolean(originalRequest?.silent);

  const isRefreshRequest = String(originalRequest?.url || "").toLowerCase().includes("/api/auth/refresh");
  const isLogoutRequest = String(originalRequest?.url || "").toLowerCase().includes("/api/auth/logout");

  if (axios.isCancel(err) || auth.isLoggingOut) {
    return Promise.reject(err);
  }

  if (status === 401 && !originalRequest._retry && !isRefreshRequest && !isLogoutRequest) {
    originalRequest._retry = true;

    try {
      if (auth.isRefreshing && auth.refreshPromise) {
        try {
          await auth.refreshPromise();
        } catch {
          await auth.logout();
          showError("Sesion expirada");
          window.location.href = "/login";
          return Promise.reject(new Error("Refresh fallo"));
        }
      }

      if (!auth.isRefreshing && auth.isTokenExpired) {
        await auth.refreshAccessToken();
      }

      originalRequest.headers.Authorization = "Bearer " + auth.accessToken;
      return api(originalRequest);
    } catch {
      await auth.logout();
      showError("Sesion expirada");
      window.location.href = "/login";
      return Promise.reject(err);
    }
  }

  if (silent) {
    return Promise.reject(err);
  }

  if (status === 403) {
    showError("Sin permiso");
  } else if (status === 404) {
    showError("No encontrado");
  } else if (!err.response) {
    showError("Error de conexion");
  }

  return Promise.reject(err);
};

api.interceptors.request.use(requestInterceptor);
api.interceptors.response.use(responseSuccessInterceptor, responseErrorInterceptor);

export default api;
