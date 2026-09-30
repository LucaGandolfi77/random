import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TavernScreen } from './TavernScreen';
import { useGameStore } from '../state/gameStore';
import { useNarratorStore, INITIAL_STATE } from '../state/narratorStore';

function resetGame() {
  useGameStore.setState({
    world: useGameStore.getState().world,
    lines: [{ id: 0, kind: 'system', text: 'You are the new barman.' }],
    status: 'playing',
    lastBrief: null,
    streaming: false,
    nextId: 1,
    busy: false,
    saveNote: null,
  });
}

function resetNarrator() {
  useNarratorStore.setState({ ...INITIAL_STATE });
}

beforeEach(() => {
  localStorage.clear();
  resetGame();
  resetNarrator();
  useNarratorStore.setState({ phase: 'ready', activeId: 'template', tiers: [], selectedId: 'template' });
});

describe('TavernScreen', () => {
  it('renders the title and the opening line', async () => {
    render(<TavernScreen />);
    expect(screen.getByRole('heading', { name: /drowned ox/i })).toBeInTheDocument();
    expect(await screen.findByText(/you are the new barman/i)).toBeInTheDocument();
  });

  it('shows the status bar with night, silver and nerve', async () => {
    render(<TavernScreen />);
    await waitFor(() => expect(screen.getByText(/night 1 · 5 silver · nerve 6/i)).toBeInTheDocument());
  });

  it('offers the input and suggestions', async () => {
    render(<TavernScreen />);
    expect(await screen.findByLabelText(/what do you do/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /look around/i })).toBeInTheDocument();
  });

  it('records the engine facts and the action after a turn', async () => {
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'ask about the dog{Enter}');

    await waitFor(() => expect(screen.getByText(/Legal/)).toBeInTheDocument());
    const lines = useGameStore.getState().lines;
    expect(lines.some((line) => line.kind === 'engine' && line.text.includes('Legal'))).toBe(true);
  });

  it('shows the action the engine understood', async () => {
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'ask about the dog{Enter}');
    await waitFor(() => expect(screen.getByText(/You asked the regular about dog/)).toBeInTheDocument());
  });

  it('narrates with the loaded backend once a turn resolves', async () => {
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'ask about the dog{Enter}');

    await waitFor(() => {
      const lines = useGameStore.getState().lines;
      const narrated = lines.some((line) => line.kind === 'narrator' && line.streaming !== true && line.text.length > 0);
      expect(narrated).toBe(true);
    });
  });

  it('returns to idle when the player has no loaded narrator', async () => {
    useNarratorStore.setState({ phase: 'ready', activeId: null, selectedId: 'template' });
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'look around{Enter}');

    await waitFor(() => expect(useGameStore.getState().busy).toBe(false));
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('shows the narrator panel with its phase', async () => {
    render(<TavernScreen />);
    expect(await screen.findByRole('region', { name: /narrator/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/ready/i)).toBeInTheDocument());
  });

  it('offers a sleep control while playing', async () => {
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    expect(screen.getByRole('button', { name: /sleep/i })).toBeInTheDocument();
  });

  it('advances the night when sleep is used', async () => {
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.click(screen.getByRole('button', { name: /sleep/i }));
    await waitFor(() => expect(useGameStore.getState().world.night).toBe(2));
  });

  it('replaces the input with a restart control once the game ends', async () => {
    useGameStore.setState({ status: 'lost' });
    render(<TavernScreen />);
    expect(await screen.findByRole('button', { name: /take the job again/i })).toBeInTheDocument();
  });

  it('writes the save when the world changes', async () => {
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'wait{Enter}');
    await waitFor(() => expect(localStorage.getItem('drowned-ox-save')).not.toBeNull());
  });

  it('restarts into a fresh game', async () => {
    useGameStore.setState({ status: 'won' });
    const user = userEvent.setup();
    render(<TavernScreen />);
    await user.click(await screen.findByRole('button', { name: /take the job again/i }));
    await waitFor(() => expect(useGameStore.getState().status).toBe('playing'));
    expect(useGameStore.getState().lines[0]?.text).toMatch(/again/i);
  });
});

describe('narrator degradation', () => {
  it('keeps the game playable when narration throws', async () => {
    useNarratorStore.setState({
      phase: 'ready',
      activeId: 'template',
      tiers: [],
      selectedId: 'template',
    });

    const backend = useNarratorStore.getState().activeBackend;
    expect(backend).not.toBeNull();

    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'attack the dog{Enter}');

    await waitFor(() => expect(useGameStore.getState().busy).toBe(false));
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('never leaves the phase stuck in narrating', async () => {
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await user.type(screen.getByLabelText(/what do you do/i), 'go down{Enter}');
    await waitFor(() => expect(useNarratorStore.getState().phase).not.toBe('narrating'));
  });
});

describe('no model required', () => {
  it('plays a full turn with no tier selected', async () => {
    useNarratorStore.setState({ phase: 'ready', activeId: null, selectedId: 'template', tiers: [] });
    const user = userEvent.setup();
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);

    const inputs = ['look around', 'ask about the price', 'go down', 'go out', 'inventory'];
    for (const input of inputs) {
      // oxlint-disable-next-line no-await-in-loop -- turns must be played one at a time
      await user.type(screen.getByLabelText(/what do you do/i), `${input}{Enter}`);
      // oxlint-disable-next-line no-await-in-loop -- each turn must settle before the next
      await waitFor(() => expect(useGameStore.getState().busy).toBe(false));
    }

    expect(useGameStore.getState().world.turn).toBeGreaterThanOrEqual(5);
    expect(useGameStore.getState().status).toBe('playing');
  });
});

describe('no console noise', () => {
  it('renders without logging errors or warnings', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TavernScreen />);
    await screen.findByLabelText(/what do you do/i);
    await waitFor(() => expect(screen.getByText(/night 1/i)).toBeInTheDocument());
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});