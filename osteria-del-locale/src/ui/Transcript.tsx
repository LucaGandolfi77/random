import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { useNarratorStore } from '../state/narratorStore';
import { vibrate } from '../platform/haptics';
import type { Line } from '../state/gameStore';
import type { HapticKind } from '../platform/haptics';

export function Transcript() {
  const lines = useGameStore((state) => state.lines);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  return (
    <div className="transcript" role="log" aria-live="polite" aria-label="Narrative">
      {lines.map((line) => (
        <Paragraph key={line.id} line={line} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function Paragraph({ line }: { line: Line }) {
  if (line.kind === 'player') return <p className="line player">{line.text}</p>;
  if (line.kind === 'system') return <p className="line system">{line.text}</p>;
  if (line.kind === 'ending') return <p className="line ending">{line.text}</p>;
  if (line.kind === 'engine') return <p className="line engine">{line.text}</p>;

  return <p className={`line narrator${line.streaming === true ? ' streaming' : ''}`}>{line.text}</p>;
}

function beatOf(beat: string): HapticKind {
  switch (beat) {
    case 'deal':
      return 'deal';
    case 'refused':
      return 'refused';
    case 'discovery':
      return 'discovery';
    case 'danger':
      return 'danger';
    case 'chaos':
      return 'inverted';
    default:
      return 'awkward';
  }
}

export function useNarrationRunner(): void {
  const brief = useGameStore((state) => state.lastBrief);
  const busy = useGameStore((state) => state.busy);
  const activeId = useNarratorStore((state) => state.activeId);
  const setStream = useGameStore((state) => state.setStream);
  const completeNarration = useGameStore((state) => state.completeNarration);
  const failNarration = useGameStore((state) => state.failNarration);
  const setPhase = useNarratorStore((state) => state.setPhase);
  const backendFor = useNarratorStore((state) => state.activeBackend);

  useEffect(() => {
    if (busy === false || brief === null) return;

    const backend = backendFor();
    if (backend === null) {
      completeNarration('');
      failNarration('No narrator is loaded, so the scene stands on the engine account alone.');
      return;
    }

    const controller = new AbortController();
    setPhase('narrating');
    if (brief !== null) vibrate(beatOf(brief.beat));

    backend
      .narrate(brief, (chunk) => setStream(chunk), controller.signal)
      .then((text) => {
        completeNarration(text);
        setPhase('ready');
      })
      .catch((error: unknown) => {
        const aborted = error instanceof Error && error.name === 'GenerationAborted';
        completeNarration('');
        failNarration(aborted ? 'Skipped.' : 'The narrator failed, so the engine account stands on its own.');
        setPhase('ready');
      });

    return () => controller.abort();
  }, [busy, brief, activeId, setStream, completeNarration, failNarration, setPhase, backendFor]);
}