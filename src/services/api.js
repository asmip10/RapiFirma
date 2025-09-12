// src/services/api.js
import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:7245',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  // Aviso de expiración si quedan <=120s
  if (auth?.user?.exp) {
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
  (err) => {
    const { error } = useToasts();
    const status = err?.response?.status;
    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();
      error("Sesión expirada. Vuelve a iniciar sesión.");
      // redirige solo si no estás ya en /login para evitar loops
      if (!location.pathname.startsWith("/login")) {
        const params = new URLSearchParams({ r: location.pathname + location.search });
        window.location.href = `/login?${params.toString()}`;
      }
    }
    else if (status === 403) {
      error("Sin permiso para realizar esta acción.");
    }
    else if (status === 404) {
      error("Documento no existe o fue eliminado.");
    }
    else if (!err.response) {
      // Timeout / red
      error("No se pudo conectar con el servidor.");
    }    
    return Promise.reject(err);
  }
);

export default api;
