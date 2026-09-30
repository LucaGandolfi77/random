import { useNarratorStore } from '../state/narratorStore';
import { formatBytes } from '../platform/storage';
import type { NarratorPhase } from '../state/narratorStore';

const PHASE_TEXT: Record<NarratorPhase, string> = {
  probing: 'Checking what this device can do…',
  ready: 'Ready.',
  'needs-download': 'A model has to be downloaded before the narrator can speak.',
  downloading: 'Downloading the model. This happens once.',
  loading: 'Warming up the model…',
  narrating: 'Narrating…',
  error: 'Something went wrong.',
  unsupported: 'This device cannot run a model here.',
};

export function ModelPanel() {
  const phase = useNarratorStore((state) => state.phase);
  const tiers = useNarratorStore((state) => state.tiers);
  const selectedId = useNarratorStore((state) => state.selectedId);
  const activeId = useNarratorStore((state) => state.activeId);
  const activeDevice = useNarratorStore((state) => state.activeDevice);
  const progress = useNarratorStore((state) => state.progress);
  const capabilities = useNarratorStore((state) => state.capabilities);
  const storage = useNarratorStore((state) => state.storage);
  const message = useNarratorStore((state) => state.message);
  const select = useNarratorStore((state) => state.select);
  const loadSelected = useNarratorStore((state) => state.loadSelected);

  const selected = tiers.find((tier) => tier.id === selectedId);
  const busy = phase === 'downloading' || phase === 'loading';

  return (
    <section className="model-panel" aria-label="Narrator">
      <header>
        <h2>Narrator</h2>
        <span className="phase" data-phase={phase}>
          {PHASE_TEXT[phase]}
        </span>
      </header>

      {capabilities !== null && (
        <p className="caps">
          WebGPU {capabilities.webgpu} · device memory{' '}
          {capabilities.deviceMemoryGb === null ? 'unreported' : `${capabilities.deviceMemoryGb} GB`}
          {storage?.persisted === true ? ' · storage persistent' : ''}
        </p>
      )}

      <ul className="tiers">
        {tiers.map((tier) => (
          <li key={tier.id}>
            <label>
              <input
                type="radio"
                name="tier"
                value={tier.id}
                checked={selectedId === tier.id}
                onChange={() => select(tier.id)}
                disabled={busy}
              />
              <span className="tier-label">{tier.label}</span>
              <span className="tier-bytes">{tier.bytes === 0 ? 'no download' : formatBytes(tier.bytes)}</span>
            </label>
            <p className="tier-note">
              {tier.probe !== null && tier.probe.available === false ? tier.probe.reason : tier.note}
            </p>
          </li>
        ))}
      </ul>

      {message !== null && <p className="warning">{message}</p>}

      {progress !== null && (
        <div className="bar" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="fill" style={{ width: `${progress.percent}%` }} />
        </div>
      )}

      {progress !== null && (
        <p className="progress-text">
          {progress.percent}% · {formatBytes(progress.loaded)} of {formatBytes(progress.total)}
        </p>
      )}

      {activeId !== null && (
        <p className="active">
          Narrating with {activeId}
          {activeDevice === null ? '' : ` on ${activeDevice}`}.
        </p>
      )}

      {selected !== undefined && selected.tier === 'download' && (
        <button type="button" className="primary" onClick={() => void loadSelected()} disabled={busy}>
          {phase === 'downloading' ? 'Downloading…' : `Download ${selected.label}`}
        </button>
      )}
    </section>
  );
}