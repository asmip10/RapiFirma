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
    newUsername: dto.NewUsername ?? dto.newUsername ?? null,
  };
}

function buildCreatePayload(dto = {}) {
  return {
    dni: dto.Dni ?? dto.dni ?? "",
    nombres: dto.Nombres ?? dto.nombres ?? "",
    apellidos: dto.Apellidos ?? dto.apellidos ?? "",
    cargoId: dto.CargoId ?? dto.cargoId ?? null,
    rolId: dto.RolId ?? dto.rolId ?? 2,
    tipo: dto.Tipo ?? dto.tipo ?? null,
  };
}

export const UserService = {
  async me() {
    try {
      const { data } = await api.get("/api/users/me");
      if (!data) return null;
      const id = data.id ?? data.Id ?? null;
      const fullName =
        data.fullName ?? data.FullName ??
        `${data.nombres ?? data.Nombres ?? ""} ${data.apellidos ?? data.Apellidos ?? ""}`.trim();
      return {
        id,
        fullName: fullName || null,
        nombres: data.nombres ?? data.Nombres ?? null,
        apellidos: data.apellidos ?? data.Apellidos ?? null,
        cargo: data.cargo ?? data.Cargo ?? null,
      };
    } catch (e) {
      if (e?.response?.status === 404 || e?.response?.status === 401) return null;
      throw e;
    }
  },

  async search(query) {
    const q = (query ?? "").trim();
    if (q.length < 2) return [];
    try {
      const { data } = await api.get("/api/users/search", { params: { query: q } });
      return (Array.isArray(data) ? data : []).map(u => ({
        id: u.id ?? u.Id,
        fullName: u.fullName ?? u.FullName ?? `${u.nombres ?? ""} ${u.apellidos ?? ""}`.trim(),
        cargo: u.cargo ?? u.Cargo ?? "",
      }));
    } catch (e) {
      if (e?.response?.status === 400) return [];
      throw e;
    }
  },

  async list({ includeDeleted = false } = {}) {
    const { data } = await api.get("/api/users/list", { params: { includeDeleted } });
    return Array.isArray(data) ? data : (data?.items ?? []);
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

  async create(dto) {
    const payload = buildCreatePayload(dto);
    const { data } = await api.post("/api/users", payload);
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
