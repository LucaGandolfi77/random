import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Boxes, FolderKanban, Plus, Trash2 } from "lucide-react";
import { endpoints } from "../api/endpoints";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState, Spinner } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { useProjectMutations } from "../hooks/useProjectMutations";
import { STATUS_LABEL, type Project } from "../types";
import { formatDate, joinClassName, shortId } from "../utils/format";

const APP_TYPES = [
  "Telemetry anomaly detection",
  "Health monitoring",
  "Predictive maintenance",
  "Computer vision",
  "Natural language processing",
  "Other",
];

const CRITICALITY = [
  "Low - demonstration",
  "Medium - development",
  "High - engineering model",
  "Critical - mission review required",
];

const emptyForm = {
  name: "",
  description: "",
  application_type: "Telemetry anomaly detection",
  target_platform: "",
  operating_context: "ground",
  criticality_level: "Medium - development",
  ml_function: "",
  notes: "",
};

type ProjectForm = typeof emptyForm;

export function ProjectsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { createProject, deleteProject } = useProjectMutations();
  const { data: projects, isLoading } = useQuery({ queryKey: ["projects"], queryFn: endpoints.listProjects });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    createProject.mutate(form, {
      onSuccess: (project) => navigate(`/projects/${project.id}/overview`),
    });
  };

  const statusTone = (status: string) =>
    status === "Review Required"
      ? "text-amber-300 border-amber-500/40"
      : status === "Analysis Completed" || status === "Ready for Next Stage"
        ? "text-emerald-300 border-emerald-500/40"
        : "text-slate-300 border-slate-600/60";

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Assurance projects</h1>
          <p className="text-xs text-slate-400">
            Engineering support for dataset and ML verification. Not a certification tool.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/assurance" className="btn-secondary" aria-label="Open assurance registry">
            <Boxes className="h-4 w-4" /> Assurance registry
          </Link>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        </div>
      </header>

      {isLoading ? (
        <Spinner label="Loading projects" />
      ) : !projects || projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-8 w-8 text-slate-600" />}
            title="No assurance project yet"
            description="Create a project, upload a CSV dataset and run the Data Readiness Inspector."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Create your first project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/overview`}
              className="panel group block p-4 transition hover:border-accent-600/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-100 group-hover:text-accent-300">{project.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {project.description || project.ml_function || "No description"}
                  </p>
                </div>
                <button
                  className="shrink-0 text-slate-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  onClick={(event) => {
                    event.preventDefault();
                    setDeleting(project);
                  }}
                  aria-label={`Delete ${project.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={joinClassName("rounded border px-1.5 py-0.5", statusTone(project.status))}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
                <span className="font-mono text-slate-500">{shortId(project.id)}</span>
                {project.latest_run?.overall_score !== undefined && project.latest_run?.overall_score !== null && (
                  <span className="ml-auto font-mono text-slate-300">score {project.latest_run.overall_score}</span>
                )}
                <span className="text-slate-500">updated {formatDate(project.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New assurance project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create project"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="field-label">Name *</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ADCS anomaly detector" />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Description</span>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label>
            <span className="field-label">Application type</span>
            <select className="input" value={form.application_type} onChange={(e) => setForm({ ...form, application_type: e.target.value })}>
              {APP_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Target platform</span>
            <input className="input" value={form.target_platform} onChange={(e) => setForm({ ...form, target_platform: e.target.value })} placeholder="e.g. LEO CubeSat (simulated)" />
          </label>
          <label>
            <span className="field-label">Operating context</span>
            <select className="input" value={form.operating_context} onChange={(e) => setForm({ ...form, operating_context: e.target.value })}>
              <option value="onboard">Onboard</option>
              <option value="ground">Ground</option>
            </select>
          </label>
          <label title="Descriptive internal assessment only — not an official classification.">
            <span className="field-label">Criticality (descriptive)</span>
            <select className="input" value={form.criticality_level} onChange={(e) => setForm({ ...form, criticality_level: e.target.value })}>
              {CRITICALITY.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">ML function under assessment</span>
            <input className="input" value={form.ml_function} onChange={(e) => setForm({ ...form, ml_function: e.target.value })} placeholder="e.g. classify reaction-wheel anomaly" />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Notes</span>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) deleteProject.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Delete project <strong>{deleting?.name}</strong> and its stored dataset? The audit trail for this project is removed as well.
        </p>
      </Modal>
    </div>
  );
}
