export type Device = 'webgpu' | 'wasm';

export const DTYPE = { webgpu: 'q4f16', wasm: 'uint8' } as const satisfies Record<Device, string>;

export interface ModelSpec {
  backendId: string;
  modelId: string;
  label: string;
  bytesByDevice: Record<Device, number>;
}

const MB = 1024 * 1024;

export const MODEL_SPECS: ModelSpec[] = [
  {
    backendId: 'qwen-0.5b',
    modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    label: 'Qwen2.5-0.5B-Instruct',
    bytesByDevice: { webgpu: 460.6 * MB, wasm: 488.4 * MB },
  },
  {
    backendId: 'smol-360m',
    modelId: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    label: 'SmolLM2-360M-Instruct',
    bytesByDevice: { webgpu: 260.1 * MB, wasm: 347.7 * MB },
  },
  {
    backendId: 'smol-135m',
    modelId: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    label: 'SmolLM2-135M-Instruct',
    bytesByDevice: { webgpu: 108 * MB, wasm: 140 * MB },
  },
];

export function registerSpec(spec: ModelSpec): void {
  if (MODEL_SPECS.some((existing) => existing.backendId === spec.backendId)) return;
  MODEL_SPECS.push(spec);
}

export function findSpec(backendId: string): ModelSpec | undefined {
  return MODEL_SPECS.find((spec) => spec.backendId === backendId);
}

export function worstCaseBytes(spec: ModelSpec): number {
  return Math.max(spec.bytesByDevice.webgpu, spec.bytesByDevice.wasm);
}