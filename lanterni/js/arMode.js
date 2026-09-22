// js/arMode.js — AR mode via WebXR (stub)

export class ARMode {
  constructor() {
    this.active = false;
    this.xrSession = null;
    this.xrRefSpace = null;
  }

  async init() {
    if (!('xr' in navigator)) {
      console.warn('WebXR not supported');
      return false;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        console.warn('Immersive AR not supported');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async start() {
    if (!('xr' in navigator)) return false;

    try {
      this.xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body }
      });

      this.xrSession.addEventListener('end', () => {
        this.active = false;
        this.xrSession = null;
      });

      this.active = true;
      return true;
    } catch (e) {
      console.warn('AR session failed:', e);
      return false;
    }
  }

  stop() {
    if (this.xrSession) {
      this.xrSession.end();
      this.xrSession = null;
    }
    this.active = false;
  }

  isActive() {
    return this.active;
  }

  isSupported() {
    return 'xr' in navigator;
  }
}
