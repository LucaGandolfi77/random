import type { BackendId } from '../src/narrator/types';
import type { CaseGroup } from './cases';
import { CASES } from './cases';
import type { TextMetrics } from './metrics';
import { formatBytes } from './metrics';

export interface RunRecord {
  caseId: string;
  group: CaseGroup;
  backendId: BackendId;
  backendLabel: string;
  device: string;
  ttftMs: number;
  genMs: number;
  tokens: number;
  tokPerSec: number;
  text: string;
  metrics: TextMetrics;
  error: string | null;
}

export interface Environment {
  userAgent: string;
  webgpu: boolean;
  crossOriginIsolated: boolean;
  deviceMemoryGb: number | null;
  quotaBytes: number | null;
  usageBytes: number | null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function pct(value: number, total: number): string {
  if (total === 0) return 'n/a';
  return `${Math.round((value / total) * 100)}%`;
}

function summarise(records: RunRecord[]): string {
  const byBackend = new Map<BackendId, RunRecord[]>();
  for (const record of records) {
    const bucket = byBackend.get(record.backendId);
    if (bucket === undefined) byBackend.set(record.backendId, [record]);
    else bucket.push(record);
  }

  const lines = [
    '| Backend | Device | Cases | Format pass | Median TTFT | Median tok/s | Median chars |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const [backendId, bucket] of byBackend) {
    const ok = bucket.filter((record) => record.metrics.pass).length;
    const devices = [...new Set(bucket.map((record) => record.device))].join(', ') || 'n/a';
    const label = bucket[0]?.backendLabel ?? backendId;
    const perSec = bucket.filter((record) => record.tokPerSec > 0);
    lines.push(
      `| ${label} | ${devices} | ${bucket.length} | ${pct(ok, bucket.length)} | ${Math.round(
        median(bucket.map((record) => record.ttftMs)),
      )} ms | ${median(perSec.map((record) => record.tokPerSec)).toFixed(1)} | ${Math.round(
        median(bucket.map((record) => record.metrics.chars)),
      )} |`,
    );
  }

  return lines.join('\n');
}

function detail(records: RunRecord[]): string {
  const header = ['| Case | Backend | Sentences | Repeat | Flags |', '| --- | --- | --- | --- | --- |'];
  const rows = records.map((record) => {
    const flags = record.error !== null ? `error: ${record.error}` : record.metrics.failures.join(', ') || 'clean';
    return `| ${record.caseId} | ${record.backendLabel} | ${record.metrics.sentences} | ${record.metrics.repetitionIndex.toFixed(
      2,
    )} | ${flags} |`;
  });
  return [...header, ...rows].join('\n');
}

function transcript(records: RunRecord[]): string {
  const parts: string[] = [];
  for (const benchCase of CASES) {
    const matching = records.filter((record) => record.caseId === benchCase.id);
    if (matching.length === 0) continue;
    parts.push(`### ${benchCase.id} — ${benchCase.label}`);
    parts.push(`> Look for: ${benchCase.lookFor}`);
    parts.push('');
    for (const record of matching) {
      parts.push(`**${record.backendLabel}** (${record.tokPerSec.toFixed(1)} tok/s)`);
      parts.push('');
      parts.push(record.text.trim() || '(empty output)');
      parts.push('');
    }
  }
  return parts.join('\n');
}

export function buildReport(environment: Environment, records: RunRecord[], paramsLabel: string): string {
  const errored = records.filter((record) => record.error !== null).length;

  const header = [
    '# Spike results — The Drowned Ox narrator',
    '',
    `Generation parameters: \`${paramsLabel}\``,
    '',
    '## Environment',
    '',
    `- User agent: \`${environment.userAgent}\``,
    `- WebGPU: ${environment.webgpu ? 'available' : 'not available'}`,
    `- Cross-origin isolated (SharedArrayBuffer): ${environment.crossOriginIsolated}`,
    `- Device memory: ${environment.deviceMemoryGb === null ? 'not reported' : `${environment.deviceMemoryGb} GB`}`,
    `- Storage: ${formatBytes(environment.usageBytes ?? 0)} used of ${formatBytes(environment.quotaBytes ?? 0)}`,
    '',
    '## Verdict',
    '',
    `- Records: ${records.length}, errors: ${errored}`,
    '',
    '## Summary',
    '',
    summarise(records),
    '',
    '## Detail',
    '',
    detail(records),
    '',
    '## Transcript',
    '',
    transcript(records),
    '',
  ];

  return header.join('\n');
}