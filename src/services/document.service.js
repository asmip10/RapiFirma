// src/services/document.service.js
import api from "./api";

/**
 * Formatea fechas a 'YYYY-MM-DD' de forma segura.
 * Acepta ISO strings, Date o strings varios. Si no puede, retorna ''.
 */
function formatDateSafe(value) {
  if (!value) return "";
  if (typeof value === "string") {
    // Si viene como 'YYYY-MM-DDTHH:mm:ss' cortamos la parte de fecha
    const isoPart = value.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) return isoPart;

    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return isoPart || "";
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Mapea un DTO del backend a un item usable en MainPanel.vue */
export function mapDtoToItem(dto, currentUserId) {
  // Aceptar alias comunes de fecha desde el backend
  const rawDate =
    dto.fechaCreacion ??
    dto.FechaCreacion ??
    dto.fecha ??
    dto.Fecha ??
    dto.createdAt ??
    dto.CreatedAt ??
    dto.fechaEnvio ??
    dto.FechaEnvio ??
    dto.fechaRegistro ??
    dto.FechaRegistro ??
    null;

  return {
    id: dto.id ?? dto.Id,
    name: dto.nombrePDF ?? dto.NombrePDF ?? dto.nombre ?? "Documento",
    status: (dto.estado ?? dto.Estado ?? "pendiente").toLowerCase(),
    date: formatDateSafe(rawDate),
    sentBy: dto.remitenteNombre ?? dto.RemitenteNombre ?? dto.remitente ?? "",
    sentTo: dto.destinatarioNombre ?? dto.DestinatarioNombre ?? dto.destinatario ?? "",
    remitenteId: dto.remitenteId ?? dto.RemitenteID ?? null,
    destinatarioId: dto.destinatarioId ?? dto.DestinatarioID ?? null,
    isMine: (dto.remitenteId ?? dto.RemitenteID) === currentUserId,
  };
}

export const DocumentService = {
  /**
   * Lista documentos del usuario con filtros.
   * received = true -> recibidos; false -> enviados
   * filtros: { nombrePdf?, estado? ('pendiente'|'firmado'), fechaInicio?, fechaFin? } (YYYY-MM-DD)
   */
  async listByUser({ userId, received, filtros = {} }) {
    const params = {};
    const { nombrePdf, estado, fechaInicio, fechaFin } = filtros;

    if (nombrePdf && nombrePdf.trim().length > 0) params.nombrePdf = nombrePdf.trim();
    if (estado && (estado === "pendiente" || estado === "firmado")) params.estado = estado;
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;

    const { data } = await api.get(`/api/documents/user/${userId}/${received}`, { params });
    return Array.isArray(data) ? data : (data?.items ?? []);
  },
  

  async getById(id) {
    const { data } = await api.get(`/api/documents/${id}`);
    return data;
  },

  async download(id) {
    const { data } = await api.get(`/api/documents/download/${id}`, { responseType: "blob" });
    return data; // Blob
  },

  async remove(id) {
    const { data } = await api.delete(`/api/documents/${id}`);
    return data;
  },

  async upload({ nombrePDF, destinatarioID, pdfBase64 }) {
    const payload = { NombrePDF: nombrePDF, DestinatarioID: destinatarioID, PdfData: pdfBase64 };
    const { data } = await api.post(`/api/documents/upload`, payload);
    return data;
  },

  async forward({ id, newRecipientId }) {
    const payload = { NewRecipientId: newRecipientId };
    const { data } = await api.post(`/api/documents/send/${id}`, payload);
    return data;
  },

  async sign({ id, signedPdfBase64 }) {
    // const payload = { SignedPdfData: signedPdfBase64 };
    // const { data } = await api.post(`/api/documents/${id}/sign`, payload);
    // Backend espera /api/Documents/sign/:id y el campo "signedPdfData"
    const payload = { signedPdfData: signedPdfBase64 };
    const { data } = await api.post(`/api/Documents/sign/${id}`, payload);
    return data;
  },

  async listAll(filtros = {}) {
    const params = {};
    const { nombrePdf, estado, fechaInicio, fechaFin, includeDeleted } = filtros;

    if (nombrePdf && nombrePdf.trim()) params.nombrePdf = nombrePdf.trim();
    if (estado && (estado === "pendiente" || estado === "firmado")) params.estado = estado;
    if (fechaInicio) params.fechaInicio = fechaInicio; // YYYY-MM-DD
    if (fechaFin) params.fechaFin = fechaFin;         // YYYY-MM-DD
    if (typeof includeDeleted === "boolean") params.includeDeleted = includeDeleted;

    const { data } = await api.get("/api/documents", { params }); // GET /api/documents (Admin)
    return Array.isArray(data) ? data : (data?.items ?? []);
  },
};
