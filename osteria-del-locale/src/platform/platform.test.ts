import { describe, expect, it, vi } from 'vitest';
import { isIos, weakestLink, detectWasmSimd, detectInstallable } from './capability';
import type { Capabilities } from './capability';

function caps(overrides: Partial<Capabilities> = {}): Capabilities {
  return {
    webgpu: 'ready',
    crossOriginIsolated: true,
    sharedArrayBuffer: true,
    wasmSimd: true,
    deviceMemoryGb: 8,
    storageApi: 'full',
    vibrate: false,
    promptApi: false,
    serviceWorker: true,
    standalone: false,
    ios: false,
    installable: true,
    ...overrides,
  };
}

describe('isIos', () => {
  it('detects iPhone', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
  });

  it('detects iPad', () => {
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
  });

  it('does not flag desktop', () => {
    expect(isIos('Mozilla/5.0 (X11; Linux x86_64) Chrome/130')).toBe(false);
  });
});

describe('detectWasmSimd', () => {
  it('detects SIMD in an engine that has it', () => {
    expect(detectWasmSimd()).toBe(true);
  });

  it('returns false when the engine cannot understand v128', () => {
    const original = WebAssembly.validate;
    Object.defineProperty(WebAssembly, 'validate', { value: () => false, configurable: true });
    expect(detectWasmSimd()).toBe(false);
    Object.defineProperty(WebAssembly, 'validate', { value: original, configurable: true });
  });

  it('returns false rather than throwing when validation blows up', () => {
    const original = WebAssembly.validate;
    Object.defineProperty(WebAssembly, 'validate', {
      value: () => {
        throw new Error('nope');
      },
      configurable: true,
    });
    expect(detectWasmSimd()).toBe(false);
    Object.defineProperty(WebAssembly, 'validate', { value: original, configurable: true });
  });
});

describe('detectInstallable', () => {
  it('is false on iOS, where there is no install prompt', () => {
    expect(detectInstallable()).toBe(false);
  });
});

describe('weakestLink', () => {
  it('is silent on a healthy device', () => {
    expect(weakestLink(caps())).toBeNull();
  });

  it('warns when WASM SIMD is missing', () => {
    expect(weakestLink(caps({ wasmSimd: false }))).toContain('WASM SIMD');
  });

  it('warns when there is neither WebGPU nor a storage API', () => {
    const message = weakestLink(caps({ webgpu: 'unavailable', storageApi: 'none' }));
    expect(message).toContain('template narrator');
  });

  it('warns when there is no WebGPU and memory looks thin', () => {
    const message = weakestLink(caps({ webgpu: 'unavailable', deviceMemoryGb: 2 }));
    expect(message).toContain('low reported memory');
  });

  it('stays quiet on no-WebGPU when memory looks fine', () => {
    expect(weakestLink(caps({ webgpu: 'unavailable' }))).toBeNull();
  });
});

describe('storage quota', () => {
  it('reports nothing when the storage API is missing', async () => {
    vi.stubGlobal('navigator', { storage: undefined });
    const { readStorage } = await import('./storage');
    const report = await readStorage();
    expect(report.quotaBytes).toBeNull();
    expect(report.canPersist).toBe(false);
  });

  it('computes headroom', async () => {
    const MB = 1024 * 1024;
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => ({ quota: 2 * 1024 * MB, usage: 400 * MB }),
        persisted: async () => false,
        persist: async () => true,
      },
    });
    const { readStorage, checkDownloadFits } = await import('./storage');
    const report = await readStorage();
    expect(report.headroomBytes).toBe((2 * 1024 - 400) * MB);
    expect(checkDownloadFits(460 * MB, report).ok).toBe(true);
  });

  it('adds a safety margin so the download does not fill the disk', async () => {
    const MB = 1024 * 1024;
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => ({ quota: 500 * MB, usage: 0 }),
        persisted: async () => true,
        persist: async () => true,
      },
    });
    const { readStorage, checkDownloadFits } = await import('./storage');
    const report = await readStorage();
    expect(checkDownloadFits(480 * MB, report).reason).toBe('not-enough-room');
  });

  it('refuses when there is not enough room', async () => {
    const MB = 1024 * 1024;
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => ({ quota: 300 * MB, usage: 100 * MB }),
        persisted: async () => true,
        persist: async () => true,
      },
    });
    const { readStorage, checkDownloadFits } = await import('./storage');
    const report = await readStorage();
    const verdict = checkDownloadFits(460 * MB, report);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe('not-enough-room');
  });

  it('refuses when there is almost no space at all', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => ({ quota: 20 * 1024 * 1024, usage: 19.9 * 1024 * 1024 }),
        persisted: async () => true,
        persist: async () => true,
      },
    });
    const { readStorage, checkDownloadFits } = await import('./storage');
    const report = await readStorage();
    expect(checkDownloadFits(1024, report).reason).toBe('too-small-to-matter');
  });

  it('allows the download but warns when the quota is unknown', async () => {
    vi.stubGlobal('navigator', {
      storage: { persisted: async () => false, persist: async () => false },
    });
    const { readStorage, checkDownloadFits } = await import('./storage');
    const report = await readStorage();
    const verdict = checkDownloadFits(460 * 1024 * 1024, report);
    expect(verdict.ok).toBe(true);
    expect(verdict.reason).toBe('unknown-quota');
  });

  it('survives a throwing estimate', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => {
          throw new Error('nope');
        },
        persisted: async () => false,
        persist: async () => false,
      },
    });
    const { readStorage } = await import('./storage');
    const report = await readStorage();
    expect(report.headroomBytes).toBeNull();
  });
});

describe('data saver detection', () => {
  it('warns for a large download on a plain connection', async () => {
    vi.stubGlobal('navigator', { connection: undefined });
    const { shouldWarnDataSaver } = await import('./storage');
    expect(shouldWarnDataSaver(caps(), 300 * 1024 * 1024)).toBe(true);
    expect(shouldWarnDataSaver(caps(), 10 * 1024 * 1024)).toBe(false);
  });

  it('warns when data saver is on even for a small model', async () => {
    vi.stubGlobal('navigator', { connection: { saveData: true, effectiveType: '4g' } });
    const { shouldWarnDataSaver } = await import('./storage');
    expect(shouldWarnDataSaver(caps(), 10 * 1024 * 1024)).toBe(true);
  });

  it('warns on a slow link', async () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '2g' } });
    const { shouldWarnDataSaver } = await import('./storage');
    expect(shouldWarnDataSaver(caps(), 10 * 1024 * 1024)).toBe(true);
  });
});

describe('haptics', () => {
  it('reports failure rather than throwing when vibrate is missing', async () => {
    vi.stubGlobal('navigator', {});
    const { vibrate, canVibrate } = await import('./haptics');
    expect(canVibrate()).toBe(false);
    expect(vibrate('deal')).toBe(false);
  });

  it('passes a pattern through when supported', async () => {
    const vibrateMock = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate: vibrateMock });
    const { vibrate, canVibrate } = await import('./haptics');
    expect(canVibrate()).toBe(true);
    expect(vibrate('inverted')).toBe(true);
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('swallows a throwing navigator', async () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked');
      },
    });
    const { vibrate } = await import('./haptics');
    expect(vibrate('deal')).toBe(false);
  });
});