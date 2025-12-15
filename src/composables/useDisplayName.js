// src/composables/useDisplayName.js
import { ref } from "vue";
import { UserService } from "../services/user.service";
import { useAuthStore } from "../stores/auth";

export function useDisplayName() {
  const auth = useAuthStore();
  const displayName = ref("usuario");

  function firstWord(value) {
    const s = String(value ?? "").trim();
    if (!s) return "";
    return s.split(/\s+/)[0] || "";
  }

  function toShortName(me) {
    const nombres = me?.nombres ?? "";
    const apellidos = me?.apellidos ?? "";
    const n1 = firstWord(nombres);
    const a1 = firstWord(apellidos);
    const combined = [n1, a1].filter(Boolean).join(" ").trim();
    if (combined) return combined;

    const full = String(me?.fullName ?? "").trim();
    if (!full) return "";
    const parts = full.split(/\s+/);
    return [parts[0], parts[1]].filter(Boolean).join(" ").trim();
  }

  async function resolve() {
    // asegúrate de tener auth cargado
    auth.loadFromStorage?.();

    const idKey = auth.user?.id ?? auth.user?.username ?? "unknown";
    const cacheKey = `rf_displayname_v2_${idKey}`;

    // 1) cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) { displayName.value = cached; return displayName; }

    // 2) /api/users/me (tu backend devuelve nombres/apellidos)
    try {
      const me = await UserService.me(); // ya arma fullName si puede
      const shortName = toShortName(me);
      if (shortName) {
        displayName.value = shortName;
        localStorage.setItem(cacheKey, shortName);
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
        const shortName = toShortName(match);
        if (shortName) {
          displayName.value = shortName;
          localStorage.setItem(cacheKey, shortName);
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
