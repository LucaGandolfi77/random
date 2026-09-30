import type { Device, WorkerRequest, WorkerResponse } from './narration.worker';
import type { ModelSpec } from './models';
import { worstCaseBytes } from './models';
import type { NarratorBackend, ProbeResult, SceneBrief } from './types';
import { GenerationAborted } from './types';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';

export { MODEL_SPECS, registerSpec, findSpec } from './models';

export async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (gpu === undefined) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

interface Pending {
  resolve(text: string): void;
  reject(error: Error): void;
  onToken(chunk: string): void;
  accumulated: string;
}

export interface TransformersBackend extends NarratorBackend {
  activeDevice(): Device | null;
}

export function createTransformersBackend(
  spec: ModelSpec,
  params: Record<string, unknown>,
): TransformersBackend {
  let worker: Worker | null = null;
  let device: Device | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  function send(request: WorkerRequest): void {
    if (worker === null) return;
    worker.postMessage(request);
  }

  function ensureWorker(): Worker {
    if (worker !== null) return worker;

    const created = new Worker(new URL('./narration.worker.ts', import.meta.url), {
      type: 'module',
      name: 'narration',
    });

    created.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      if (response.type === 'ready') {
        device = response.device;
        return;
      }

      if (response.type === 'token') {
        const entry = pending.get(response.id);
        if (entry !== undefined) {
          entry.accumulated += response.text;
          entry.onToken(response.text);
        }
        return;
      }

      if (response.type === 'done') {
        const entry = pending.get(response.id);
        entry?.resolve(response.text);
        pending.delete(response.id);
        return;
      }

      if (response.type === 'error') {
        const error = new Error(response.message);
        if (response.id === null) {
          for (const entry of pending.values()) entry.reject(error);
          pending.clear();
        } else {
          pending.get(response.id)?.reject(error);
          pending.delete(response.id);
        }
      }
    });

    created.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Narration worker crashed');
      for (const entry of pending.values()) entry.reject(error);
      pending.clear();
      device = null;
    });

    worker = created;
    return created;
  }

  return {
    id: spec.backendId,
    label: spec.label,
    tier: 'download',
    approxBytes: worstCaseBytes(spec),

    activeDevice: () => device,

    async probe(): Promise<ProbeResult> {
      const webgpu = await hasWebGpu();
      return {
        available: true,
        reason: webgpu
          ? 'WebGPU available, expect 25-60 tok/s'
          : 'No WebGPU adapter, WASM only, expect 3-10 tok/s',
      };
    },

    async load(onProgress): Promise<void> {
      const webgpu = await hasWebGpu();
      const target = ensureWorker();

      const ready = new Promise<void>((resolve, reject) => {
        const onMessage = (event: MessageEvent<WorkerResponse>) => {
          const response = event.data;
          if (response.type === 'progress') onProgress?.(response.progress);
          if (response.type === 'ready') {
            target.removeEventListener('message', onMessage);
            resolve();
          }
          if (response.type === 'error' && response.phase === 'load') {
            target.removeEventListener('message', onMessage);
            reject(new Error(response.message));
          }
        };
        target.addEventListener('message', onMessage);
      });

      target.postMessage({ type: 'load', modelId: spec.modelId, preferWebGpu: webgpu } satisfies WorkerRequest);
      await ready;
    },

    async narrate(brief: SceneBrief, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string> {
      if (signal?.aborted) throw new GenerationAborted();

      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        { role: 'user' as const, content: buildUserMessage(brief) },
      ];

      const id = nextId;
      nextId += 1;

      return new Promise<string>((resolve, reject) => {
        pending.set(id, { resolve, reject, onToken, accumulated: '' });
        send({ type: 'generate', id, messages, params });

        signal?.addEventListener(
          'abort',
          () => {
            const entry = pending.get(id);
            if (entry === undefined) return;
            pending.delete(id);
            send({ type: 'abort' });
            if (entry.accumulated.trim().length > 0) {
              resolve(entry.accumulated);
            } else {
              reject(new GenerationAborted());
            }
          },
          { once: true },
        );
      });
    },

    async dispose(): Promise<void> {
      send({ type: 'dispose' });
      worker?.terminate();
      worker = null;
      pending.clear();
      device = null;
    },
  };
}