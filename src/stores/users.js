// src/stores/users.js
import { defineStore } from "pinia";
import { UserService } from "../services/user.service";

function normalize(u) {
  const id = u.id ?? u.Id ?? null;
  const dni = u.dni ?? u.Dni ?? "";
  const nombres = u.nombres ?? u.Nombres ?? "";
  const apellidos = u.apellidos ?? u.Apellidos ?? "";
  const cargoId = u.cargoId ?? u.CargoId ?? null;
  const cargo = u.cargo ?? u.Cargo ?? "";
  const rolId = u.rolId ?? u.RolId ?? null;
  const rol = u.rol ?? u.Rol ?? (rolId === 1 ? "Admin" : rolId === 2 ? "User" : "");
  const tipo = u.tipo ?? u.Tipo ?? "";
  const isDeleted = Boolean(u.isDeleted ?? u.IsDeleted ?? false);
  return {
    id,
    dni,
    nombres,
    apellidos,
    fullName: `${nombres} ${apellidos}`.trim(),
    cargoId,
    cargo,
    rolId,
    rol,
    tipo,
    isDeleted,
  };
}

export const useUsersStore = defineStore("users", {
  state: () => ({
    loading: false,
    items: [],
    filters: {
      q: "",
      includeDeleted: false,
      rol: "",   // "" | "Admin" | "User"
      tipo: "",  // "" | "Funcionario" | "Normal"
    },
  }),

  getters: {
    filtered(state) {
      const q = state.filters.q.toLowerCase().trim();
      return state.items
        .filter(u => (state.filters.includeDeleted ? true : !u.isDeleted))
        .filter(u => (state.filters.rol ? u.rol === state.filters.rol : true))
        .filter(u => (state.filters.tipo ? (u.tipo || "") === state.filters.tipo : true))
        .filter(u => {
          if (!q) return true;
          return (
            (u.dni || "").toLowerCase().includes(q) ||
            (u.fullName || "").toLowerCase().includes(q) ||
            (u.cargo || "").toLowerCase().includes(q)
          );
        });
    },
    // Helper útil en la UI
    isAdmin() {
      return (u) => (u?.rol === "Admin") || (u?.rolId === 1);
    },
  },

  actions: {
    async fetch() {
      this.loading = true;
      try {
        const data = await UserService.list({ includeDeleted: this.filters.includeDeleted });
        this.items = (data ?? []).map(normalize);
      } finally {
        this.loading = false;
      }
    },

    async create(dto) {
      // Regla: no se permite crear administradores
      const roleVal = dto?.RolId ?? dto?.rolId;
      if (Number(roleVal) === 1) {
        throw new Error("No se permite crear administradores.");
      }
      const created = await UserService.create(dto);
      await this.fetch();
      return created;
    },

    async update(id, dto) {
      // Regla: si el usuario es Admin, no se puede editar
      const current = this.items.find(x => String(x.id) === String(id));
      if (current && (current.rol === "Admin" || current.rolId === 1)) {
        throw new Error("Los usuarios con rol Admin no se pueden editar.");
      }
      // Regla: tampoco permitir que se cambie un usuario a Admin
      const roleVal = dto?.RolId ?? dto?.rolId;
      if (Number(roleVal) === 1) {
        throw new Error("No se puede asignar el rol Admin.");
      }
      const updated = await UserService.update(id, dto);
      await this.fetch();
      return updated;
    },

    async remove(id, { hard = false } = {}) {
      // Regla: Admin no se puede eliminar
      const current = this.items.find(x => String(x.id) === String(id));
      if (current && (current.rol === "Admin" || current.rolId === 1)) {
        throw new Error("Los usuarios con rol Admin no se pueden eliminar.");
      }
      await UserService.remove(id, { hard });
      await this.fetch();
    },
  },
});
