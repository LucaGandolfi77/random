declare module "virtual:pwa-register" {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration) => void;
    onUpdateFound?: () => void;
  }): () => void;
}

declare module "vite-plugin-pwa/client" {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration) => void;
    onUpdateFound?: () => void;
  }): () => void;
}

declare const __SW_REGISTRATION__: ServiceWorkerRegistration | undefined;
export default __SW_REGISTRATION__;