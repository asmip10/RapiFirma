// src/guards/authGuard.js
import { useAuthStore } from "../stores/auth";

export function requireAuth(to, from, next) {
  const auth = useAuthStore();
  auth.loadFromStorage();

  if (!auth.isAuthenticated) {
    console.warn("[Guard] Bloqueado: no autenticado →", to.fullPath);
    return next({ name: "login", query: { r: to.fullPath } });
  }

  // Verificar si necesita cambio de contraseña forzado
  if (auth.requiresPasswordChange && to.name !== "change-password") {
    console.warn("[Guard] Redirigido: requiere cambio de contraseña");
    return next({ name: "change-password", query: { r: to.fullPath } });
  }

  next();
}

// src/guards/roleGuard.js
export function requireRole(roles = []) {
  return (to, from, next) => {
    const auth = useAuthStore();
    auth.loadFromStorage();

    if (!auth.isAuthenticated) {
      console.warn("[Guard] Bloqueado: no autenticado para rol", roles);
      return next({ name: "login", query: { r: to.fullPath } });
    }

    if (roles.length && !roles.includes(auth.user?.role)) {
      console.warn("[Guard] Bloqueado: rol requerido", roles, "pero user tiene", auth.user?.role);
      return next({ name: "not-found" });
    }

    // Verificar si necesita cambio de contraseña forzado
    if (auth.requiresPasswordChange && to.name !== "change-password") {
      console.warn("[Guard] Redirigido: requiere cambio de contraseña");
      return next({ name: "change-password", query: { r: to.fullPath } });
    }

    next();
  };
}

// Nueva guardia combinada para autenticación y sesión válida
export function requireAuthAndValidSession(to, from, next) {
  const auth = useAuthStore();
  auth.loadFromStorage();

  if (!auth.isAuthenticated) {
    return next({ name: "login", query: { r: to.fullPath } });
  }

  // Si el token está expirado y no hay refresh token
  if (auth.isTokenExpired && !auth.refreshToken) {
    auth.logout();
    return next({ name: "login", query: { r: to.fullPath } });
  }

  // Verificar si necesita cambio de contraseña forzado
  if (auth.requiresPasswordChange && to.name !== "change-password") {
    return next({ name: "change-password" });
  }

  next();
}
