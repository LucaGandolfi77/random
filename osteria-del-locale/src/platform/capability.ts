export type GpuStatus = 'unknown' | 'ready' | 'unavailable';

export interface Capabilities {
  webgpu: GpuStatus;
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
  wasmSimd: boolean;
  deviceMemoryGb: number | null;
  storageApi: 'none' | 'estimate' | 'full';
  vibrate: boolean;
  promptApi: boolean;
  serviceWorker: boolean;
  standalone: boolean;
  ios: boolean;
  installable: boolean;
}

interface GpuAdapterSource {
  requestAdapter(): Promise<unknown>;
}

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

export function isIos(ua = navigator.userAgent): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

// A module declaring one function that returns a v128. If it validates, the
// engine understands the 128-bit SIMD value type.
const WASM_SIMD_PROBE = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x01, 0x7b, 0x00, 0x03, 0x02, 0x01, 0x00,
  0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
]);

export function detectWasmSimd(): boolean {
  try {
    return WebAssembly.validate(WASM_SIMD_PROBE);
  } catch {
    return false;
  }
}

export function detectStorageApi(): Capabilities['storageApi'] {
  const storage = navigator.storage as StorageManager | undefined;
  if (storage === undefined) return 'none';
  if (typeof storage.persist === 'function') return 'full';
  if (typeof storage.estimate === 'function') return 'estimate';
  return 'none';
}

export function detectInstallable(): boolean {
  if (isIos()) return false;
  return (
    typeof (navigator as Navigator & { onbeforeinstallprompt?: unknown }).onbeforeinstallprompt === 'function' ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export async function probeWebGpu(): Promise<GpuStatus> {
  const gpu = (navigator as Navigator & { gpu?: GpuAdapterSource }).gpu;
  if (gpu === undefined) return 'unavailable';
  try {
    return (await gpu.requestAdapter()) === null ? 'unavailable' : 'ready';
  } catch {
    return 'unavailable';
  }
}

export function hasPromptApi(): boolean {
  return typeof (globalThis as { LanguageModel?: unknown }).LanguageModel !== 'undefined';
}

export function detectSyncCapabilities(): Capabilities {
  return {
    webgpu: 'unknown',
    crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    wasmSimd: detectWasmSimd(),
    deviceMemoryGb: (navigator as NavigatorWithDeviceMemory).deviceMemory ?? null,
    storageApi: detectStorageApi(),
    vibrate: typeof navigator.vibrate === 'function',
    promptApi: hasPromptApi(),
    serviceWorker: 'serviceWorker' in navigator,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    ios: isIos(),
    installable: detectInstallable(),
  };
}

export async function probeCapabilities(): Promise<Capabilities> {
  const base = detectSyncCapabilities();
  return { ...base, webgpu: await probeWebGpu() };
}

export function lowMemorySuspect(caps: Capabilities): boolean {
  if (caps.deviceMemoryGb !== null) return caps.deviceMemoryGb <= 2;
  return false;
}

export function weakestLink(caps: Capabilities): string | null {
  if (caps.wasmSimd === false) return 'This browser lacks WASM SIMD, which the model needs.';
  if (caps.webgpu === 'unavailable' && caps.storageApi === 'none') {
    return 'No WebGPU and no storage API: only the template narrator can run here.';
  }
  if (caps.wasmSimd && caps.webgpu === 'unavailable' && caps.deviceMemoryGb !== null && caps.deviceMemoryGb <= 2) {
    return 'No WebGPU and low reported memory: expect the model to fail or crawl.';
  }
  return null;
}