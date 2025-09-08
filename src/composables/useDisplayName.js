 // src/composables/useDisplayName.js
import { ref } from "vue";
import { UserService } from "../services/user.service";
import { useAuthStore } from "../stores/auth";

export function useDisplayName() {
  const auth = useAuthStore();
  const displayName = ref(auth.user?.username ?? "usuario");

   // cache por usuario
  const cacheKey = `rf_fullname_${auth.user?.id ?? "na"}`;

  async function resolve() {
     // 1) cache local
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      displayName.value = cached;
      return displayName;
    }


    // 2) intenta /api/users/me (ideal)
    try {
      const me = await UserService.me();
      if (me?.fullName) {
        displayName.value = me.fullName;
        localStorage.setItem(cacheKey, me.fullName);
        return displayName;
      }
    } catch {
      // silencioso: seguiremos a búsqueda
    }

    // 3) fallback: búsqueda por username (mín. 2 letras)
    const q = (auth.user?.username ?? "").trim();
    if (q.length >= 2) {
      try {
        const results = await UserService.search(q);
        const matchById = results.find(r => String(r.id) === String(auth.user?.id));
        const pick = matchById ?? results[0];
        if (pick?.fullName) {
          displayName.value = pick.fullName;
          localStorage.setItem(cacheKey, pick.fullName);
          return displayName;
        }
      } catch {
       // silencioso: fallback a username
      }
    }
    // 4) último recurso: username del JWT
    displayName.value = auth.user?.username ?? "usuario";
    return displayName;
  }

  return { displayName, resolve };
}
