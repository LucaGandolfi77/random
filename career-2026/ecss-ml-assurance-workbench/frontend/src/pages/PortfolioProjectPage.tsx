import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Download, Package, ScanSearch, ShieldCheck } from "lucide-react";
import { endpoints } from "../api/endpoints";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState, Spinner, WarningBanner } from "../components/ui/Feedback";
import { BackLink, WorkspaceNav } from "../components/features/WorkspaceNav";
import { useToast } from "../hooks/useToast";
import { DEPLOYMENT_TONE, VERDICTS, type PortfolioDetail } from "../types/portfolio";
import { formatBytes, formatDate, joinClassName } from "../utils/format";

const VERDICT_TONE: Record<string, string> = {
  PASS: "text-emerald-300 border-emerald-500/40",
  FAIL: "text-red-300 border-red-500/40",
  BLOCKED: "text-amber-300 border-amber-500/40",
  INCONCLUSIVE: "text-amber-300 border-amber-500/40",
  NOT_EXECUTED: "text-slate-400 border-slate-600/60",
  NOT_APPLICABLE: "text-slate-500 border-slate-600/60",
};

function Chip({ text, tone }: { text: string; tone?: string }) {
  return <span className={joinClassName("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold", tone ?? "border-slate-600/60 text-slate-300")}>{text}</span>;
}

function KV({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <dl className="grid gap-2 text-xs sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="text-slate-200">{v === null || v === undefined || v === "" ? "—" : JSON.stringify(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function VerdictChip({ verdict }: { verdict: string }) {
  return <Chip text={verdict} tone={VERDICT_TONE[verdict] ?? "border-slate-600/60 text-slate-300"} />;
}

export function PortfolioProjectPage() {
  const { projectId = "" } = useParams();
  const toast = useToast();
  const client = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portfolio", "project", projectId],
    queryFn: () => endpoints.portfolioProject(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["portfolio", "project", projectId] });
    void client.invalidateQueries({ queryKey: ["portfolio", "summary"] });
  };

  const generate = useMutation({
    mutationFn: () => endpoints.generatePortfolioPackage(projectId),
    onSuccess: (pkg) => {
      toast.success(`Evidence package ${pkg.package_version} generated`);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Generation failed"),
  });

  const verify = useMutation({
    mutationFn: (packageId: string) => endpoints.verifyPortfolioPackage(packageId),
    onSuccess: (result) => {
      toast[result.status === "VALID" ? "success" : "error"](`Verification: ${result.status} — ${result.detail}`);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Verification failed"),
  });

  const download = (packageId: string) => {
    const a = document.createElement("a");
    a.href = endpoints.portfolioPackageDownloadUrl(packageId);
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (isLoading) return <Shell><Spinner label="Loading project" /></Shell>;
  if (error || !data) return <Shell><ErrorState message="Could not load this portfolio project." onRetry={() => void refetch()} /></Shell>;

  const p = data.project;
  const counts = data.coverage.verdict_counts;
  const decision = data.deployment_decision;
  const compl = data.completeness;

  return (
    <Shell>
      <div className="space-y-4">
        <BackLink to="/portfolio" label="Back to week-3 portfolio" />

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-100">{p.name}</h1>
              <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
              <Chip text={`v${p.version}`} />
            </div>
            <p className="mt-1 max-w-3xl text-xs text-slate-400">{p.short_description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/portfolio/${projectId}/assurance`} className="btn-secondary" data-testid="assurance-analysis">
              <ScanSearch className="h-4 w-4" /> Assurance analysis (week 5)
            </Link>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending} data-testid="generate-package">
              <Package className="h-4 w-4" /> {generate.isPending ? "Generating…" : "Generate evidence package"}
            </Button>
          </div>
        </header>

        <WarningBanner>
          Synthetic demonstration project. Tests PASS only when an explicit Test Result with verdict PASS exists;
          absence of data is shown as Not Executed / Not Provided.
        </WarningBanner>

        {/* Overview */}
        <Card title="Overview" subtitle={`Deployment decision: ${decision?.decision ?? "none"}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <KV rows={[
                ["Domain", p.domain], ["Use case", p.use_case], ["Operational context", p.operational_context],
                ["Criticality", p.criticality], ["Deployment target", p.deployment_target],
                ["Execution environment", p.execution_environment], ["Lifecycle", p.lifecycle_status],
                ["Assurance status", p.assurance_status], ["Model version", p.model_version],
                ["Dataset version", p.dataset_version], ["Owner", p.owner], ["Last reviewed", p.last_reviewed_at],
              ]} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Deployment decision:</span>
                <Chip text={decision?.decision ?? "none"} tone={decision ? DEPLOYMENT_TONE[String(decision.decision)] : undefined} />
              </div>
              <p className="text-xs text-slate-300">{String(decision?.decision_summary ?? "")}</p>
              <div className="rounded border border-slate-800 p-2 text-[11px] text-slate-400">
                Package completeness indicator: <strong className="font-mono text-slate-200">{compl.overall_indicator_pct}%</strong>
                <p className="mt-1 italic">Informational only — completeness is not deployability.</p>
              </div>
            </div>
          </div>
        </Card>

        <RequirementsSection data={data} />
        <EvidenceSection data={data} />
        <DataQualitySection data={data} />
        <OddSection data={data} />
        <TestsSection data={data} counts={counts} />
        <FmeaSection data={data} />
        <RisksSection data={data} />
        <LimitationsSection data={data} />
        <DeploymentSection data={data} />
        <MonitoringSection data={data} />
        <PackageSection data={data} onGenerate={() => generate.mutate()} onVerify={(id) => verify.mutate(id)} onDownload={download} busy={generate.isPending || verify.isPending} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-10">
      <WorkspaceNav />
      <div className="mx-auto max-w-7xl space-y-4 p-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- sections
function RequirementsSection({ data }: { data: PortfolioDetail }) {
  return (
    <Card title={`Requirements (${data.requirements.length})`} subtitle="Filters are client-side: status, category, verified, missing test/evidence.">
      <RequirementTable requirements={data.requirements} />
    </Card>
  );
}

function RequirementTable({ requirements }: { requirements: Array<Record<string, unknown>> }) {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const rows = requirements.filter((r) => (!status || r.status === status) && (!category || r.category === category));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <select className="input !w-auto !py-1" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter requirements by status">
          <option value="">All statuses</option>
          {Array.from(new Set(requirements.map((r) => String(r.status)))).map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input !w-auto !py-1" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter requirements by category">
          <option value="">All categories</option>
          {Array.from(new Set(requirements.map((r) => String(r.category)))).map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded border border-slate-800">
        <table className="w-full text-left text-xs" data-testid="requirements-table">
          <thead className="sticky top-0 bg-base-800 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="px-2 py-2">ID</th><th className="px-2 py-2">Title</th><th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Priority</th><th className="px-2 py-2">Verification</th><th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Tests</th><th className="px-2 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cov = (r.coverage ?? {}) as Record<string, string[]>;
              const gaps = (r.gaps ?? {}) as Record<string, boolean>;
              return (
                <tr key={String(r.requirement_id)} className="border-b border-slate-800/60 align-top">
                  <td className="px-2 py-1.5 font-mono text-accent-300">{String(r.requirement_id)}</td>
                  <td className="max-w-[240px] px-2 py-1.5 text-slate-200">{String(r.title)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{String(r.category)}</td>
                  <td className="px-2 py-1.5">{String(r.priority)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{String(r.verification_method)}</td>
                  <td className="px-2 py-1.5"><Chip text={String(r.status)} tone={r.status === "VERIFIED" ? "border-emerald-500/40 text-emerald-300" : r.status === "FAILED" ? "border-red-500/40 text-red-300" : undefined} /></td>
                  <td className="px-2 py-1.5">
                    <span className={joinClassName(gaps.no_test ? "text-red-300" : "text-emerald-300")}>{cov.tests?.length ?? 0}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={joinClassName(gaps.no_evidence ? "text-amber-300" : "text-emerald-300")}>{cov.evidence?.length ?? 0}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvidenceSection({ data }: { data: PortfolioDetail }) {
  const [type, setType] = useState("");
  const rows = data.evidence.filter((e) => !type || e.evidence_type === type);
  return (
    <Card title={`Evidence library (${data.evidence.length})`} subtitle="Hash is recorded for attachments; evidence without a file is not declared verified.">
      <div className="space-y-2">
        <select className="input !w-auto !py-1 text-xs" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter evidence by type">
          <option value="">All evidence types</option>
          {Array.from(new Set(data.evidence.map((e) => String(e.evidence_type)))).map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs" data-testid="evidence-table">
            <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
              <tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Title</th><th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Status</th><th className="px-2 py-2">File / hash</th><th className="px-2 py-2">Reqs</th><th className="px-2 py-2">Tests</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={String(e.evidence_id)} className="border-b border-slate-800/60 align-top">
                  <td className="px-2 py-1.5 font-mono text-accent-300">{String(e.evidence_id)}</td>
                  <td className="max-w-[260px] px-2 py-1.5 text-slate-200">{String(e.title)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{String(e.evidence_type)}</td>
                  <td className="px-2 py-1.5">{String(e.status)}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-slate-500">
                    {e.file_reference ? `${String(e.file_reference)} · ${String(e.content_hash).slice(0, 8)}…` : "no file"}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400">{(e.related_requirement_ids as string[])?.join(",")}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400">{(e.related_test_ids as string[])?.join(",")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function DataQualitySection({ data }: { data: PortfolioDetail }) {
  return (
    <Card title="Data quality" subtitle="Reuses Workbench Data Readiness concepts; values are synthetic.">
      <KV rows={Object.entries(data.data_quality) as Array<[string, unknown]>} />
    </Card>
  );
}

function OddSection({ data }: { data: PortfolioDetail }) {
  const odd = data.odd;
  return (
    <Card title="Operational Design Domain" subtitle="Coverage states shown per dimension; the ODD is not presented as complete when dimensions are unverified.">
      <div className="space-y-3">
        <p className="text-xs text-slate-300">{String(odd.operational_objective ?? "")}</p>
        {(odd.input_ranges as Array<Record<string, unknown>>)?.map((dim) => (
          <div key={String(dim.dimension)} className="flex flex-wrap items-center gap-2 rounded border border-slate-800 px-2 py-1.5 text-xs">
            <span className="font-mono text-accent-300">{String(dim.dimension)}</span>
            <span className="text-slate-300">{String(dim.range ?? "")}</span>
            <Chip text={String(dim.coverage ?? "NOT_VERIFIED")} tone={dim.coverage === "VERIFIED" ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"} />
          </div>
        ))}
        <p className="text-xs text-slate-400"><strong className="text-slate-300">Unsupported modes:</strong> {String((odd.unsupported_modes as string[])?.join(" · ") ?? "")}</p>
        <p className="text-xs text-slate-400"><strong className="text-slate-300">Prohibited region:</strong> {String(odd.prohibited_region ?? "")}</p>
        <p className="text-xs text-slate-400"><strong className="text-slate-300">Fallback:</strong> {String(odd.fallback ?? "")}</p>
      </div>
    </Card>
  );
}

function TestsSection({ data, counts }: { data: PortfolioDetail; counts: Record<string, number> }) {
  const [verdict, setVerdict] = useState("");
  const [blockingOnly, setBlockingOnly] = useState(false);
  const rows = data.tests.filter((t) => {
    const v = t.result?.verdict ?? "NO_RESULT";
    if (verdict && v !== verdict) return false;
    if (blockingOnly && t.case.severity_on_failure !== "HIGH") return false;
    return true;
  });
  return (
    <Card title={`Tests — PASS ${counts.PASS ?? 0} · FAIL ${counts.FAIL ?? 0} · BLOCKED ${counts.BLOCKED ?? 0} · INCONCLUSIVE ${counts.INCONCLUSIVE ?? 0} · NOT_EXECUTED ${counts.NOT_EXECUTED ?? 0} · NA ${counts.NOT_APPLICABLE ?? 0}`}
          subtitle="A test counts as passed only when an explicit Test Result with verdict PASS exists.">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select className="input !w-auto !py-1" value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Filter tests by verdict" data-testid="verdict-filter">
            <option value="">All verdicts</option>
            {VERDICTS.map((v) => <option key={v}>{v}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input type="checkbox" checked={blockingOnly} onChange={(e) => setBlockingOnly(e.target.checked)} /> High severity only
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="tests-table">
            <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
              <tr><th className="px-2 py-2">Test</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Verdict</th>
                <th className="px-2 py-2">Env</th><th className="px-2 py-2">Actual result / metrics</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={String(t.case.test_id)} className="border-b border-slate-800/60 align-top" data-verdict={t.result?.verdict ?? "NO_RESULT"}>
                  <td className="px-2 py-1.5">
                    <p className="font-mono text-accent-300">{String(t.case.test_id)}</p>
                    <p className="max-w-[240px] text-slate-200">{String(t.case.title)}</p>
                  </td>
                  <td className="px-2 py-1.5 text-slate-400">{String(t.case.test_type)}</td>
                  <td className="px-2 py-1.5"><VerdictChip verdict={String(t.result?.verdict ?? "NO_RESULT")} /></td>
                  <td className="px-2 py-1.5 text-slate-400">{String(t.result?.environment ?? "—")}</td>
                  <td className="max-w-[320px] px-2 py-1.5 text-slate-400">
                    {String(t.result?.actual_result ?? "No result recorded")}
                    {t.result?.failure_reason ? (<p className="text-red-300">Fail: {String(t.result.failure_reason)}</p>) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-3 text-sm text-slate-500">No tests match the filters.</p>}
        </div>
      </div>
    </Card>
  );
}

function FmeaSection({ data }: { data: PortfolioDetail }) {
  return (
    <Card title={`FMEA (${data.fmea.length})`} subtitle="Synthetic engineering example requiring project-specific review.">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" data-testid="fmea-table">
          <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
            <tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Function</th><th className="px-2 py-2">Failure mode</th>
              <th className="px-2 py-2 text-right">S</th><th className="px-2 py-2 text-right">O</th><th className="px-2 py-2 text-right">D</th>
              <th className="px-2 py-2">Residual</th><th className="px-2 py-2">Tests</th></tr>
          </thead>
          <tbody>
            {data.fmea.map((f) => (
              <tr key={String(f.fmea_item_id)} className="border-b border-slate-800/60 align-top">
                <td className="px-2 py-1.5 font-mono text-accent-300">{String(f.fmea_item_id)}</td>
                <td className="max-w-[200px] px-2 py-1.5 text-slate-300">{String(f.function)}</td>
                <td className="max-w-[260px] px-2 py-1.5 text-slate-200">{String(f.failure_mode)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{String(f.severity)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{String(f.occurrence)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{String(f.detectability)}</td>
                <td className="px-2 py-1.5"><Chip text={String(f.residual_risk)} tone={f.residual_risk === "H" || f.residual_risk === "C" ? "border-red-500/40 text-red-300" : "border-amber-500/40 text-amber-300"} /></td>
                <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400">{(f.related_test_ids as string[])?.join(",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RisksSection({ data }: { data: PortfolioDetail }) {
  return (
    <Card title={`Residual risks (${data.risks.length})`} subtitle="Acceptance is explicit and motivated; risk matrix thresholds are configured.">
      <div className="grid gap-3 lg:grid-cols-2">
        {data.risks.map((r) => (
          <div key={String(r.risk_id)} className="rounded-md border border-slate-800 p-3" data-testid="risk-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-accent-300">{String(r.risk_id)}</span>
              <span className="text-xs font-medium text-slate-100">{String(r.title)}</span>
              <span className="ml-auto"><Chip text={String(r.acceptance_status)} tone={r.acceptance_status === "ACCEPTABLE" ? "border-emerald-500/40 text-emerald-300" : r.acceptance_status === "NOT_ACCEPTABLE" ? "border-red-500/40 text-red-300" : "border-amber-500/40 text-amber-300"} /></span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <span>Initial S{String(r.initial_severity)}/L{String(r.initial_likelihood)} → <strong className="text-amber-300">{String(r.initial_risk_level)}</strong></span>
              <span>Residual S{String(r.residual_severity)}/L{String(r.residual_likelihood)} → <strong className="text-sky-300">{String(r.residual_risk_level)}</strong></span>
              <span className="col-span-2">Rationale: {String(r.acceptance_rationale || "—")}</span>
              <span className="col-span-2">Owner: {String(r.owner)} · reviewed {String(r.review_date)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LimitationsSection({ data }: { data: PortfolioDetail }) {
  return (
    <Card title={`Known limitations (${data.limitations.length})`} subtitle="Limits are gaps to manage, not hidden findings.">
      <div className="grid gap-2 lg:grid-cols-2">
        {data.limitations.map((l) => (
          <div key={String(l.limitation_id)} className="rounded border border-slate-800 p-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-accent-300">{String(l.limitation_id)}</span>
              <span className="font-medium text-slate-200">{String(l.title)}</span>
              <span className="ml-auto"><Chip text={String(l.status)} /></span>
            </div>
            <p className="mt-1 text-slate-400">{String(l.description)}</p>
            <p className="mt-1 text-slate-500">Impact: {String(l.impact)} · Workaround: {String(l.workaround || "none")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeploymentSection({ data }: { data: PortfolioDetail }) {
  const d = data.deployment_decision;
  if (!d) return null;
  const tone = DEPLOYMENT_TONE[String(d.decision)] ?? "border-slate-600/60 text-slate-300";
  return (
    <Card title="Deployment decision" subtitle="Decision is explicit and motivated; the checklist is non-binding reviewer support." data-testid="deployment-card">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Chip text={String(d.decision)} tone={tone} />
          <span className="text-xs text-slate-400">Decision date {String(d.decision_date)} · {String(d.approver)} · {String(d.review_status)}</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{String(d.decision_summary)}</p>
        <details>
          <summary className="cursor-pointer text-xs text-accent-300">Full rationale</summary>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{String(d.rationale)}</p>
        </details>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <p className="field-label">Blocking findings</p>
            <ul className="list-inside list-disc text-slate-400">{(d.blocking_findings as string[])?.length ? (d.blocking_findings as string[]).map((b) => <li key={b}>{b}</li>) : <li>none</li>}</ul>
          </div>
          <div>
            <p className="field-label">Accepted risks</p>
            <ul className="list-inside list-disc text-slate-400">{(d.accepted_risks as string[])?.length ? (d.accepted_risks as string[]).map((r) => <li key={r}>{r}</li>) : <li>none</li>}</ul>
          </div>
          <div className="sm:col-span-2">
            <p className="field-label">Required mitigations</p>
            <ul className="list-inside list-disc text-amber-300">{(d.required_mitigations as string[])?.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
          <div className="sm:col-span-2">
            <p className="field-label">Rollback strategy</p>
            <p className="text-slate-400">{String(d.rollback_strategy)}</p>
          </div>
        </div>
        <details>
          <summary className="cursor-pointer text-xs text-accent-300">Reviewer checklist ({data.deployment_checklist.filter((c) => c.satisfied).length}/{data.deployment_checklist.length} satisfied)</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {data.deployment_checklist.map((c) => (
              <li key={c.check} className="flex items-start gap-2">
                <input type="checkbox" readOnly checked={c.satisfied} className="mt-0.5" aria-label={c.check} />
                <span className={c.satisfied ? "text-slate-300" : "text-amber-300"}>{c.check} — {c.note ?? ""}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Card>
  );
}

function MonitoringSection({ data }: { data: PortfolioDetail }) {
  const mon = data.monitoring;
  return (
    <Card title="Monitoring strategy" subtitle="Per-project metrics, thresholds, escalation and safe state.">
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <KV rows={Object.entries(mon)
          .filter(([k]) => k !== "metrics")
          .map(([k, v]) => [k.replace(/_/g, " "), Array.isArray(v) ? JSON.stringify(v) : v]) as Array<[string, unknown]>} />
      </div>
      <p className="field-label mt-3">Metrics & thresholds</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
            <tr><th className="px-2 py-2">Metric</th><th className="px-2 py-2">Description</th><th className="px-2 py-2">Alert threshold</th></tr>
          </thead>
          <tbody>
            {(mon.metrics as Array<Record<string, unknown>>)?.map((m) => (
              <tr key={String(m.name)} className="border-b border-slate-800/60">
                <td className="px-2 py-1.5 font-mono text-accent-300">{String(m.name)}</td>
                <td className="px-2 py-1.5 text-slate-300">{String(m.description ?? "")}</td>
                <td className="px-2 py-1.5 text-slate-300">{String(m.threshold ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PackageSection({ data, onGenerate, onVerify, onDownload, busy }: {
  data: PortfolioDetail; onGenerate: () => void; onVerify: (id: string) => void;
  onDownload: (id: string) => void; busy: boolean;
}) {
  const categories = Object.entries(data.completeness.categories);
  const pkg = data.packages[0];
  return (
    <Card title="Evidence package" subtitle="Immutable snapshots; previous versions are never overwritten."
          actions={<Button onClick={onGenerate} disabled={busy} data-testid="generate-package"><Package className="h-4 w-4" /> Generate package</Button>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="field-label">Completeness per category</p>
          <div className="max-h-80 overflow-auto rounded border border-slate-800">
            <table className="w-full text-left text-xs" data-testid="completeness-table">
              <thead className="sticky top-0 bg-base-800 text-[10px] uppercase text-slate-400">
                <tr><th className="px-2 py-2">Category</th><th className="px-2 py-2">State</th><th className="px-2 py-2">Note</th></tr>
              </thead>
              <tbody>
                {categories.map(([name, value]) => (
                  <tr key={name} className="border-b border-slate-800/60">
                    <td className="px-2 py-1.5 text-slate-300">{name}</td>
                    <td className="px-2 py-1.5">
                      <Chip text={value.state} tone={value.state === "COMPLETE" ? "border-emerald-500/40 text-emerald-300" : value.state === "INVALID" ? "border-red-500/40 text-red-300" : value.state === "MISSING" ? "border-slate-600/60 text-slate-400" : "border-amber-500/40 text-amber-300"} />
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{String(value.note ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded border border-slate-800 p-3 text-xs text-slate-400">
            <p className="field-label">Latest package</p>
            {pkg ? (
              <>
                <p className="font-mono text-slate-200">{pkg.filename}</p>
                <p className="mt-1">
                  version {pkg.package_version} · schema {pkg.package_schema_version} · {pkg.document_count} docs ·{" "}
                  {pkg.evidence_count} evidence files · {formatBytes(pkg.size_bytes)} · {formatDate(pkg.generated_at)}
                </p>
                <p className="mt-1">Last verification: <strong className={pkg.verification?.status === "VALID" ? "text-emerald-300" : "text-amber-300"}>{pkg.verification?.status ?? "not verified"}</strong> {String(pkg.verification?.detail ?? "")}</p>
              </>
            ) : (
              <p className="text-slate-500">No package generated yet.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!pkg || busy} onClick={() => pkg && onVerify(pkg.id)} data-testid="verify-package">
              <ShieldCheck className="h-4 w-4" /> Verify integrity
            </Button>
            <Button variant="secondary" disabled={!pkg} onClick={() => pkg && onDownload(pkg.id)}>
              <Download className="h-4 w-4" /> Download ZIP
            </Button>
          </div>
          {data.packages.length > 1 && (
            <details>
              <summary className="cursor-pointer text-xs text-accent-300">History ({data.packages.length - 1} older versions)</summary>
              <ul className="mt-2 space-y-1">
                {data.packages.slice(1).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate font-mono">{p.filename}</span>
                    <button className="text-accent-300 hover:underline" onClick={() => onDownload(p.id)}>download</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </Card>
  );
}
