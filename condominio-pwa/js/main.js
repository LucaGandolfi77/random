/* Scala B, Civico 0 — avvio */

import { init } from "./ui.js";
import { importSave } from "./save.js";

init();

/* installazione su home screen */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__deferredPrompt = e;
});

window.addEventListener("appinstalled", () => {
  window.__deferredPrompt = null;
});

/* service worker: offline di tutto */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* Web Share Target (GET): cartoline/testo ricevuti da altre app.
   Se il testo sembra un salvataggio Civico 0, lo importa; altrimenti un toast. */
function handleShareTarget() {
  try {
    const params = new URLSearchParams(window.location.search);
    const text = params.get("text") || "";
    const title = params.get("title") || "";
    if (!text && !title) return;

    const looksLikeSave =
      /^\s*\{/.test(text) && /"crumbs"|"tenants"|"apartments"|"v"\s*:/.test(text);

    if (looksLikeSave) {
      const res = importSave(text);
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("civico0:imported", { detail: res.state }));
      }
    } else {
      window.dispatchEvent(
        new CustomEvent("civico0:share", { detail: { text: text || title } })
      );
    }

    /* ripulisci l'URL senza ricaricare */
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", clean);
  } catch {
    /* niente */
  }
}

handleShareTarget();
