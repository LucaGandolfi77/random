import { useEffect } from 'react';
import { Transcript, useNarrationRunner } from './Transcript';
import { InputBar, Suggestions } from './InputBar';
import { ModelPanel } from './ModelPanel';
import { useGameStore, endingText, progressFor } from '../state/gameStore';
import { useNarratorStore } from '../state/narratorStore';

export function TavernScreen() {
  const world = useGameStore((state) => state.world);
  const status = useGameStore((state) => state.status);
  const saveNote = useGameStore((state) => state.saveNote);
  const persist = useGameStore((state) => state.persist);
  const hydrate = useGameStore((state) => state.hydrate);
  const dismissSaveNote = useGameStore((state) => state.dismissSaveNote);
  const probe = useNarratorStore((state) => state.probe);

  useEffect(() => {
    void probe();
    hydrate();
  }, [probe, hydrate]);

  useNarrationRunner();

  useEffect(() => {
    persist();
  }, [world, persist]);

  const progress = Math.round(progressFor(world) * 100);

  return (
    <main className="tavern">
      <header className="topbar">
        <div>
          <h1>The Drowned Ox</h1>
          <p className="sub">
            Night {world.night} · {world.silver} silver · nerve {world.nerve}
          </p>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <Transcript />

      {status !== 'playing' && <p className="ending">{endingText(world)}</p>}

      {saveNote !== null && (
        <div className="banner" role="status">
          <span>{saveNote}</span>
          <button type="button" className="ghost" onClick={dismissSaveNote}>
            Dismiss
          </button>
        </div>
      )}

      <Suggestions />
      <InputBar />
      <ModelPanel />
    </main>
  );
}