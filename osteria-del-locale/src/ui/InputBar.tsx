import { useState } from 'react';
import { useGameStore } from '../state/gameStore';

const SUGGESTIONS = [
  'look around',
  'ask about the price',
  'ask about the dog',
  'offer the innkeeper two silver',
  'attack the dog',
  'go down',
  'inventory',
  'rest',
];

export function InputBar() {
  const [value, setValue] = useState('');
  const submit = useGameStore((state) => state.submit);
  const busy = useGameStore((state) => state.busy);
  const status = useGameStore((state) => state.status);
  const sleep = useGameStore((state) => state.sleep);
  const restart = useGameStore((state) => state.restart);

  if (status !== 'playing') {
    return (
      <div className="input-bar finished">
        <button type="button" className="primary" onClick={restart}>
          Take the job again
        </button>
      </div>
    );
  }

  return (
    <form
      className="input-bar"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
        setValue('');
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="What do you do?"
        aria-label="What do you do?"
        autoComplete="off"
        disabled={busy}
        enterKeyHint="send"
      />
      <button type="submit" disabled={busy || value.trim().length === 0}>
        {busy ? '…' : 'Do it'}
      </button>
      <button type="button" className="ghost" onClick={sleep} disabled={busy}>
        Sleep
      </button>
    </form>
  );
}

export function Suggestions() {
  const submit = useGameStore((state) => state.submit);
  const busy = useGameStore((state) => state.busy);

  return (
    <div className="suggestions">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => submit(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}