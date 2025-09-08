// src/guards/roleGuard.js
import { useAuthStore } from "../stores/auth";

export function requireRole(roles = []) {
  return (to, from, next) => {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) return next({ name: "login" });
    if (roles.length && !roles.includes(auth.user?.role)) {
      return next({ name: "not-found" });
    }
    next();
  };
}
