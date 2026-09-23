// core/bus.js — piccolo bus di eventi per disaccoppiare Controller/Audio/UI.
export function createBus() {
  const listeners = new Map();
  return {
    on(type, cb) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(cb);
      return () => listeners.get(type)?.delete(cb);
    },
    off(type, cb) { listeners.get(type)?.delete(cb); },
    emit(type, payload) {
      const set = listeners.get(type);
      if (!set) return;
      for (const cb of set) {
        try { cb(payload); } catch { /* non blocca */ }
      }
    },
  };
}
export const bus = createBus();
