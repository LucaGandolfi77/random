import type { FindingStatus, Severity } from "../types";

export const severityTone: Record<Severity, string> = {
  CRITICAL: "text-red-300",
  HIGH: "text-orange-300",
  MEDIUM: "text-amber-300",
  LOW: "text-sky-300",
  INFO: "text-slate-400",
};

export const severityChip: Record<Severity, string> = {
  CRITICAL: "bg-red-500/15 text-red-300 border-red-500/40",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  LOW: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  INFO: "bg-slate-600/20 text-slate-300 border-slate-600/50",
};

export const statusChip: Record<FindingStatus, string> = {
  PASS: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  WARNING: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  FAIL: "bg-red-500/15 text-red-300 border-red-500/40",
  NOT_APPLICABLE: "bg-slate-600/20 text-slate-400 border-slate-600/50",
  NOT_EVALUATED: "bg-slate-600/20 text-slate-400 border-slate-600/50",
};

export const statusDot: Record<FindingStatus, string> = {
  PASS: "bg-emerald-400",
  WARNING: "bg-amber-400",
  FAIL: "bg-red-400",
  NOT_APPLICABLE: "bg-slate-500",
  NOT_EVALUATED: "bg-slate-600",
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function joinClassName(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const SCORE_DISCLAIMER =
  "The Data Readiness Score is a decision-support indicator. It does not replace engineering review, mission-specific validation, safety analysis or formal certification.";
