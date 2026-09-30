import type { NarratorBackend, ProbeResult, SceneBrief } from './types';
import { GenerationAborted } from './types';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';

interface LanguageModelSession {
  promptStreaming(input: string): Promise<AsyncIterable<{ content: string }>>;
  destroy?: () => void;
}

interface LanguageModelConstructor {
  availability(options?: { initialPrompts?: string[] }): Promise<string>;
  create(options?: { initialPrompts?: string[]; temperature?: number; topK?: number }): Promise<LanguageModelSession>;
}

function languageModel(): LanguageModelConstructor | null {
  const candidate = (globalThis as { LanguageModel?: LanguageModelConstructor }).LanguageModel;
  return candidate ?? null;
}

export function createChromePromptBackend(): NarratorBackend {
  let session: LanguageModelSession | null = null;

  return {
    id: 'chrome-prompt',
    label: 'Chrome built-in (Gemini Nano)',
    tier: 'free',
    approxBytes: 0,

    async probe(): Promise<ProbeResult> {
      const api = languageModel();
      if (api === null) {
        return { available: false, reason: 'Not a browser with the built-in Prompt API.' };
      }
      try {
        const availability = await api.availability({ initialPrompts: [SYSTEM_PROMPT] });
        return {
          available: true,
          reason: `Browser reports "${availability}". Chrome manages the download itself.`,
        };
      } catch (error) {
        return { available: false, reason: `Probe failed: ${error instanceof Error ? error.message : String(error)}` };
      }
    },

    async load(onProgress): Promise<void> {
      const api = languageModel();
      if (api === null) throw new Error('Prompt API unavailable');

      onProgress?.({ progress: 100, loaded: 0, total: 0 });

      session = await api.create({
        initialPrompts: [SYSTEM_PROMPT],
        temperature: 0.9,
        topK: 20,
      });
    },

    async narrate(brief: SceneBrief, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string> {
      if (session === null) throw new Error('Prompt API session not created');
      if (signal?.aborted) throw new GenerationAborted();

      let out = '';
      const stream = await session.promptStreaming(buildUserMessage(brief));

      for await (const chunk of stream) {
        if (signal?.aborted) throw new GenerationAborted();
        out += chunk.content;
        onToken(chunk.content);
      }

      return out;
    },

    async dispose(): Promise<void> {
      session?.destroy?.();
      session = null;
    },
  };
}