// src/composables/useDisplayName.js
import { ref } from "vue";
import { UserService } from "../services/user.service";
import { useAuthStore } from "../stores/auth";

export function useDisplayName() {
  const auth = useAuthStore();
  const displayName = ref("usuario");

  async function resolve() {
    // asegúrate de tener auth cargado
    auth.loadFromStorage?.();

    const idKey = auth.user?.id ?? auth.user?.username ?? "unknown";
    const cacheKey = `rf_fullname_${idKey}`;

    // 1) cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) { displayName.value = cached; return displayName; }

    // 2) /api/users/me (tu backend devuelve nombres/apellidos)
    try {
      const me = await UserService.me(); // ya arma fullName si puede
      const full = me?.fullName || [me?.nombres, me?.apellidos].filter(Boolean).join(" ").trim();
      if (full) {
        displayName.value = full;
        localStorage.setItem(cacheKey, full);
        // limpia posibles llaves malas previas
        localStorage.removeItem("rf_fullname_na");
        return displayName;
      }
    } catch {}

    // 3) búsqueda por username
    const q = (auth.user?.username ?? "").trim();
    if (q.length >= 2) {
      try {
        const results = await UserService.search(q);
        const match = results.find(r => String(r.id) === String(auth.user?.id)) ?? results[0];
        if (match?.fullName) {
          displayName.value = match.fullName;
          localStorage.setItem(cacheKey, match.fullName);
          localStorage.removeItem("rf_fullname_na");
          return displayName;
        }
      } catch {}
    }

    // 4) fallback
    displayName.value = auth.user?.username ?? "usuario";
    return displayName;
  }

  return { displayName, resolve };
}
