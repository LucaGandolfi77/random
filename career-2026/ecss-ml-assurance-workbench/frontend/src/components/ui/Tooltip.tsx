import { Info } from "lucide-react";
import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

/** Small inline tooltip (native title + icon) for terms like ODD, leakage, severity. */
export function Term({ label, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span className="cursor-help border-b border-dotted border-slate-500 text-slate-300">{children}</span>
      <Info className="h-3 w-3 text-slate-500" aria-hidden />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-56 -translate-x-1/2 rounded border border-slate-700 bg-base-900 p-2 text-xs font-normal normal-case text-slate-300 shadow-lg group-hover:block"
      >
        {label}
      </span>
    </span>
  );
}
