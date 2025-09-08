// src/stores/document.js
import { defineStore } from "pinia";
import { DocumentService, mapDtoToItem } from "../services/document.service";
import { UserService } from "../services/user.service";
import { useAuthStore } from "./auth";

export const useDocumentsStore = defineStore("documents", {
  state: () => ({
    // === Usuario (panel) ===
    loading: false,
    received: [],
    sent: [],
    filters: {
      nombrePdf: "",
      estadoReceived: "", // ""|"pendiente"|"firmado"
      estadoSent: "",
      fecha: "",          // YYYY-MM-DD
      fechaSent: "",
    },

    // === Admin (Etapa E — tarjetas resumen) ===
    adminSummaryLoading: false,
    adminSummary: {
      totalDocs: 0,
      pendientes: 0,
      firmados: 0,
      enviadosHoy: 0,         // según fecha del servidor
      recibidosHoy: 0,        // si aplica en tu backend (por ahora derivamos)
      usuariosActivos: 0,
      usuariosEliminados: 0,
      ultAct: null,           // timestamp de última actualización
    },
  }),

  getters: {
    // Id de usuario logueado
    currentUserId: () => {
      const auth = useAuthStore();
      const id = auth.user?.id ?? auth.user?.Id ?? null;
      return typeof id === "string" ? Number(id) : id;
    },
  },

  actions: {
    // =========================
    // Usuario - Recibidos/Enviados
    // =========================
    async fetchReceived() {
      if (!this.currentUserId) return;
      this.loading = true;
      try {
        const data = await DocumentService.listByUser({
          userId: this.currentUserId,
          received: true,
          filtros: {
            nombrePdf: this.filters.nombrePdf || undefined,
            estado: this.filters.estadoReceived || undefined,
            fechaInicio: this.filters.fecha || undefined,
            fechaFin: this.filters.fecha || undefined,
          },
        });
        this.received = data.map(d => mapDtoToItem(d, this.currentUserId));
      } finally {
        this.loading = false;
      }
    },

    async fetchSent() {
      if (!this.currentUserId) return;
      this.loading = true;
      try {
        const data = await DocumentService.listByUser({
          userId: this.currentUserId,
          received: false,
          filtros: {
            nombrePdf: this.filters.nombrePdf || undefined,
            estado: this.filters.estadoSent || undefined,
            fechaInicio: this.filters.fechaSent || undefined,
            fechaFin: this.filters.fechaSent || undefined,
          },
        });
        this.sent = data.map(d => mapDtoToItem(d, this.currentUserId));
      } finally {
        this.loading = false;
      }
    },

    // =========================
    // Admin - Dashboard (resúmenes rápidos)
    // =========================
    /**
     * Carga métricas rápidas para las tarjetas del Dashboard Admin.
     * Acepta un rango opcional {fechaInicio, fechaFin} en formato YYYY-MM-DD
     * para acotar "pendientes/firmados" y calcular "enviadosHoy".
     */
    async fetchAdminSummary({ fechaInicio, fechaFin } = {}) {
      this.adminSummaryLoading = true;
      try {
        // 1) Documentos del sistema (usamos tu /api/documents existente)
        //    Aplica filtros si se pasan (estado, fechas) — ya soportado en listAll.
        const allDocs = await DocumentService.listAll({
          fechaInicio,
          fechaFin,
          includeDeleted: false,
        }); // GET /api/documents (Admin) :contentReference[oaicite:3]{index=3}

        // Conteos básicos
        const totalDocs = allDocs.length;
        const pendientes = allDocs.filter(d => (d.estado ?? d.Estado) === "pendiente").length;
        const firmados = allDocs.filter(d => (d.estado ?? d.Estado) === "firmado").length;

        // "enviadosHoy": contamos por fecha de creación igual a hoy (server/date string "YYYY-MM-DD")
        const todayStr = new Date().toISOString().slice(0, 10);
        const enviadosHoy = allDocs.filter(d => {
          const f = (d.fecha ?? d.Fecha ?? d.createdAt ?? d.CreatedAt ?? "").toString().slice(0,10);
          return f === todayStr;
        }).length;

        // si deseas un "recibidosHoy" simple, toma los que cambian de destinatario hoy (si tu DTO lo trae);
        // por ahora lo dejamos igual a enviadosHoy para no inventar backend.
        const recibidosHoy = enviadosHoy;

        // 2) Usuarios del sistema (activos vs eliminados)
        const users = await UserService.list({ includeDeleted: true }); // GET /api/users/list :contentReference[oaicite:4]{index=4}
        const usuariosEliminados = users.filter(u => Boolean(u.isDeleted ?? u.IsDeleted ?? false)).length;
        const usuariosActivos = users.length - usuariosEliminados;

        this.adminSummary = {
          totalDocs,
          pendientes,
          firmados,
          enviadosHoy,
          recibidosHoy,
          usuariosActivos,
          usuariosEliminados,
          ultAct: Date.now(),
        };
      } finally {
        this.adminSummaryLoading = false;
      }
    },

    resetAdminSummary() {
      this.adminSummary = {
        totalDocs: 0,
        pendientes: 0,
        firmados: 0,
        enviadosHoy: 0,
        recibidosHoy: 0,
        usuariosActivos: 0,
        usuariosEliminados: 0,
        ultAct: null,
      };
    },
  },
});
