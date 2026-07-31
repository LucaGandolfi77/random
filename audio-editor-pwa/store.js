/* ===================================================
   🎚 Audio Editor PWA — Persistenza (IndexedDB)
   Autosave del progetto (seriale) + blob audio.
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.AudioStore = factory(root);
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  const DB_NAME = 'audio-editor-pwa';
  const DB_VER = 1;
  const PROJ = 'project';
  const ASSETS = 'assets';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!root.indexedDB) {
        reject(new Error('IndexedDB non disponibile'));
        return;
      }
      const req = root.indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROJ)) db.createObjectStore(PROJ);
        if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const os = t.objectStore(store);
      const req = fn(os);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  function saveProject(data) {
    return tx(PROJ, 'readwrite', os => os.put(data, 'main'));
  }

  function loadProject() {
    return tx(PROJ, 'readonly', os => os.get('main')).then(r => r || null);
  }

  function saveAsset(id, blob) {
    return tx(ASSETS, 'readwrite', os => os.put(blob, id));
  }

  function getAsset(id) {
    return tx(ASSETS, 'readonly', os => os.get(id)).then(r => r || null);
  }

  function getAssetKeys() {
    return tx(ASSETS, 'readonly', os => os.getAllKeys()).then(r => r || []);
  }

  function clearAll() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction([PROJ, ASSETS], 'readwrite');
      t.objectStore(PROJ).clear();
      t.objectStore(ASSETS).clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    }));
  }

  return { saveProject, loadProject, saveAsset, getAsset, getAssetKeys, clearAll };
});
