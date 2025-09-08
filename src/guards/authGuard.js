// src/guards/authGuard.js
import { useAuthStore } from "../stores/auth";
export function requireAuth(to, from, next) {
  const auth = useAuthStore();
  auth.loadFromStorage();
  if (!auth.isAuthenticated) {
    console.warn("[Guard] Bloqueado: no autenticado →", to.fullPath);
    return next({ name: "login", query: { r: to.fullPath } });
  }
  next();
}

// src/guards/roleGuard.js
export function requireRole(roles = []) {
  return (to, from, next) => {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      console.warn("[Guard] Bloqueado: no autenticado para rol", roles);
      return next({ name: "login" });
    }
    if (roles.length && !roles.includes(auth.user?.role)) {
      console.warn("[Guard] Bloqueado: rol requerido", roles, "pero user tiene", auth.user?.role);
      return next({ name: "not-found" });
    }
    next();
  };
}
