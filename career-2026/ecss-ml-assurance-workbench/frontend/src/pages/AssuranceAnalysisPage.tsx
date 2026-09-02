import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { endpoints } from "../api/endpoints";
import { api } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../hooks/useToast";
import type { PortfolioDetail } from "../types/portfolio";
import { joinClassName } from "../utils/format";

type Gap = {
  gap_id: string; category: string; severity: string; title: string; description: string; blocking: boolean;
};

export function AssuranceAnalysisPage() {
  const { projectId = "" } = useParams();
  const toast = useToast();
  const { data: detail, isLoading: loadingProject } = useQuery({
    queryKey: ["portfolio", "project", projectId], queryFn: () => endpoints.portfolioProject(projectId),
    enabled: Boolean(projectId), retry: false,
  });
  const { data: gapsData, refetch: refetchGaps, isFetching: fetchingGaps } = useQuery({
    queryKey: ["engine", "gaps", projectId],
    queryFn: () => api.get<{ gap_count: number; blocking_count: number; gaps: Gap[] }>(`/assurance-engine/projects/${projectId}/gaps`),
    enabled: Boolean(projectId), retry: false,
  });
  const { data: gate, refetch: refetchGate, isFetching: fetchingGate } = useQuery({
    queryKey: ["engine", "gate", projectId],
    queryFn: () => api.get<{ recommendation: string; official_deployment_decision: string | null; rules: Array<Record<string, unknown>>; inconsistencies: Array<Record<string, string>>; blocking_fails: string[] }>(`/assurance-engine/projects/${projectId}/deployment-gate`),
    enabled: Boolean(projectId), retry: false,
  });
  const { data: dims } = useQuery({
    queryKey: ["engine", "dims", projectId],
    queryFn: () => api.get<{ dimensions: Array<Record<string, unknown>> }>(`/assurance-engine/projects/${projectId}/dimensions`),
    enabled: Boolean(projectId), retry: false,
  });
  const { data: trace } = useQuery({
    queryKey: ["engine", "trace", projectId],
    queryFn: () => api.get<{ orphan_ids: string[]; duplicate_ids: string[] }>(`/assurance-engine/projects/${projectId}/traceability-issues`),
    enabled: Boolean(projectId), retry: false,
  });
  const { data: monitoring, refetch: refetchMonitoring, isFetching: fetchingMonitoring } = useQuery({
    queryKey: ["engine", "mon", projectId],
    queryFn: () => api.get<{ status: string; metrics: Array<Record<string, unknown>> }>(`/assurance-engine/projects/${projectId}/monitoring`),
    enabled: Boolean(projectId), retry: false,
  });

  if (loadingProject && !detail) return <Spinner label="Loading assurance analysis" />;
  const project = (detail as PortfolioDetail | undefined)?.project;

  const generateReport = async () => {
    try {
      const report = await api.post<{ _files?: string[] }>(`/assurance-engine/projects/${projectId}/assurance-report`);
      toast.success(`Assurance report generated: ${(report._files ?? []).join(", ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Report generation failed");
    }
  };

  const validatePackage = async () => {
    const packages = (detail as PortfolioDetail | undefined)?.packages ?? [];
    if (!packages.length) {
      toast.error("Generate an evidence package first.");
      return;
    }
    try {
      const result = await api.post<{ validation_status: string; error_count: number; warning_count: number }>(`/assurance-engine/evidence-packages/${packages[0].id}/validate`);
      toast[result.validation_status === "Valid" ? "success" : "error"](`Package validation: ${result.validation_status} (${result.error_count} errors, ${result.warning_count} warnings)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed");
    }
  };

  const severityTone: Record<string, string> = {
    Critical: "border-red-500/50 text-red-300", High: "border-orange-500/40 text-orange-300",
    Medium: "border-amber-500/40 text-amber-300", Low: "border-sky-500/30 text-sky-300", Informational: "border-slate-600/50 text-slate-400",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">
            <Link to="/portfolio" className="text-accent-300 hover:underline">Week-3 portfolio</Link>
            {" / "}
            {project ? <Link to={`/portfolio/${projectId}`} className="text-accent-300 hover:underline">{project.name}</Link> : projectId}
            {" / assurance analysis"}
          </p>
          <h1 className="text-lg font-semibold text-slate-100">Assurance analysis (week 5)</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void generateReport()}>
            <FileText className="h-4 w-4" aria-hidden /> Generate assurance report
          </Button>
          <Button variant="secondary" onClick={() => void validatePackage()}>
            <ShieldCheck className="h-4 w-4" aria-hidden /> Validate evidence package
          </Button>
        </div>
      </header>

      {/* Deployment gate */}
      <Card title="Deployment readiness gate" subtitle="Recommendation is decision support — official approval requires human review.">
        {fetchingGate ? <Spinner label="Evaluating gate" /> : gate ? (
          <div className="space-y-3 text-xs">
            <p>Recommendation: <strong className="text-accent-300">{gate.recommendation}</strong>
              <span className="ml-2 text-slate-500">official decision: {gate.official_deployment_decision ?? "none"}</span>
            </p>
            {gate.blocking_fails.length > 0 && (
              <p className="text-red-300">Blocking rules failed: {gate.blocking_fails.join(", ")}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs" data-testid="gate-table">
                <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
                  <tr><th className="px-2 py-2">Rule</th><th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2">Result</th><th className="px-2 py-2">Severity</th><th className="px-2 py-2">Blocking</th></tr>
                </thead>
                <tbody>
                  {gate.rules.map((rule) => (
                    <tr key={String(rule.rule_id)} className="border-b border-slate-800/60">
                      <td className="px-2 py-1.5 font-mono text-accent-300">{String(rule.rule_id)}</td>
                      <td className="max-w-[360px] px-2 py-1.5 text-slate-300">{String(rule.description)}</td>
                      <td className="px-2 py-1.5">{String(rule.result)}</td>
                      <td className="px-2 py-1.5">{String(rule.severity)}</td>
                      <td className="px-2 py-1.5">{String(rule.blocking)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {gate.inconsistencies.length > 0 && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-red-200">
                Inconsistencies detected (no automatic change is applied):
                <ul className="mt-1 list-inside list-disc">
                  {gate.inconsistencies.map((item) => <li key={item.rule}>{item.rule}: {item.detail}</li>)}
                </ul>
              </div>
            )}
            <button className="text-accent-300 hover:underline" onClick={() => void refetchGate()}>Re-evaluate</button>
          </div>
        ) : <ErrorState message="Could not evaluate the gate." onRetry={() => void refetchGate()} />}
      </Card>

      {/* Gaps */}
      <Card title={`Assurance gaps (${gapsData?.gap_count ?? 0}, blocking ${gapsData?.blocking_count ?? 0})`}>
        {fetchingGaps ? <Spinner label="Analyzing gaps" /> : gapsData ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs" data-testid="gaps-table">
              <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
                <tr><th className="px-2 py-2">Gap</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Severity</th>
                  <th className="px-2 py-2">Blocking</th><th className="px-2 py-2">Title</th></tr>
              </thead>
              <tbody>
                {gapsData.gaps.map((gap) => (
                  <tr key={gap.gap_id} className="border-b border-slate-800/60 align-top">
                    <td className="px-2 py-1.5 font-mono text-accent-300">{gap.gap_id}</td>
                    <td className="px-2 py-1.5 text-slate-300">{gap.category}</td>
                    <td className="px-2 py-1.5"><span className={joinClassName("rounded border px-1.5 py-0.5 text-[10px] font-semibold", severityTone[gap.severity])}>{gap.severity}</span></td>
                    <td className="px-2 py-1.5">{gap.blocking ? <ShieldAlert className="inline h-4 w-4 text-red-400" aria-label="blocking" /> : "—"}</td>
                    <td className="max-w-[420px] px-2 py-1.5 text-slate-300">
                      <p className="font-medium text-slate-200">{gap.title}</p>
                      <p className="text-slate-500">{gap.description}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <ErrorState message="Could not analyze gaps." onRetry={() => void refetchGaps()} />}
      </Card>

      {/* Dimensions + trace + monitoring */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Assurance dimensions" subtitle="Separate dimensions; no single aggregated score.">
          {dims ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="dims-table">
                <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
                  <tr><th className="px-2 py-2">Dimension</th><th className="px-2 py-2 text-right">Num</th>
                    <th className="px-2 py-2 text-right">Den</th><th className="px-2 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {dims.dimensions.map((d) => (
                    <tr key={String(d.dimension_id)} className="border-b border-slate-800/60">
                      <td className="px-2 py-1.5"><span className="font-mono text-accent-300">{String(d.dimension_id)}</span> <span className="text-slate-300">{String(d.name)}</span></td>
                      <td className="px-2 py-1.5 text-right font-mono">{String(d.numerator)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{String(d.denominator)}</td>
                      <td className="px-2 py-1.5">{String(d.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Spinner label="Loading dimensions" />}
        </Card>

        <div className="space-y-4">
          <Card title="Traceability issues" subtitle="Orphan and duplicate identifier detection.">
            {trace ? (
              <div className="space-y-2 text-xs">
                <p>Orphan references: <strong className={trace.orphan_ids.length ? "text-red-300" : "text-emerald-300"}>{trace.orphan_ids.length}</strong></p>
                <p>Duplicate ids: <strong className={trace.duplicate_ids.length ? "text-amber-300" : "text-emerald-300"}>{trace.duplicate_ids.length}</strong></p>
                {trace.orphan_ids.length > 0 && <p className="break-all font-mono text-[10px] text-red-300">{trace.orphan_ids.slice(0, 20).join(", ")}</p>}
              </div>
            ) : <Spinner label="Validating traceability" />}
          </Card>
          <Card title="Monitoring readiness" subtitle="Thresholds without a defined value are reported as pending.">
            {fetchingMonitoring ? <Spinner label="Loading monitoring" /> : monitoring ? (
              <div className="max-h-80 overflow-auto">
                <p className="mb-2 text-xs">Status: <strong>{monitoring.status}</strong> · {monitoring.metrics.length} metrics registered</p>
                <ul className="space-y-1">
                  {monitoring.metrics.map((m) => (
                    <li key={String(m.monitoring_id)} className="flex flex-wrap items-center gap-2 rounded border border-slate-800 px-2 py-1 text-[11px]">
                      <span className="font-mono text-accent-300">{String(m.monitoring_id)}</span>
                      <span className="text-slate-300">{String(m.name)}</span>
                      <span className="ml-auto text-slate-500">warn: {String(m.warning_threshold)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <ErrorState message="Could not load monitoring." onRetry={() => void refetchMonitoring()} />}
          </Card>
        </div>
      </div>
    </div>
  );
}
