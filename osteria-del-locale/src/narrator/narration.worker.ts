import type { ChatMessage, DownloadProgress } from './types';
import { DTYPE } from './models';

export type Device = 'webgpu' | 'wasm';

export type WorkerRequest =
  | { type: 'load'; modelId: string; preferWebGpu: boolean }
  | { type: 'generate'; id: number; messages: ChatMessage[]; params: Record<string, unknown> }
  | { type: 'abort' }
  | { type: 'dispose' };

export type WorkerResponse =
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'ready'; device: Device; dtype: string }
  | { type: 'token'; id: number; text: string }
  | { type: 'done'; id: number; text: string }
  | { type: 'error'; id: number | null; phase: 'load' | 'generate'; message: string };

const CACHE_DIRECTORY = 'osteria-models';

let pipe: unknown = null;
let stopper: { interrupt: () => void; reset: () => void } | null = null;
let loadedModelId = '';

type TransformersModule = typeof import('@huggingface/transformers');

async function transformers(): Promise<TransformersModule> {
  return import('@huggingface/transformers');
}

function post(response: WorkerResponse): void {
  self.postMessage(response);
}

async function load(modelId: string, preferWebGpu: boolean): Promise<void> {
  if (pipe !== null && loadedModelId === modelId) return;

  const mod = await transformers();
  const { env } = mod;
  const { createOpfsCache } = await import('../platform/modelCache');

  env.allowLocalModels = false;
  env.cacheKey = CACHE_DIRECTORY;

  const opfs = await createOpfsCache(CACHE_DIRECTORY);
  if (opfs === null) {
    env.useCustomCache = false;
    env.useBrowserCache = true;
  } else {
    env.useCustomCache = true;
    env.customCache = opfs;
  }

  const progress_callback = (info: { status: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
    if (info.status === 'progress_total') {
      post({
        type: 'progress',
        progress: {
          progress: Math.round(info.progress ?? 0),
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
        },
      });
    } else if (info.status === 'progress') {
      post({
        type: 'progress',
        progress: {
          progress: Math.round(info.progress ?? 0),
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
          file: info.file,
        },
      });
    }
  };

  const candidates: Device[] = preferWebGpu ? ['webgpu', 'wasm'] : ['wasm'];

  let lastError: unknown = null;
  for (const device of candidates) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- device fallback must be sequential
      const created = await mod.pipeline('text-generation', modelId, {
        device,
        dtype: DTYPE[device],
        progress_callback,
      });
      pipe = created;
      loadedModelId = modelId;
      post({ type: 'ready', device, dtype: DTYPE[device] });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Could not load ${modelId} on any device: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function generate(
  id: number,
  messages: ChatMessage[],
  params: Record<string, unknown>,
): Promise<void> {
  const mod = await transformers();
  if (pipe === null) {
    post({ type: 'error', id, phase: 'generate', message: 'Model not loaded' });
    return;
  }

  const generator = pipe as {
    tokenizer: ConstructorParameters<typeof mod.TextStreamer>[0];
    (input: ChatMessage[], options: Record<string, unknown>): Promise<Array<{ generated_text: ChatMessage[] }>>;
  };

  const streamer = new mod.TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      if (text.length > 0) post({ type: 'token', id, text });
    },
  });

  const criteria = new mod.InterruptableStoppingCriteria();
  stopper = criteria;

  try {
    const output = await generator(messages, {
      ...params,
      streamer,
      stopping_criteria: criteria,
      return_full_text: false,
    });
    const first = output[0];
    const generated = first?.generated_text;
    const last = Array.isArray(generated) ? generated.at(-1) : undefined;
    const text = last?.content ?? '';
    post({ type: 'done', id, text });
  } catch (error) {
    post({
      type: 'error',
      id,
      phase: 'generate',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    stopper = null;
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'abort') {
    stopper?.interrupt();
    return;
  }

  if (request.type === 'dispose') {
    stopper?.interrupt();
    pipe = null;
    loadedModelId = '';
    return;
  }

  if (request.type === 'load') {
    void load(request.modelId, request.preferWebGpu).catch((error: unknown) => {
      post({
        type: 'error',
        id: null,
        phase: 'load',
        message: error instanceof Error ? error.message : String(error),
      });
    });
    return;
  }

  void generate(request.id, request.messages, request.params);
});