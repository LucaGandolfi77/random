import type { FindingStatus, Severity } from "../../types";
import { joinClassName, severityChip, statusChip } from "../../utils/format";

export function SeverityChip({ value }: { value: Severity }) {
  return (
    <span className={joinClassName("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", severityChip[value])}>
      {value}
    </span>
  );
}

export function StatusChip({ value }: { value: FindingStatus }) {
  return (
    <span className={joinClassName("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", statusChip[value])}>
      {value}
    </span>
  );
}
