// src/composables/useToasts.js
import { reactive, readonly } from "vue";

const state = reactive({
  items: [], // { id, type: 'success'|'error'|'info', message, timeout }
});

let idSeq = 1;

function push(type, message, timeout = 3500) {
  const id = idSeq++;
  state.items.push({ id, type, message });
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
    success: (m, t) => push("success", m, t),
    error: (m, t) => push("error", m, t),
    info: (m, t) => push("info", m, t),
    remove,
  };
}
