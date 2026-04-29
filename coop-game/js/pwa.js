let deferredInstallPrompt = null;

function setupPwa() {
  if (!dom.installButton) {
    return;
  }

  dom.installButton.hidden = true;
  dom.installButton.disabled = true;
  dom.installButton.title = "";
  dom.installButton.textContent = "Installa";
  dom.installButton.addEventListener("click", promptInstall);

  if (location.protocol !== "file:" && window.isSecureContext && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Registrazione service worker fallita", error);
    });
  }

  if (isStandaloneMode()) {
    return;
  }

  if (isIosDevice()) {
    revealInstallButton("Safari: Aggiungi", true, "Su iPhone o iPad usa Condividi > Aggiungi alla schermata Home.");
    return;
  }

  if (location.protocol === "file:" || !window.isSecureContext) {
    revealInstallButton("Installa via HTTPS", true, "Per installare la PWA servila da localhost o HTTPS.");
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    revealInstallButton("Installa", false, "Installa l'app sul telefono.");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    dom.installButton.hidden = true;
  });
}

async function promptInstall() {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  dom.installButton.hidden = true;
}

function revealInstallButton(label, disabled, title) {
  dom.installButton.hidden = false;
  dom.installButton.disabled = disabled;
  dom.installButton.textContent = label;
  dom.installButton.title = title;
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}