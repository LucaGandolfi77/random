import { create } from 'zustand';
import { parseIntent, describeIntent } from '../engine/intent';
import { createWorld } from '../engine/world';
import { advanceNight, briefFrom, endingFor, takeTurn } from '../engine/chronicle';
import { clearSave, loadGame, progressOf, saveGame } from '../engine/save';
import type { GameState, SceneBrief, World } from '../engine/types';

export interface Line {
  id: number;
  kind: 'player' | 'engine' | 'narrator' | 'ending' | 'system';
  text: string;
  streaming?: boolean;
}

export interface GameStore {
  world: World;
  lines: Line[];
  status: GameState['status'];
  lastBrief: SceneBrief | null;
  streaming: boolean;
  nextId: number;
  busy: boolean;
  saveNote: string | null;

  submit(input: string): void;
  setStream(text: string): void;
  completeNarration(text: string): void;
  failNarration(reason: string): void;
  sleep(): void;
  restart(): void;
  pushSystem(text: string): void;
  persist(): void;
  hydrate(): void;
  dismissSaveNote(): void;
}

function nextSeed(world: World): number {
  return (world.seed * 31 + world.turn * 17 + 1) >>> 0;
}

export const useGameStore = create<GameStore>((set, get) => ({
  world: createWorld(1337),
  lines: [{ id: 0, kind: 'system', text: 'You are the new barman. The fire is out and has been for some time.' }],
  status: 'playing',
  lastBrief: null,
  streaming: false,
  nextId: 1,
  busy: false,
  saveNote: null,

  submit(input: string): void {
    const trimmed = input.trim();
    if (trimmed.length === 0) return;
    if (get().status !== 'playing') return;

    const intent = parseIntent(trimmed);
    const { world, last } = takeTurn(
      { world: get().world, last: null, status: get().status },
      intent,
    );

    if (last === null) return;
    const brief = briefFrom(world, last);

    // The engine account is the transcript. The narrator is optional colour
    // that runs alongside it, so a failed or slow narration never delays or
    // hides the authoritative line.
    set((state) => ({
      world,
      status: statusOf(world),
      lastBrief: brief,
      busy: true,
      streaming: false,
      lines: [
        ...state.lines,
        { id: state.nextId, kind: 'player' as const, text: describeIntent(intent) },
        { id: state.nextId + 1, kind: 'engine' as const, text: brief.facts.join(' ') },
      ],
      nextId: state.nextId + 2,
    }));
  },

  setStream(text: string): void {
    set((state) => {
      const last = state.lines.at(-1);
      if (last === undefined) return state;

      if (last.kind === 'narrator') {
        const lines = [...state.lines];
        lines[lines.length - 1] = { ...last, streaming: true };
        return { lines, streaming: true };
      }

      return {
        lines: [
          ...state.lines,
          { id: state.nextId, kind: 'narrator' as const, text, streaming: true },
        ],
        nextId: state.nextId + 1,
        streaming: true,
      };
    });
  },

  completeNarration(text: string): void {
    set((state) => {
      const lines = [...state.lines];
      const last = lines.at(-1);

      if (last !== undefined && last.kind === 'narrator') {
        const trimmed = text.trim();
        lines[lines.length - 1] = { ...last, text: trimmed.length > 0 ? trimmed : last.text, streaming: false };
        return { lines, busy: false, streaming: false };
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) return { busy: false, streaming: false };
      return {
        lines: [
          ...lines,
          { id: state.nextId, kind: 'narrator' as const, text: trimmed },
        ],
        nextId: state.nextId + 1,
        busy: false,
        streaming: false,
      };
    });
  },

  failNarration(reason: string): void {
    set((state) => {
      const lines = [...state.lines];
      const last = lines.at(-1);
      if (last !== undefined && last.kind === 'narrator' && last.streaming === true) {
        lines[lines.length - 1] = { ...last, streaming: false };
        return { lines, busy: false, streaming: false };
      }
      return {
        lines: [...lines, { id: state.nextId, kind: 'system' as const, text: reason }],
        nextId: state.nextId + 1,
        busy: false,
        streaming: false,
      };
    });
  },

  sleep(): void {
    if (get().status !== 'playing') return;
    const state = advanceNight({ world: get().world, last: null, status: get().status });
    set((s) => ({
      world: state.world,
      status: state.status,
      busy: false,
      lines: [...s.lines, { id: s.nextId, kind: 'system' as const, text: `Night ${state.world.night}.` }],
      nextId: s.nextId + 1,
    }));
    get().persist();
  },

  restart(): void {
    const storage = safeStorage();
    if (storage !== null) clearSave(storage);
    set((state) => ({
      world: createWorld(nextSeed(state.world)),
      lines: [{ id: 0, kind: 'system', text: 'You are the new barman again, and the fire is still out.' }],
      status: 'playing',
      lastBrief: null,
      streaming: false,
      busy: false,
      nextId: 1,
      saveNote: null,
    }));
  },

  pushSystem(text: string): void {
    set((state) => ({
      lines: [...state.lines, { id: state.nextId, kind: 'system' as const, text }],
      nextId: state.nextId + 1,
    }));
  },

  persist(): void {
    const storage = safeStorage();
    if (storage === null) return;
    const ok = saveGame(storage, get().world, new Date());
    set({ saveNote: ok ? null : 'Could not save: storage is full or blocked.' });
  },

  hydrate(): void {
    const storage = safeStorage();
    if (storage === null) return;
    const result = loadGame(storage);
    if (result.status !== 'ok' || result.world === null) return;
    set((state) => ({
      world: result.world!,
      status: statusOf(result.world!),
      lines: [
        ...state.lines,
        { id: state.nextId, kind: 'system', text: 'Your last shift is picked up where you left it.' },
      ],
      nextId: state.nextId + 1,
    }));
  },

  dismissSaveNote(): void {
    set({ saveNote: null });
  },
}));

function statusOf(world: World): GameStore['status'] {
  if (world.nerve <= 0) return 'lost';
  if (world.night > 3 && world.silver >= 20) return 'won';
  return 'playing';
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function endingText(world: World): string {
  return endingFor({ world, last: null, status: statusOf(world) });
}

export function progressFor(world: World): number {
  return progressOf(world);
}