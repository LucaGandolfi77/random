import type { NarratorBackend } from '../src/narrator/types';
import { GENERATION_PARAMS, DETERMINISTIC_PARAMS, SYSTEM_PROMPT, buildUserMessage } from '../src/narrator/prompt';
import { createTemplateBackend } from '../src/narrator/template';
import { createTransformersBackend, hasWebGpu, MODEL_SPECS, registerSpec } from '../src/narrator/transformers';
import { worstCaseBytes } from '../src/narrator/models';
import { CASES, type BenchCase } from './cases';
import { analyse, formatBytes } from './metrics';
import type { Environment, RunRecord } from './report';
import { buildReport } from './report';

const params = {
  sampled: { ...GENERATION_PARAMS },
  deterministic: { ...DETERMINISTIC_PARAMS },
};

const paramsLabel = {
  sampled: 'sampled (temperature 0.85, top_p 0.9, repetition_penalty 1.1)',
  deterministic: 'deterministic (greedy, do_sample false)',
} as const;

type ParamMode = keyof typeof params;

const records: RunRecord[] = [];
let running = false;
let abortController: AbortController | null = null;

type Attrs = Record<string, string | Record<string, string>>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'string') node.setAttribute(key, value);
    else for (const [sub, subValue] of Object.entries(value)) node.setAttribute(`${key}-${sub}`, subValue);
  }
  for (const child of children) node.append(child);
  return node;
}

const root = document.getElementById('root');
if (root === null) throw new Error('missing #root');

const heading = el('h1', {}, ['The Drowned Ox — narrator spike']);
const intro = el('p', { class: 'intro' }, [
  'Twenty briefs, four backends, one job: find out whether a model small enough to download on a phone can describe a scene it has been handed without inventing anything, mentioning dice, or falling into a loop.',
]);
root.append(heading, intro);

const statusBar = el('div', { class: 'status', id: 'status' }, ['idle']);
const logBox = el('pre', { class: 'log', id: 'log' });
const resultsBox = el('div', { class: 'results', id: 'results' });

function log(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  logBox.textContent = `${stamp}  ${message}\n${logBox.textContent ?? ''}`;
}

const environmentBox = el('div', { class: 'panel', id: 'env' });
const backendBox = el('div', { class: 'panel', id: 'backends' });
const caseBox = el('div', { class: 'panel', id: 'cases' });
const controlBox = el('div', { class: 'panel', id: 'controls' });

root.append(environmentBox, backendBox, caseBox, controlBox, statusBar, el('div', { class: 'buttons' }), resultsBox, logBox);

const selectedCases = new Set<string>(CASES.map((benchCase) => benchCase.id));
let mode: ParamMode = 'sampled';
const loadedBackends = new Map<string, NarratorBackend>();

function checked(value: boolean): HTMLInputElement {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = value;
  return box;
}

async function renderEnvironment(): Promise<void> {
  const webgpu = await hasWebGpu();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  const environment: Environment = {
    userAgent: navigator.userAgent,
    webgpu,
    crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    deviceMemoryGb: nav.deviceMemory ?? null,
    quotaBytes: estimate?.quota ?? null,
    usageBytes: estimate?.usage ?? null,
  };

  environmentBox.replaceChildren(
    el('h2', {}, ['Environment']),
    el(
      'ul',
      {},
      [
        `WebGPU: ${webgpu ? 'available' : 'not available'}`,
        `Cross-origin isolated: ${environment.crossOriginIsolated}`,
        `Device memory: ${environment.deviceMemoryGb ?? 'not reported'}`,
        `Storage used: ${formatBytes(environment.usageBytes ?? 0)} of ${formatBytes(environment.usageBytes !== null ? environment.usageBytes + (environment.quotaBytes ?? 0) : 0)}`,
      ].map((line) => el('li', {}, [line])),
    ),
    el('button', { id: 'persist' }, ['Request persistent storage']),
  );

  const persist = document.getElementById('persist');
  persist?.addEventListener('click', () => {
    void navigator.storage?.persist?.().then((granted) => {
      log(`storage.persist() -> ${granted ? 'granted' : 'denied'}`);
    });
  });
}

function backendFor(specIndex: number): NarratorBackend | null {
  const spec = MODEL_SPECS[specIndex];
  if (spec === undefined) return null;
  const existing = loadedBackends.get(spec.backendId);
  if (existing !== undefined) return existing;
  const created = createTransformersBackend(spec, params[mode]);
  loadedBackends.set(spec.backendId, created);
  return created;
}

function loadBackendById(backendId: string): Promise<void> {
  const spec = MODEL_SPECS.find((candidate) => candidate.backendId === backendId);
  if (spec === undefined) return Promise.reject(new Error(`unknown backend ${backendId}`));
  const backend = backendFor(MODEL_SPECS.indexOf(spec));
  if (backend === null) return Promise.reject(new Error(`no backend for ${backendId}`));

  const bar = el('div', { class: 'bar' }, [el('div', { class: 'fill' })]);
  backendBox.append(bar);
  const fill = bar.querySelector('.fill') as HTMLElement;

  return backend
    .load((progress) => {
      fill.style.width = `${progress.progress}%`;
      log(`${spec.label}: ${progress.progress}% (${formatBytes(progress.loaded)} / ${formatBytes(progress.total)})`);
    })
    .then(() => {
      log(`${spec.label}: ready`);
    })
    .finally(() => {
      bar.remove();
    });
}

function renderBackends(): void {
  const rows: Array<Node> = [
    el('h2', {}, ['Backends']),
    el('p', { class: 'note' }, [
      'The template backend is the floor: it is what ships when no model is available, and the game must be fully playable with it.',
    ]),
  ];

  const templateRow = el('label', { class: 'row' }, ['Template narrator (0 B)']);
  const templateBox = checked(true);
  templateBox.dataset.backend = 'template';
  templateRow.prepend(templateBox);
  rows.push(templateRow);

  MODEL_SPECS.forEach((spec, index) => {
    const row = el('label', { class: 'row' }, [
      `${spec.label} (${formatBytes(worstCaseBytes(spec))})`,
      el('button', { class: 'inline', dataset: { load: String(index) } }, ['load']),
    ]);
    const box = checked(index === 0);
    box.dataset.backend = spec.backendId;
    row.prepend(box);
    row.querySelector('button')?.addEventListener('click', (event) => {
      event.preventDefault();
      void loadBackendById(spec.backendId).catch((error: unknown) => {
        log(`${spec.label}: load failed -> ${String(error)}`);
      });
    });
    rows.push(row);
  });

  backendBox.replaceChildren(...rows);
}

function renderCases(): void {
  const rows: Array<Node> = [el('h2', {}, ['Cases'])];
  for (const benchCase of CASES) {
    const row = el('label', { class: `row case ${benchCase.group}` }, [
      `${benchCase.id} — ${benchCase.label}`,
      el('span', { class: 'look' }, [benchCase.lookFor]),
    ]);
    const box = checked(true);
    box.dataset.case = benchCase.id;
    box.addEventListener('change', () => {
      if (box.checked) selectedCases.add(benchCase.id);
      else selectedCases.delete(benchCase.id);
    });
    row.prepend(box);
    rows.push(row);
  }

  const all = el('button', { class: 'inline' }, ['all']);
  const none = el('button', { class: 'inline' }, ['none']);
  const group = el('button', { class: 'inline' }, ['adversarial only']);
  rows.push(el('div', { class: 'row' }, [all, none, group]));
  all.addEventListener('click', () => {
    selectedCases.clear();
    for (const benchCase of CASES) selectedCases.add(benchCase.id);
    renderCases();
  });
  none.addEventListener('click', () => {
    selectedCases.clear();
    renderCases();
  });
  group.addEventListener('click', () => {
    selectedCases.clear();
    for (const benchCase of CASES) {
      if (benchCase.group === 'adversarial') selectedCases.add(benchCase.id);
    }
    renderCases();
  });

  caseBox.replaceChildren(...rows);
}

function selectedBackendIds(): Array<string> {
  return [...backendBox.querySelectorAll<HTMLInputElement>('input[data-backend]')]
    .filter((box) => box.checked)
    .map((box) => box.dataset.backend ?? '');
}

function renderControls(): void {
  const label = el('label', { class: 'row' }, [
    'Parameters:',
    el('span', { id: 'modeLabel' }, [paramsLabel[mode]]),
  ]);
  const toggle = el('button', { class: 'inline' }, ['toggle']);
  toggle.addEventListener('click', () => {
    mode = mode === 'sampled' ? 'deterministic' : 'sampled';
    loadedBackends.clear();
    renderControls();
    log(`params -> ${mode}; reload the page to apply to already-loaded backends`);
  });

  const exportButton = el('button', { id: 'export' }, ['Export results.md']);
  exportButton.addEventListener('click', () => {
    const estimate = navigator.storage?.estimate?.();
    void estimate
      .catch(() => undefined)
      .then((result) => {
        const nav = navigator as Navigator & { deviceMemory?: number };
        const report = buildReport(
          {
            userAgent: navigator.userAgent,
            webgpu: false,
            crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
            deviceMemoryGb: nav.deviceMemory ?? null,
            quotaBytes: result?.quota ?? null,
            usageBytes: result?.usage ?? null,
          },
          records,
          paramsLabel[mode],
        );
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = el('a', { href: url, download: 'RESULTS.md' });
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
  });

  controlBox.replaceChildren(el('h2', {}, ['Controls']), label, toggle, exportButton);
}

const buttonsRow = root.querySelector('.buttons');
const runButton = el('button', { class: 'primary' }, ['Run spike']);
const stopButton = el('button', {}, ['Abort']);
const previewButton = el('button', {}, ['Preview prompts']);
buttonsRow?.append(runButton, stopButton, previewButton);

async function runOne(benchCase: BenchCase, backend: NarratorBackend): Promise<void> {
  const controller = new AbortController();
  abortController = controller;

  const started = performance.now();
  let ttftMs = 0;
  let text = '';
  let error: string | null = null;

  try {
    const streamed = await backend.narrate(
      benchCase.brief,
      (chunk) => {
        if (ttftMs === 0) ttftMs = performance.now() - started;
        text += chunk;
      },
      controller.signal,
    );
    text = streamed.length > 0 ? streamed : text;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const genMs = performance.now() - started;
  const metrics = error === null ? analyse(text) : analyse('');
  const tokens = Math.max(1, Math.round(text.length / 4));

  const record: RunRecord = {
    caseId: benchCase.id,
    group: benchCase.group,
    backendId: backend.id,
    backendLabel: backend.label,
    device: (backend as { activeDevice?: () => string | null }).activeDevice?.() ?? 'template',
    ttftMs: Math.round(ttftMs),
    genMs: Math.round(genMs),
    tokens,
    tokPerSec: genMs > 0 ? (tokens / genMs) * 1000 : 0,
    text,
    metrics,
    error,
  };

  records.push(record);
  log(`${benchCase.id} / ${backend.label}: ${error ?? (metrics.pass ? 'clean' : metrics.failures.join(', '))}`);
  renderResults();
}

function renderResults(): void {
  if (records.length === 0) {
    resultsBox.replaceChildren(el('p', { class: 'note' }, ['No runs yet.']));
    return;
  }

  const pass = records.filter((record) => record.error === null && record.metrics.pass).length;
  const rows = records.map((record) =>
    el('tr', { class: record.metrics.pass ? 'ok' : 'bad' }, [
      el('td', {}, [record.caseId]),
      el('td', {}, [record.backendLabel]),
      el('td', {}, [String(record.metrics.sentences)]),
      el('td', {}, [record.tokPerSec.toFixed(1)]),
      el('td', {}, [`${record.ttftMs} ms`]),
      el('td', {}, [record.error ?? (record.metrics.failures.join(', ') || 'clean')]),
      el('td', { class: 'out' }, [record.text.trim() || '(empty)']),
    ]),
  );

  resultsBox.replaceChildren(
    el('h2', {}, [`Results — ${pass}/${records.length} clean`]),
    el('table', {}, [
      el('thead', {}, [
        el('tr', {}, ['Case', 'Backend', 'Sent', 'tok/s', 'TTFT', 'Flags', 'Output'].map((h) => el('th', {}, [h]))),
      ]),
      el('tbody', {}, rows),
    ]),
  );
}

async function runBench(backendIds: string[]): Promise<void> {
  if (running) return;
  running = true;
  runButton.setAttribute('disabled', 'true');

  const cases = CASES.filter((benchCase) => selectedCases.has(benchCase.id));

  for (const backendId of backendIds) {
    const backend =
      backendId === 'template'
        ? createTemplateBackend()
        : (() => {
            const index = MODEL_SPECS.findIndex((spec) => spec.backendId === backendId);
            return index >= 0 ? backendFor(index) : null;
          })();

    if (backend === null) continue;
    if (backendId !== 'template' && loadedBackends.has(backendId) === false) continue;

    statusBar.textContent = `running ${backendId} (${cases.length} cases)`;
    for (const benchCase of cases) {
      if (abortController?.signal.aborted) break;
      // oxlint-disable-next-line no-await-in-loop -- sequential so timings stay meaningful
      await runOne(benchCase, backend);
    }
  }

  statusBar.textContent = 'done';
  running = false;
  runButton.removeAttribute('disabled');
}

runButton.addEventListener('click', () => {
  void runBench(selectedBackendIds());
});

stopButton.addEventListener('click', () => {
  abortController?.abort();
  statusBar.textContent = 'aborted';
  log('abort requested');
});

previewButton.addEventListener('click', () => {
  const firstCase = CASES[0];
  if (firstCase === undefined) throw new Error('bench has no cases');
  logBox.textContent = `${SYSTEM_PROMPT}\n\n========\n\n${buildUserMessage(firstCase.brief)}`;
});

void renderEnvironment();
renderBackends();
renderCases();
renderControls();
renderResults();

async function readEnvironment(): Promise<Environment> {
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  return {
    userAgent: navigator.userAgent,
    webgpu: await hasWebGpu(),
    crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    quotaBytes: estimate?.quota ?? null,
    usageBytes: estimate?.usage ?? null,
  };
}

Object.assign(globalThis as Record<string, unknown>, {
  __spike: {
    records,
    runBench,
    loadBackend: loadBackendById,
    registerSpec,
    selectCases: (ids: string[]) => {
      selectedCases.clear();
      for (const id of ids) selectedCases.add(id);
    },
    readEnvironment,
    report: async (label: string) => buildReport(await readEnvironment(), records, label),
  },
});