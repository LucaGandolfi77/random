import type { Capabilities } from './capability';

export interface StorageReport {
  quotaBytes: number | null;
  usageBytes: number | null;
  headroomBytes: number | null;
  persisted: boolean;
  canPersist: boolean;
}

export async function readStorage(): Promise<StorageReport> {
  const storage = navigator.storage as StorageManager | undefined;
  if (storage === undefined) {
    return { quotaBytes: null, usageBytes: null, headroomBytes: null, persisted: false, canPersist: false };
  }

  const canPersist = typeof storage.persist === 'function';
  let persisted = false;
  if (typeof storage.persisted === 'function') {
    persisted = await storage.persisted().catch(() => false);
  }

  const estimate = await storage.estimate?.().catch(() => undefined);
  const quotaBytes = estimate?.quota ?? null;
  const usageBytes = estimate?.usage ?? null;
  const headroomBytes = quotaBytes === null ? null : Math.max(0, quotaBytes - (usageBytes ?? 0));

  return { quotaBytes, usageBytes, headroomBytes, persisted, canPersist };
}

export async function requestPersistence(): Promise<boolean> {
  const storage = navigator.storage as StorageManager | undefined;
  if (storage?.persist === undefined) return false;
  return storage.persist().catch(() => false);
}

export interface FitVerdict {
  ok: boolean;
  reason: 'fits' | 'unknown-quota' | 'not-enough-room' | 'too-small-to-matter';
  detail: string;
}

const SAFETY_MARGIN = 64 * 1024 * 1024;
const FLOOR = 1 * 1024 * 1024;

export function checkDownloadFits(needBytes: number, storage: StorageReport): FitVerdict {
  if (storage.headroomBytes === null) {
    return {
      ok: true,
      reason: 'unknown-quota',
      detail: 'The browser will not report how much space is left, so this may fail part-way.',
    };
  }

  if (storage.headroomBytes < FLOOR) {
    return {
      ok: false,
      reason: 'too-small-to-matter',
      detail: 'There is almost no free space left. The model would not survive the download.',
    };
  }

  const required = needBytes + SAFETY_MARGIN;
  if (storage.headroomBytes < required) {
    return {
      ok: false,
      reason: 'not-enough-room',
      detail: `Needs about ${formatBytes(required)} including headroom, but only ${formatBytes(storage.headroomBytes)} is free.`,
    };
  }

  return { ok: true, reason: 'fits', detail: `About ${formatBytes(needBytes)} will be used.` };
}

export function shouldWarnDataSaver(caps: Capabilities, needBytes: number): boolean {
  if (caps.ios) return true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData === true) return true;
  if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') return true;
  return needBytes > 200 * 1024 * 1024;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}