export type Beat =
  | 'deal'
  | 'refused'
  | 'discovery'
  | 'danger'
  | 'awkward'
  | 'chaos';

export interface SceneBrief {
  beat: Beat;
  facts: string[];
  present: string[];
  history: string[];
  action?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DownloadProgress {
  progress: number;
  loaded: number;
  total: number;
  file?: string;
}

export interface ProbeResult {
  available: boolean;
  reason: string;
}

export type BackendId = string;

export type BackendTier = 'zero' | 'free' | 'download';

export interface NarratorBackend {
  readonly id: BackendId;
  readonly label: string;
  readonly tier: BackendTier;
  readonly approxBytes: number;
  probe(): Promise<ProbeResult>;
  load(onProgress?: (progress: DownloadProgress) => void): Promise<void>;
  narrate(brief: SceneBrief, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string>;
  dispose(): Promise<void>;
}

export class GenerationAborted extends Error {
  constructor() {
    super('Generation aborted');
    this.name = 'GenerationAborted';
  }
}