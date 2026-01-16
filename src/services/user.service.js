// src/services/user.service.js
import api from "./api";

function buildUpdatePayload(dto = {}) {
  return {
    dni: dto.Dni ?? dto.dni ?? "",
    nombres: dto.Nombres ?? dto.nombres ?? "",
    apellidos: dto.Apellidos ?? dto.apellidos ?? "",
    cargoId: dto.CargoId ?? dto.cargoId ?? null,
    rolId: dto.RolId ?? dto.rolId ?? 2,
    tipo: dto.Tipo ?? dto.tipo ?? null,
    newPassword: dto.NewPassword ?? dto.newPassword ?? null,
  };
}

function buildCreatePayload(dto = {}) {
  return {
    dni: dto.Dni ?? dto.dni ?? "",
    nombres: dto.Nombres ?? dto.nombres ?? "",
    apellidos: dto.Apellidos ?? dto.apellidos ?? "",
    cargoId: dto.CargoId ?? dto.cargoId ?? null,
    tipo: dto.Tipo ?? dto.tipo ?? null,
  };
}

export const UserService = {
  async me() {
    try {
      const { data } = await api.get("/api/users/me");
      if (!data) return null;

      // Soportar respuestas con envelope { success, data }
      if (data?.success === false) return null;
      const payload = data?.data ?? data;

      const id = payload.id ?? payload.Id ?? null;
      const fullName =
        payload.nombreCompleto ?? payload.fullName ?? payload.FullName ??
        `${payload.nombres ?? payload.Nombres ?? ""} ${payload.apellidos ?? payload.Apellidos ?? ""}`.trim();
      return {
        id,
        fullName: fullName || null,
        nombres: payload.nombres ?? payload.Nombres ?? null,
        apellidos: payload.apellidos ?? payload.Apellidos ?? null,
        cargo: payload.cargo ?? payload.Cargo ?? null,
      };
    } catch (e) {
      if (e?.response?.status === 404 || e?.response?.status === 401) return null;
      throw e;
    }
  },

  async search(query, { limit = 10 } = {}) {
    const q = (query ?? "").trim();
    if (q.length < 2) return [];

    try {
      const { data } = await api.get("/api/Users/search", { params: { q, limit } });
      const users = data?.data?.users ?? data?.users ?? (Array.isArray(data) ? data : []);

      return (Array.isArray(users) ? users : []).map(u => {
        const id = u.id ?? u.Id ?? null;
        const nombres = u.nombres ?? u.Nombres ?? "";
        const apellidos = u.apellidos ?? u.Apellidos ?? "";
        const fullName = (u.fullName ?? u.FullName ?? `${nombres} ${apellidos}`).trim();

        return {
          id,
          fullName: fullName || null,
          username: u.username ?? u.Username ?? null,
          dni: u.dni ?? u.Dni ?? null,
          rol: u.rol ?? u.Rol ?? null,
          tipo: u.tipo ?? u.Tipo ?? null,
          isActive: u.isActive ?? u.IsActive ?? null,
          email: u.email ?? u.Email ?? "",
          cargo: u.cargo ?? u.Cargo ?? "",
        };
      });
    } catch (e) {
      if (e?.response?.status === 400) return [];
      throw e;
    }
  },

  async list() {
    const { data } = await api.get("/api/Users/list");
    if (!data) return { totalCount: 0, users: [] };
    if (Array.isArray(data)) return { totalCount: data.length, users: data };
    return {
      totalCount: data.totalCount ?? data.total ?? 0,
      users: data.users ?? data.items ?? []
    };
  },
  async reniec(dni) {
    const { data } = await api.get("/api/Users/reniec", { params: { dni } });
    return data;
  },

  // 🔧 Fallback si el endpoint by-id no existe
  async getById(id) {
    try {
      const { data } = await api.get(`/api/users/${id}`);
      return data;
    } catch (e) {
      const st = e?.response?.status;
      if (st === 404 || st === 405) {
        const { data } = await api.get("/api/users/list", { params: { includeDeleted: true } });
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        const found = items.find(u => String(u.id ?? u.Id) === String(id));
        if (found) return found;
      }
      throw e;
    }
  },

  async restore(id) {
    const { data } = await api.patch(`/api/users/${id}/restore`);
    return data;
  },
  async resetPassword(userId) {
    const { data } = await api.post("/api/Users/reset-password", { userId });
    return data;
  },
  async disable(userId) {
    const { data } = await api.post("/api/Users/disable", { userId });
    return data;
  },
  async restoreUser(userId) {
    const { data } = await api.post("/api/Users/restore", { userId });
    return data;
  },
  async create(dto) {
    const payload = buildCreatePayload(dto);
    const { data } = await api.post("/api/Users/create", payload);
    return data;
  },

  async update(id, dto) {
    const payload = buildUpdatePayload(dto);
    const { data } = await api.put(`/api/users/${id}`, payload);
    return data;
  },

  async remove(id, { hard = false } = {}) {
    const { data } = await api.delete(`/api/users/${id}`, { params: { hard } });
    return data;
  },
};
