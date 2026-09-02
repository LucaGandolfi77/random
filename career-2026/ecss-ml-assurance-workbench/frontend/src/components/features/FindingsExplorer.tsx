import { useMemo, useState } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { useFindings, DEFAULT_FILTERS, type FindingsFilters } from "../../hooks/useFindings";
import { SeverityChip, StatusChip } from "../ui/Chips";
import { EmptyState, ErrorState, Spinner } from "../ui/Feedback";
import { joinClassName } from "../../utils/format";
import type { ColumnInfo, Finding, FindingStatus, Severity } from "../../types";

interface ExplorerProps {
  runId?: string;
  columns: ColumnInfo[];
  categories: string[];
  // A limited set of columns on this page are treated as table columns
  showDetails?: boolean;
}

const SORT_OPTIONS: Array<{ value: FindingsFilters["sort"]; label: string }> = [
  { value: "severity", label: "Severity" },
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
  { value: "title", label: "Title" },
  { value: "check_id", label: "Check id" },
];

export function FindingsExplorer({ runId, columns, categories, showDetails = true }: ExplorerProps) {
  const [filters, setFilters] = useState<FindingsFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Finding | null>(null);
  const { data, isLoading, error, isFetching } = useFindings(runId, filters);

  const items = useMemo(() => data?.items ?? [], [data]);
  const categoryOptions = useMemo(() => [...categories].sort(), [categories]);

  const set = (patch: Partial<FindingsFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const toggleSort = (sort: FindingsFilters["sort"]) => {
    if (filters.sort === sort) {
      set({ order: filters.order === "asc" ? "desc" : "asc" });
    } else {
      set({ sort, order: "desc" });
    }
  };

  if (!runId) {
    return (
      <EmptyState
        title="No analysis results"
        description="Upload a dataset and run the analysis to populate this view."
      />
    );
  }
  if (isLoading) return <Spinner label="Loading findings" />;
  if (error) return <ErrorState message="Could not load findings." />;

  return (
    <div className={joinClassName("flex flex-col gap-3", showDetails ? "xl:flex-row" : "")}>
      {/* Filters + table */}
      <div className={joinClassName("min-w-0 flex-1 space-y-2", showDetails && selected ? "xl:w-3/5" : "")}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className="input !w-44 !py-1.5 !pl-7"
              placeholder="Search title / text…"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </div>
          <select className="input !w-auto !py-1.5" value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Filter by status">
            <option value="">All statuses</option>
            {(["PASS", "WARNING", "FAIL", "NOT_APPLICABLE", "NOT_EVALUATED"] as FindingStatus[]).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="input !w-auto !py-1.5" value={filters.severity} onChange={(e) => set({ severity: e.target.value })} aria-label="Filter by severity">
            <option value="">All severities</option>
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as Severity[]).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="input !w-auto !py-1.5" value={filters.category} onChange={(e) => set({ category: e.target.value })} aria-label="Filter by category">
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="input !w-auto !py-1.5" value={filters.column} onChange={(e) => set({ column: e.target.value })} aria-label="Filter by column">
            <option value="">All columns</option>
            {columns.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <select className="input !w-auto !py-1.5" value={filters.sort} onChange={(e) => set({ sort: e.target.value as FindingsFilters["sort"] })} aria-label="Sort by">
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
          <button
            className="btn-secondary !px-2 !py-1.5"
            onClick={() => toggleSort(filters.sort)}
            aria-label="Toggle sort direction"
          >
            {filters.order === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className="ml-auto font-mono text-slate-500">
            {data?.total ?? 0} results{isFetching ? " · refreshing" : ""}
          </span>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full text-left text-xs" data-testid="findings-table">
            <thead className="bg-base-800 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-2 py-2">Severity</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Finding</th>
                <th className="hidden px-2 py-2 md:table-cell">Category</th>
                <th className="hidden px-2 py-2 lg:table-cell">Column(s)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((finding) => (
                <tr
                  key={finding.id}
                  onClick={() => showDetails && setSelected(finding)}
                  className={joinClassName(
                    "border-b border-slate-800/60 align-top transition",
                    showDetails && "cursor-pointer hover:bg-base-800/50",
                    selected?.id === finding.id && "bg-accent-600/10",
                  )}
                >
                  <td className="px-2 py-2">
                    <SeverityChip value={finding.severity} />
                  </td>
                  <td className="px-2 py-2">
                    <StatusChip value={finding.status} />
                  </td>
                  <td className="max-w-md px-2 py-2">
                    <p className="font-medium text-slate-200">{finding.title}</p>
                    <p className="line-clamp-2 text-slate-500">{finding.description}</p>
                    {finding.observed_value && (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">obs: {finding.observed_value}</p>
                    )}
                  </td>
                  <td className="hidden px-2 py-2 text-slate-400 md:table-cell">{finding.category}</td>
                  <td className="hidden px-2 py-2 lg:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {finding.columns.length ? (
                        finding.columns.map((col) => (
                          <span key={col} className="rounded bg-base-800 px-1 font-mono text-[10px] text-accent-300">
                            {col}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-500">No findings match the current filters.</p>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {showDetails && (
        <aside className="w-full shrink-0 xl:w-2/5" aria-live="polite">
          {selected ? (
            <div className="space-y-3 rounded-md border border-slate-800 bg-base-900/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  <SeverityChip value={selected.severity} />
                  <StatusChip value={selected.status} />
                </div>
                <button className="text-xs text-slate-500 underline hover:text-white" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{selected.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{selected.description}</p>
              </div>
              <Dl label="Check" value={selected.check_id} mono />
              <Dl label="Category" value={selected.category} />
              <Dl label="Observed" value={selected.observed_value || "—"} mono />
              <Dl label="Threshold" value={selected.threshold || "—"} mono />
              {selected.columns.length > 0 && <Dl label="Columns" value={selected.columns.join(", ")} mono />}
              <Dl label="Risk" value={selected.risk} />
              <Dl label="Recommendation" value={selected.recommendation} />
              {selected.evidence && Object.keys(selected.evidence).length > 0 && (
                <div>
                  <p className="field-label">Evidence</p>
                  <pre className="max-h-40 overflow-auto rounded bg-base-950 p-2 text-[10px] text-slate-400">
                    {JSON.stringify(selected.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
              Select a finding row to see evidence, risk and recommendations.
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function Dl({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className={joinClassName("text-xs leading-relaxed text-slate-300", mono && "font-mono text-[11px] text-accent-300")}>{value}</p>
    </div>
  );
}
