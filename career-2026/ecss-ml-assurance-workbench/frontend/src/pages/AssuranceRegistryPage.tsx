import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, FileWarning, Package } from "lucide-react";
import { endpoints } from "../api/endpoints";
import { Card } from "../components/ui/Card";
import { EmptyState, ErrorState, Spinner, WarningBanner } from "../components/ui/Feedback";
import { WorkspaceNav } from "../components/features/WorkspaceNav";
import { useToast } from "../hooks/useToast";
import { joinClassName } from "../utils/format";
import type { RegistrySummary } from "../types/assurance";

const STATUS_TONE: Record<string, string> = {
  "Not Available": "border-slate-600/50 text-slate-400",
  "Decision Pending": "border-amber-500/40 text-amber-300",
  "Not Started": "border-slate-600/50 text-slate-400",
  "Gaps Open": "border-amber-500/40 text-amber-300",
};

function StateChip({ state }: { state: string }) {
  return (
    <span className={joinClassName("rounded border px-1.5 py-0.5 text-[10px] font-semibold", STATUS_TONE[state] ?? "border-sky-500/40 text-sky-300")}>
      {state}
    </span>
  );
}

export function AssuranceRegistryPage() {
  const toast = useToast();
  const { data: rows, isLoading, error, refetch } = useQuery({
    queryKey: ["assurance", "summary"],
    queryFn: endpoints.assuranceSummary,
  });
  const generate = (id: string) => {
    endpoints
      .generateEvidencePackage(id)
      .then((pkg) => toast.success(`Evidence package ${pkg.id} generated`))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Generation failed"));
  };

  return (
    <div className="min-h-screen pb-8">
      <WorkspaceNav />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Assurance registry</h1>
            <p className="text-xs text-slate-400">
              External ML projects tracked by the Workbench — comparison and evidence packages. Absence of data is
              shown explicitly; it is never reported as a pass or a fail.
            </p>
          </div>
          <button className="btn-secondary" onClick={() => void refetch()}>
            Refresh
          </button>
        </header>

        <WarningBanner>
          The four tracked projects are <strong>not present</strong> in this repository (verified by recursive search).
          All indicators are availability states — no metric, test result or deployment decision is invented.
        </WarningBanner>

        {isLoading ? (
          <Spinner label="Loading registry" />
        ) : error ? (
          <ErrorState message="Could not load the assurance registry." onRetry={() => void refetch()} />
        ) : !rows || rows.length === 0 ? (
          <Card>
            <EmptyState title="No tracked projects" description="The registry seed will be created on first request." />
          </Card>
        ) : (
          <>
            {/* compare matrix */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs" data-testid="registry-table">
                <thead className="bg-base-800 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-2 py-2">Project</th>
                    <th className="px-2 py-2">Assurance</th>
                    <th className="px-2 py-2">Model</th>
                    <th className="px-2 py-2">Deployment</th>
                    <th className="px-2 py-2">Lifecycle</th>
                    <th className="px-2 py-2 text-right">Artefacts</th>
                    <th className="px-2 py-2 text-right">Req</th>
                    <th className="px-2 py-2 text-right">Tests (P/F/NE)</th>
                    <th className="px-2 py-2 text-right">Risks</th>
                    <th className="px-2 py-2 text-right">Evidence</th>
                    <th className="px-2 py-2">Evidence package</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <RegistryRow key={row.id} row={row} onGenerate={() => generate(row.id)} />
                  ))}
                </tbody>
              </table>
            </div>

            <Card title="Reading the registry" bodyClassName="space-y-2 text-xs text-slate-400">
              <p>
                <strong className="text-slate-300">Tests (P/F/NE):</strong> Passed / Failed / Not Executed among
                <em> registered</em> tests. Zero registered tests are shown as 0/0/0 — never as passed.
              </p>
              <p>
                <strong className="text-slate-300">Artefacts:</strong> number of expected assurance documents currently
                marked Available (e.g. 0/9). Missing artefacts are gaps, not evidence of absence of risk.
              </p>
              <p>
                A single aggregated score is intentionally <strong>not</strong> computed: it would hide missing data and
                high residual risk. Compare rows field by field instead.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function RegistryRow({ row, onGenerate }: { row: RegistrySummary; onGenerate: () => void }) {
  const hasPackages = row.packages > 0;
  return (
    <tr className="border-b border-slate-800/70 align-top hover:bg-base-800/40">
      <td className="px-2 py-2">
        <Link to={`/assurance/${row.id}`} className="font-medium text-slate-100 hover:text-accent-300">
          {row.name}
        </Link>
        <p className="font-mono text-[10px] text-slate-500">{row.id}</p>
      </td>
      <td className="px-2 py-2">
        <StateChip state={row.assurance_status} />
      </td>
      <td className="px-2 py-2">
        <StateChip state={row.model_status} />
      </td>
      <td className="px-2 py-2">
        <StateChip state={row.deployment_status} />
      </td>
      <td className="px-2 py-2 text-slate-400">{row.lifecycle_status}</td>
      <td className="px-2 py-2 text-right font-mono text-slate-300">
        {row.artefact_available}/{row.artefact_total}
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-400">{row.requirements}</td>
      <td className="px-2 py-2 text-right font-mono">
        <span className="text-emerald-300">{row.tests_passed}</span>/
        <span className="text-red-300">{row.tests_failed}</span>/
        <span className="text-amber-300">{row.tests_not_executed}</span>
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-400">{row.risks}</td>
      <td className="px-2 py-2 text-right font-mono text-slate-400">{row.evidence}</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-2 !py-1 !text-[11px]" onClick={onGenerate}>
            <Package className="h-3 w-3" /> Generate
          </button>
          {hasPackages && (
            <Link to={`/assurance/${row.id}`} className="flex items-center gap-1 text-[11px] text-sky-300 hover:underline">
              <Download className="h-3 w-3" /> {row.packages}
            </Link>
          )}
          {row.tests_registered === 0 && (
            <span title="No test records registered" className="text-slate-600">
              <FileWarning className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
