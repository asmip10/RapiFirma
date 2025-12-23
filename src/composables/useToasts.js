// src/composables/useToasts.js
import { reactive, readonly } from "vue";

const state = reactive({
  items: [], // { id, type: 'success'|'error'|'info', message, timeout, size }
});

let idSeq = 1;

function normalizeOptions(options) {
  if (typeof options === "number") {
    return { timeout: options };
  }
  if (options && typeof options === "object") {
    return options;
  }
  return {};
}

function push(type, message, options) {
  const { timeout = 3500, size = "md" } = normalizeOptions(options);
  const id = idSeq++;
  state.items.push({ id, type, message, size });
  if (timeout > 0) {
    setTimeout(() => remove(id), timeout);
  }
  return id;
}
function remove(id) {
  const i = state.items.findIndex(t => t.id === id);
  if (i >= 0) state.items.splice(i, 1);
}

export function useToasts() {
  return {
    toasts: readonly(state.items),
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    info: (m, o) => push("info", m, o),
    remove,
  };
}
