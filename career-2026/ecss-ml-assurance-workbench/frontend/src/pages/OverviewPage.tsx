import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Database, ShieldAlert, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { Card } from "../components/ui/Card";
import { EmptyState, Spinner, WarningBanner } from "../components/ui/Feedback";
import { useProjectParam } from "../hooks/useProjectParam";
import { useFindings, DEFAULT_FILTERS } from "../hooks/useFindings";
import { useProjectData } from "../hooks/useProjectData";
import { STATUS_LABEL, type Finding } from "../types";
import { formatDate, joinClassName, SCORE_DISCLAIMER } from "../utils/format";

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-base-900/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-100" title={hint}>
        {value}
      </p>
    </div>
  );
}

export function OverviewPage() {
  const projectId = useProjectParam();
  const { project, dataset, score, latestRun, projectLoading } = useProjectData(projectId);
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: endpoints.listProjects });
  const { data: findingsPage } = useFindings(latestRun?.id, DEFAULT_FILTERS);

  if (projectLoading && !project) return <Spinner label="Loading project" />;
  if (!project) return null;

  const issues = (findingsPage?.items ?? []).filter((f) => f.status !== "PASS");
  const bySeverity = (sev: string) => issues.filter((f) => f.severity === sev).length;
  const topIssues = [...issues]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, 5);
  const reviewRequired = project.status === "Review Required";

  const nextActions: string[] = [];
  if (!dataset) nextActions.push("Upload a CSV dataset for this project.");
  if (dataset && !latestRun) nextActions.push("Run the Data Readiness analysis.");
  if (dataset && latestRun && score) {
    if (score.overall_score === null) nextActions.push("Select target/timestamp columns to expand score coverage.");
    if (score.fail_count) nextActions.push("Review FAIL findings and confirm or fix the underlying data issues.");
    if (score.warning_count) nextActions.push("Check WARNING findings (outliers, imbalance, gaps) with engineering judgment.");
  }
  if (dataset && latestRun && latestRun.status === "completed" && !nextActions.length)
    nextActions.push("Export a JSON report for the assurance record.");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">{project.name}</h1>
          <p className="text-xs text-slate-400">
            {project.ml_function || project.description || "No ML function described"} ·{" "}
            <span className="font-mono">v{project.version}</span>
          </p>
        </div>
        <span
          className={joinClassName(
            "rounded-md border px-2.5 py-1 text-xs font-semibold",
            reviewRequired ? "border-amber-500/50 text-amber-300" : "border-emerald-500/40 text-emerald-300",
          )}
        >
          {STATUS_LABEL[project.status] ?? project.status}
        </span>
      </header>

      <WarningBanner>{SCORE_DISCLAIMER}</WarningBanner>

      {!dataset ? (
        <Card>
          <EmptyState
            icon={<Database className="h-8 w-8 text-slate-600" />}
            title="No dataset yet"
            description="Upload a CSV to unlock the Data Readiness Inspector."
            action={
              <Link to="dataset" className="btn-primary">
                Upload dataset <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Data Readiness score" value={score?.overall_score ?? "—"} hint={score?.method} />
            <Stat label="Score coverage" value={score ? `${score.coverage_pct}%` : "—"} hint="Share of score categories evaluated" />
            <Stat label="Dataset" value={dataset.original_filename} hint={`${dataset.row_count.toLocaleString()} rows × ${dataset.column_count} cols`} />
            <Stat label="Last analysis" value={latestRun ? formatDate(latestRun.completed_at) : "never"} />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card title="Severity distribution" className="lg:col-span-1" bodyClassName="space-y-2">
              {SEVERITY_ORDER.map((sev) => (
                <div key={sev} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    {sev === "CRITICAL" || sev === "HIGH" ? (
                      <TriangleAlert className={sev === "CRITICAL" ? "h-4 w-4 text-red-400" : "h-4 w-4 text-orange-400"} />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                    )}
                    {sev}
                  </span>
                  <span className="font-mono text-slate-200">{bySeverity(sev)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pass
                </span>
                <span className="font-mono text-slate-200">{score?.pass_count ?? 0}</span>
              </div>
            </Card>

            <Card title="Top findings to review" className="lg:col-span-2" bodyClassName="space-y-2">
              {topIssues.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {score ? "No issues found — engineering review still recommended." : "Run the analysis to see findings."}
                </p>
              ) : (
                topIssues.map((finding) => <FindingRow key={finding.id} finding={finding} />)
              )}
            </Card>
          </div>

          <Card title="Recommended next actions" bodyClassName="space-y-1">
            {nextActions.length === 0 ? (
              <p className="text-sm text-slate-400">All flows complete — consider exporting the report and starting week-2 planning.</p>
            ) : (
              nextActions.map((action, index) => (
                <p key={action} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-600/20 font-mono text-[10px] text-accent-300">
                    {index + 1}
                  </span>
                  {action}
                </p>
              ))
            )}
          </Card>

          {projects && projects.length > 1 && (
            <p className="text-xs text-slate-500">
              Projects:{" "}
              {projects.slice(0, 6).map((p) => (
                <Link key={p.id} to={`/projects/${p.id}/overview`} className="mr-2 underline decoration-slate-700 hover:text-accent-300">
                  {p.name}
                </Link>
              ))}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <div className="rounded-md border border-slate-800 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-200">{finding.title}</p>
        <span
          className={joinClassName(
            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold",
            finding.severity === "CRITICAL" && "border-red-500/50 text-red-300",
            finding.severity === "HIGH" && "border-orange-500/40 text-orange-300",
            finding.severity === "MEDIUM" && "border-amber-500/40 text-amber-300",
            finding.severity === "LOW" && "border-sky-500/30 text-sky-300",
            finding.severity === "INFO" && "border-slate-600/50 text-slate-400",
          )}
        >
          {finding.severity}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {finding.description}
        {finding.observed_value && <span className="ml-1 font-mono text-slate-500">[{finding.observed_value}]</span>}
      </p>
    </div>
  );
}
