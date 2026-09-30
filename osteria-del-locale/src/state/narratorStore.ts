import { create } from 'zustand';
import { MODEL_SPECS, findSpec, worstCaseBytes } from '../narrator/models';
import type { ModelSpec } from '../narrator/models';
import { createTemplateBackend } from '../narrator/template';
import { createChromePromptBackend } from '../narrator/chrome-prompt';
import { createTransformersBackend } from '../narrator/transformers';
import type { NarratorBackend, ProbeResult } from '../narrator/types';
import { GENERATION_PARAMS } from '../narrator/prompt';
import { probeCapabilities, weakestLink } from '../platform/capability';
import type { Capabilities } from '../platform/capability';
import { checkDownloadFits, readStorage, requestPersistence } from '../platform/storage';
import type { StorageReport } from '../platform/storage';

export type NarratorPhase =
  | 'probing'
  | 'ready'
  | 'needs-download'
  | 'downloading'
  | 'loading'
  | 'narrating'
  | 'error'
  | 'unsupported';

export interface Tier {
  id: string;
  label: string;
  tier: NarratorBackend['tier'];
  bytes: number;
  probe: ProbeResult | null;
  note: string;
}

export interface NarratorState {
  phase: NarratorPhase;
  activeId: string | null;
  activeDevice: string | null;
  progress: { percent: number; loaded: number; total: number } | null;
  capabilities: Capabilities | null;
  storage: StorageReport | null;
  tiers: Tier[];
  selectedId: string;
  message: string | null;
}

export const INITIAL_STATE: NarratorState = {
  phase: 'probing',
  activeId: null,
  activeDevice: null,
  progress: null,
  capabilities: null,
  storage: null,
  tiers: [],
  selectedId: 'template',
  message: null,
};

const backendCache = new Map<string, NarratorBackend>();

export function backendFor(tierId: string): NarratorBackend | null {
  const cached = backendCache.get(tierId);
  if (cached !== undefined) return cached;

  let created: NarratorBackend | null = null;
  if (tierId === 'template') {
    created = createTemplateBackend();
  } else if (tierId === 'chrome-prompt') {
    created = createChromePromptBackend();
  } else {
    const spec = findSpec(tierId);
    if (spec !== undefined) created = createTransformersBackend(spec, { ...GENERATION_PARAMS });
  }

  if (created !== null) backendCache.set(tierId, created);
  return created;
}

export function resetBackends(): void {
  for (const backend of backendCache.values()) void backend.dispose();
  backendCache.clear();
}

function tierOf(spec: ModelSpec): Tier {
  return { id: spec.backendId, label: spec.label, tier: 'download', bytes: worstCaseBytes(spec), probe: null, note: '' };
}

export function buildTiers(probes: Map<string, ProbeResult>, capabilities: Capabilities): Tier[] {
  const template: Tier = {
    id: 'template',
    label: 'Template narrator',
    tier: 'zero',
    bytes: 0,
    probe: probes.get('template') ?? { available: true, reason: '' },
    note: 'No download, no GPU. The game is fully playable on this.',
  };

  const chrome: Tier = {
    id: 'chrome-prompt',
    label: 'Chrome built-in (Gemini Nano)',
    tier: 'free',
    bytes: 0,
    probe: probes.get('chrome-prompt') ?? { available: false, reason: 'Not probed.' },
    note: 'Desktop Chrome and Edge only. The browser downloads its own model.',
  };

  const models = MODEL_SPECS.map((spec) => tierOf(spec));

  for (const model of models) {
    const probe = probes.get(model.id);
    if (probe !== undefined) model.probe = probe;
    model.note =
      capabilities.webgpu === 'ready'
        ? 'WebGPU available. Expect 25-60 tok/s.'
        : 'No WebGPU, so this runs on WASM at roughly 3-10 tok/s.';
  }

  return [template, chrome, ...models];
}

export function recommendedTier(tiers: Tier[]): Tier {
  const download = tiers.filter((tier) => tier.tier === 'download');
  const usable = download.filter((tier) => tier.probe?.available === true);
  const usableNonFree = usable[0];
  if (usableNonFree !== undefined) return usableNonFree;
  return tiers[0] ?? { id: 'template', label: 'Template narrator', tier: 'zero', bytes: 0, probe: null, note: '' };
}

interface NarratorActions {
  probe(): Promise<void>;
  select(id: string): void;
  loadSelected(): Promise<boolean>;
  activeBackend(): NarratorBackend | null;
  setPhase(phase: NarratorPhase, message?: string | null): void;
  setProgress(progress: { percent: number; loaded: number; total: number } | null): void;
  setDevice(device: string | null): void;
  disposeAll(): void;
}

export const useNarratorStore = create<NarratorState & NarratorActions>((set, get) => ({
  ...INITIAL_STATE,

  async probe(): Promise<void> {
    set({ phase: 'probing', message: null });
    const capabilities = await probeCapabilities();
    const storage = await readStorage();

    const ids = ['template', 'chrome-prompt', ...MODEL_SPECS.map((spec) => spec.backendId)];
    const probes = new Map<string, ProbeResult>();

    for (const id of ids) {
      const backend = backendFor(id);
      if (backend === null) continue;
      // oxlint-disable-next-line no-await-in-loop -- probing the Prompt API can trigger its model download
      const probe = await backend.probe().catch(() => ({ available: false, reason: 'Probe failed.' }));
      probes.set(id, probe);
    }

    const tiers = buildTiers(probes, capabilities);
    const current = get().selectedId;
    const stillExists = tiers.some((tier) => tier.id === current);
    const chosen = stillExists ? current : recommendedTier(tiers).id;
    const chosenTier = tiers.find((tier) => tier.id === chosen);
    const warning = weakestLink(capabilities);

    const zeroByte = chosenTier !== undefined && chosenTier.tier !== 'download';
    set({
      capabilities,
      storage,
      tiers,
      selectedId: chosen,
      activeId: zeroByte ? chosen : null,
      activeDevice: zeroByte ? (chosen === 'template' ? 'template' : 'chrome') : null,
      phase: zeroByte ? 'ready' : 'needs-download',
      message: warning,
    });

    Object.assign(globalThis as Record<string, unknown>, {
      __tierLoaded: true,
      __tiers: tiers.map((tier) => ({ id: tier.id, tier: tier.tier, bytes: tier.bytes })),
    });
  },

  select(id: string): void {
    const tier = get().tiers.find((candidate) => candidate.id === id);

    if (tier !== undefined && tier.tier !== 'download') {
      set({
        selectedId: id,
        activeId: id,
        phase: 'ready',
        message: null,
        progress: null,
        activeDevice: id === 'template' ? 'template' : (get().activeDevice ?? 'chrome'),
      });
      return;
    }

    set({
      selectedId: id,
      activeId: null,
      phase: 'needs-download',
      message: null,
      progress: null,
    });
  },

  async loadSelected(): Promise<boolean> {
    const { selectedId, storage } = get();
    const backend = backendFor(selectedId);
    if (backend === null) return false;

    const tier = get().tiers.find((candidate) => candidate.id === selectedId);
    if (tier === undefined) return false;

    if (storage !== null && !storage.persisted && storage.canPersist) {
      const granted = await requestPersistence();
      const refreshed = await readStorage();
      set({ storage: refreshed, message: granted ? null : 'Persistent storage was refused; the model may be evicted.' });
    }

    if (tier.tier === 'download' && storage !== null) {
      const verdict = checkDownloadFits(tier.bytes, storage);
      if (!verdict.ok) {
        set({ phase: 'error', message: verdict.detail });
        return false;
      }
    }

    if (tier.tier === 'download') set({ phase: 'downloading', message: null, progress: null });
    else set({ phase: 'loading', message: null, progress: null });

    try {
      await backend.load((progress) => {
        set({
          progress: { percent: progress.progress, loaded: progress.loaded, total: progress.total },
        });
      });
      const device = (backend as { activeDevice?: () => string | null }).activeDevice?.() ?? null;
      set({ phase: 'ready', activeId: selectedId, activeDevice: device, progress: null });
      return true;
    } catch (error) {
      set({
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
        progress: null,
      });
      return false;
    }
  },

  activeBackend(): NarratorBackend | null {
    const { activeId } = get();
    if (activeId === null) return null;
    return backendFor(activeId);
  },

  setPhase(phase: NarratorPhase, message: string | null = null): void {
    set({ phase, message });
  },

  setProgress(progress: { percent: number; loaded: number; total: number } | null): void {
    set({ progress });
  },

  setDevice(device: string | null): void {
    set({ activeDevice: device });
  },

  disposeAll(): void {
    resetBackends();
    set({ activeId: null, phase: 'probing', progress: null });
  },
}));