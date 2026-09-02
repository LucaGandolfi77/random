import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Download, Package, RefreshCw } from "lucide-react";
import { endpoints } from "../api/endpoints";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState, Spinner, WarningBanner } from "../components/ui/Feedback";
import { BackLink, WorkspaceNav } from "../components/features/WorkspaceNav";
import { useToast } from "../hooks/useToast";
import { joinClassName, formatBytes, formatDate } from "../utils/format";
import type { AvailabilityState, RegistryEvidence, RegistryRequirement, RegistryRisk, RegistryTest } from "../types/assurance";

const STATE_TONE: Record<AvailabilityState, string> = {
  Available: "border-emerald-500/40 text-emerald-300",
  "Not Available": "border-slate-600/50 text-slate-400",
  "Not Provided": "border-slate-600/50 text-slate-400",
  "Not Executed": "border-amber-500/40 text-amber-300",
  "Not Applicable": "border-sky-600/50 text-sky-300",
  "Pending Review": "border-amber-500/40 text-amber-300",
  "Evidence Missing": "border-orange-500/40 text-orange-300",
  "Decision Pending": "border-amber-500/40 text-amber-300",
};

function StateChip({ state }: { state: string }) {
  const tone = STATE_TONE[state as AvailabilityState] ?? "border-sky-500/40 text-sky-300";
  return <span className={joinClassName("rounded border px-1.5 py-0.5 text-[10px] font-semibold", tone)}>{state}</span>;
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={joinClassName("mt-0.5 text-sm text-slate-200", mono && "font-mono text-xs text-accent-300")}>{value}</dd>
    </div>
  );
}

export function AssuranceProjectPage() {
  const { projectId = "" } = useParams();
  const toast = useToast();
  const client = useQueryClient();
  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ["assurance", "project", projectId],
    queryFn: () => endpoints.assuranceProject(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });

  const generate = useMutation({
    mutationFn: () => endpoints.generateEvidencePackage(projectId),
    onSuccess: (pkg) => {
      void client.invalidateQueries({ queryKey: ["assurance", "project", projectId] });
      toast.success(`Evidence package ${pkg.id} generated`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Generation failed"),
  });

  if (isLoading) return <PageShell><Spinner label="Loading project" /></PageShell>;
  if (error || !project) {
    return (
      <PageShell>
        <ErrorState message="Could not load this assurance project." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const artefacts = Object.entries(project.artefact_availability).sort(([a], [b]) => a.localeCompare(b));
  const c = project.counts;

  return (
    <PageShell>
      <div className="space-y-4">
        <BackLink to="/assurance" label="Back to assurance registry" />

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-100">{project.name}</h1>
              <span className="font-mono text-[10px] text-slate-500">{project.id}</span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">{project.short_description}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Package className="h-4 w-4" />
              {generate.isPending ? "Generating…" : "Generate evidence package"}
            </Button>
            <button className="btn-secondary !px-2" onClick={() => void refetch()} aria-label="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <WarningBanner>
          No artefact for this project exists in the repository yet. All values below are availability states, not
          results. Generate the evidence package to obtain the full package with explicit &quot;Not Available / Not
          Provided / Not Executed&quot; markers.
        </WarningBanner>

        {/* summary */}
        <Card title="Project summary" subtitle="Registry metadata — paths and statuses, not results." bodyClassName="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KeyValue label="Project type" value={project.project_type} />
            <KeyValue label="Domain" value={project.domain} />
            <KeyValue label="Criticality (descriptive)" value={project.criticality} />
            <KeyValue label="Owner" value={project.owner} />
            <KeyValue label="Version" value={project.version} />
            <KeyValue label="Source type" value={project.source_type} />
            <KeyValue label="Lifecycle" value={project.lifecycle_status} />
            <KeyValue label="Assurance status" value={project.assurance_status} />
            <KeyValue label="Deployment decision" value={project.deployment_status} />
            <KeyValue label="Repository path" value={project.repository_path || "Not Available"} mono />
            <KeyValue label="Documentation path" value={project.documentation_path || "Not Available"} mono />
            <KeyValue label="Last updated" value={formatDate(project.updated_at)} />
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="field-label">Known limitations</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                {(project.known_limitations.length ? project.known_limitations : ["Not Provided"]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="field-label">Open actions</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                {(project.open_actions.length ? project.open_actions : ["None registered"]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="field-label">Related assets in this workspace (verifiable, not project artefacts)</p>
            <ul className="space-y-1 text-xs">
              {project.related_assets?.length ? (
                project.related_assets.map((asset) => (
                  <li key={String(asset.path)} className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-base-800 px-1 font-mono text-[10px] text-accent-300">{asset.kind}</span>
                    <span className="font-mono text-slate-400">{asset.path}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500">None registered.</li>
              )}
            </ul>
          </div>
        </Card>

        {/* artefact availability */}
        <Card title={`Expected assurance artefacts (${c.artefact_available}/${c.artefact_total} available)`}>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {artefacts.map(([name, state]) => (
              <div key={name} className="flex items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1.5">
                <span className="font-mono text-[11px] text-slate-300">{name}</span>
                <StateChip state={state} />
              </div>
            ))}
          </div>
        </Card>

        {/* sections: requirements, tests, evidence, risks */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title={`Requirements (${project.requirements.length})`}>
            {project.requirements.length ? (
              <RequirementsTable items={project.requirements} />
            ) : (
              <Missing label="No requirements registered — Not Provided until imported." />
            )}
          </Card>
          <Card title={`Tests (P ${c.tests_passed} · F ${c.tests_failed} · NE ${c.tests_not_executed} of ${c.tests_registered} registered)`}>
            {project.tests.length ? (
              <TestsTable items={project.tests} />
            ) : (
              <Missing label="No test records registered — zero tests are reported as zero, never as passed or failed." />
            )}
          </Card>
          <Card title={`Evidence (${project.evidence.length})`}>
            {project.evidence.length ? (
              <EvidenceTable items={project.evidence} />
            ) : (
              <Missing label="Evidence Missing — required evidence classes are listed in the evidence package." />
            )}
          </Card>
          <Card title={`Risks & failure modes (${project.risks.length})`}>
            {project.risks.length ? <RisksTable items={project.risks} /> : <Missing label="No risks or FMEA rows registered — Not Provided." />}
          </Card>
        </div>

        {/* import procedure */}
        <Card title="How to import this project" bodyClassName="text-xs leading-relaxed text-slate-400">
          {project.import_procedure || "Not Provided"}
        </Card>

        {/* packages */}
        <Card title={`Evidence packages (${project.packages.length})`}>
          {project.packages.length === 0 ? (
            <Missing label="No evidence package generated yet. Use the button at the top." />
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {project.packages.map((pkg) => (
                <li key={pkg.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Package className="h-4 w-4 text-accent-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-slate-200">{pkg.filename}</p>
                    <p className="text-[11px] text-slate-500">
                      schema v{pkg.schema_version} · {pkg.sections.length} sections · {formatBytes(pkg.size_bytes)} ·{" "}
                      {formatDate(pkg.generated_at)}
                    </p>
                  </div>
                  <a className="btn-secondary !py-1.5 !text-xs" href={endpoints.evidencePackageDownloadUrl(pkg.id)} download>
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-8">
      <WorkspaceNav />
      <div className="mx-auto max-w-7xl p-4">{children}</div>
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return <p className="py-2 text-xs italic text-slate-500">{label}</p>;
}

function RequirementsTable({ items }: { items: RegistryRequirement[] }) {
  return (
    <ul className="divide-y divide-slate-800/70">
      {items.map((item) => (
        <li key={item.requirement_id} className="py-2">
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-accent-300">{item.requirement_id}</span>
            <StateChip state={item.state} />
          </p>
          <p className="mt-0.5 text-xs text-slate-200">{item.title || "Not Provided"}</p>
          <p className="text-[11px] text-slate-500">{item.description || "No description registered."}</p>
        </li>
      ))}
    </ul>
  );
}

function TestsTable({ items }: { items: RegistryTest[] }) {
  const tone: Record<string, string> = {
    Passed: "text-emerald-300",
    Failed: "text-red-300",
    "Not Executed": "text-amber-300",
    "Not Applicable": "text-slate-500",
    "Pending Review": "text-amber-300",
  };
  return (
    <ul className="divide-y divide-slate-800/70">
      {items.map((item) => (
        <li key={item.test_id} className="py-2">
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-accent-300">{item.test_id}</span>
            <span className={joinClassName("font-semibold", tone[item.outcome])}>{item.outcome}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-200">{item.title}</p>
          <p className="text-[11px] text-slate-500">
            {item.method} · {item.level}
            {item.actual_result ? ` · ${item.actual_result}` : " · actual result Not Provided"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function EvidenceTable({ items }: { items: RegistryEvidence[] }) {
  return (
    <ul className="divide-y divide-slate-800/70">
      {items.map((item) => (
        <li key={item.evidence_id} className="py-2">
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-accent-300">{item.evidence_id}</span>
            <StateChip state={item.state} />
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{item.description || "No description registered."}</p>
        </li>
      ))}
    </ul>
  );
}

function RisksTable({ items }: { items: RegistryRisk[] }) {
  return (
    <ul className="divide-y divide-slate-800/70">
      {items.map((item) => (
        <li key={item.risk_id} className="py-2">
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-accent-300">{item.risk_id}</span>
            <span className="text-slate-400">{item.kind}</span>
            <StateChip state={item.state} />
          </p>
          <p className="mt-0.5 text-xs text-slate-200">{item.title || "Not Provided"}</p>
          <p className="text-[11px] text-slate-500">{item.description || "No description registered."}</p>
        </li>
      ))}
    </ul>
  );
}
