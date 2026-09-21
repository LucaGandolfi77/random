import { api } from "./client";

const DB_NAME = "ml-assurance-offline";
const DB_VERSION = 1;
const STORE_NAME = "api-cache";

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheResponse(key: string, data: unknown, ttlMs: number = 300000) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, data, timestamp: Date.now(), expires: Date.now() + ttlMs });
    tx.commit();
    db.close();
  } catch {
    // IndexedDB not available — fail silently
  }
}

export async function getCachedResponse<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result || result.expires < Date.now()) {
          resolve(null);
        } else {
          resolve(result.data as T);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function queueMutation(path: string, payload: unknown) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const existing = await new Promise<any>((resolve) => {
      const req = store.get(path);
      req.onsuccess = () => resolve(req.result);
    });
    const queue: unknown[] = existing?.queue || [];
    queue.push({ payload, timestamp: Date.now() });
    store.put({ key: path, queue, timestamp: Date.now() });
    tx.commit();
    db.close();
  } catch {
    // Silent fail
  }
}

export async function getQueuedMutations(): Promise<unknown[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results = await new Promise<unknown[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result.filter((item: any) => item.queue?.length);
        resolve(items.map((item: any) => item.queue).flat());
      };
      req.onerror = () => resolve([]);
    });
    db.close();
    return results;
  } catch {
    return [];
  }
}

export async function clearQueuedMutations() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    tx.commit();
    db.close();
  } catch {
    // Silent fail
  }
}

export async function offlineRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  const key = `${init?.method || "GET"}:${path}`;
  const cached = await getCachedResponse<T>(key);
  if (cached) return cached;
  return null;
}

export const offlineApi = {
  get: async <T>(path: string): Promise<T | null> => {
    if (!navigator.onLine) {
      return offlineRequest<T>(path);
    }
    try {
      const data = await api.get<T>(path);
      await cacheResponse(`GET:${path}`, data);
      return data;
    } catch {
      if (!navigator.onLine) return offlineRequest<T>(path);
      return null;
    }
  },
  post: async <T>(path: string, body?: unknown): Promise<T | null> => {
    if (!navigator.onLine) {
      await queueMutation(path, body);
      return null;
    }
    try {
      const data = await api.post<T>(path, body);
      await cacheResponse(`POST:${path}`, data);
      return data;
    } catch {
      if (!navigator.onLine) {
        await queueMutation(path, body);
        return null;
      }
      return null;
    }
  },
};