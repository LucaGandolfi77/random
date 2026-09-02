import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { ErrorState, Spinner, WarningBanner } from "../components/ui/Feedback";
import { WorkspaceNav } from "../components/features/WorkspaceNav";
import { DEPLOYMENT_TONE } from "../types/portfolio";
import { formatDate, joinClassName } from "../utils/format";

const DEPLOYMENTS = ["GO", "CONDITIONAL_GO", "NO_GO", "DEFERRED", "REVIEW_REQUIRED"];

function Chip({ text, tone }: { text: string; tone?: string }) {
  return (
    <span className={joinClassName("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold", tone ?? "border-slate-600/60 text-slate-300")}>
      {text}
    </span>
  );
}

export function PortfolioProjectsPage() {
  const { data: rows, isLoading, error, refetch } = useQuery({ queryKey: ["portfolio", "summary"], queryFn: endpoints.portfolioProjects });
  const [decision, setDecision] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => (!decision || r.deployment_decision === decision) && (!onlyIssues || r.tests_failed > 0 || r.deployment_decision === "NO_GO"));
  }, [rows, decision, onlyIssues]);

  return (
    <div className="min-h-screen pb-10">
      <WorkspaceNav />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Week-3 portfolio</h1>
            <p className="text-xs text-slate-400">
              Four integrated demo projects: requirements, tests, evidence, risks, deployment decisions and evidence
              packages. All content is synthetic demonstration data.
            </p>
          </div>
          <button className="btn-secondary" onClick={() => void refetch()}>Refresh</button>
        </header>

        <WarningBanner>
          This Workbench supports engineering assessment and evidence organization. It does not provide ECSS
          certification and does not replace mission-specific verification, validation, safety analysis or
          independent review.
        </WarningBanner>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select className="input !w-auto !py-1.5" value={decision} onChange={(e) => setDecision(e.target.value)} aria-label="Filter by deployment decision">
            <option value="">All deployment decisions</option>
            {DEPLOYMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
            Failed tests or NO_GO only
          </label>
        </div>

        {isLoading ? (
          <Spinner label="Loading portfolio" />
        ) : error ? (
          <ErrorState message="Could not load the portfolio." onRetry={() => void refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs" data-testid="portfolio-table">
              <thead className="bg-base-800 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2">Project</th>
                  <th className="px-2 py-2">Lifecycle / assurance</th>
                  <th className="px-2 py-2 text-right">Req (ver.)</th>
                  <th className="px-2 py-2 text-right">Tests P/F/B/NE</th>
                  <th className="px-2 py-2 text-right">Evidence</th>
                  <th className="px-2 py-2 text-right">Risks</th>
                  <th className="px-2 py-2 text-right">Open limits</th>
                  <th className="px-2 py-2 text-right">Package</th>
                  <th className="px-2 py-2">Deployment</th>
                  <th className="px-2 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/70 align-top hover:bg-base-800/40">
                    <td className="px-2 py-2">
                      <Link to={`/portfolio/${row.id}`} className="font-medium text-slate-100 hover:text-accent-300">
                        {row.name}
                      </Link>
                      <p className="font-mono text-[10px] text-slate-500">{row.id} · v{row.version}</p>
                    </td>
                    <td className="px-2 py-2">
                      <Chip text={row.lifecycle_status} />
                      <span className="mt-1 block"><Chip text={row.assurance_status} tone="border-sky-600/50 text-sky-300" /></span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-slate-300">
                      {row.requirements_total} <span className="text-slate-500">({row.requirements_verified}v)</span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      <span className="text-emerald-300">{row.tests_passed}</span>/
                      <span className="text-red-300">{row.tests_failed}</span>/
                      <span className="text-amber-300">{row.tests_blocked}</span>/
                      <span className="text-slate-400">{row.tests_not_executed}</span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-slate-300">{row.evidence_count}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-300">{row.risk_count}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-300">{row.open_limitations}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-300">{row.package_completeness_pct}%</td>
                    <td className="px-2 py-2">
                      <Chip text={row.deployment_decision} tone={DEPLOYMENT_TONE[row.deployment_decision]} />
                    </td>
                    <td className="px-2 py-2 text-slate-500">{formatDate(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No project matches the filters.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
