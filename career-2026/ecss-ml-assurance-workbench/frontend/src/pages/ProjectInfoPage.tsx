import { useState } from "react";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Feedback";
import { useProjectParam } from "../hooks/useProjectParam";
import { useProjectMutations } from "../hooks/useProjectMutations";
import { useProjectData } from "../hooks/useProjectData";
import { STATUS_LABEL, type Project } from "../types";
import { formatDate } from "../utils/format";

const CRITICALITY_OPTIONS = [
  "Low - demonstration",
  "Medium - development",
  "High - engineering model",
  "Critical - mission review required",
];
const STATUS_OPTIONS = Object.keys(STATUS_LABEL);

function Field({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function ProjectInfoPage() {
  const projectId = useProjectParam();
  const { project } = useProjectData(projectId);
  const { updateProject } = useProjectMutations();
  const { data: audit } = useQuery({ queryKey: ["audit", projectId], queryFn: () => endpoints.projectAudit(projectId) });
  const [form, setForm] = useState<Partial<Project> | null>(null);

  if (!project) return <Spinner />;
  const value = form ?? project;

  const set = (key: keyof Project, val: string) => setForm({ ...value, [key]: val });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-lg font-semibold text-slate-100">Project Information</h1>
        <p className="text-xs text-slate-400">Metadata for the assurance case under review.</p>
      </header>

      <Card
        title="Details"
        actions={
          <Button
            onClick={() =>
              updateProject.mutate({ id: projectId, payload: { ...value, status: value.status ?? undefined } })
            }
            disabled={!form}
          >
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <input className="input" value={value.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="ML function">
            <input className="input" value={value.ml_function ?? ""} onChange={(e) => set("ml_function", e.target.value)} />
          </Field>
          <Field label="Application type">
            <input className="input" value={value.application_type ?? ""} onChange={(e) => set("application_type", e.target.value)} />
          </Field>
          <Field label="Target platform">
            <input className="input" value={value.target_platform ?? ""} onChange={(e) => set("target_platform", e.target.value)} />
          </Field>
          <Field label="Operating context">
            <select className="input" value={value.operating_context ?? "ground"} onChange={(e) => set("operating_context", e.target.value)}>
              <option value="onboard">Onboard</option>
              <option value="ground">Ground</option>
            </select>
          </Field>
          <Field label="Criticality (descriptive, internal)">
            <select className="input" value={value.criticality_level ?? ""} onChange={(e) => set("criticality_level", e.target.value)}>
              {CRITICALITY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={value.status ?? ""} onChange={(e) => set("status", e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Version">
            <p className="input !py-2 font-mono text-slate-400">v{project.version}</p>
          </Field>
          <Field label="Description" span>
            <textarea className="input" rows={2} value={value.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Notes" span>
            <textarea className="input" rows={2} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Created {formatDate(project.created_at)} · Last modified {formatDate(project.updated_at)}
        </p>
      </Card>

      <Card title="Audit trail" bodyClassName="max-h-96 overflow-y-auto">
        {!audit || audit.length === 0 ? (
          <p className="text-sm text-slate-400">No audit events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {audit.map((event) => (
              <li key={event.id} className="flex items-start gap-3 py-2 text-xs">
                <span className="mt-0.5 rounded bg-accent-600/15 px-1.5 py-0.5 font-mono text-[10px] text-accent-300">
                  {event.event_type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-slate-400">
                    {event.details && Object.keys(event.details).length > 0 ? JSON.stringify(event.details) : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-slate-500">{formatDate(event.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
