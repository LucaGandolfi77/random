import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { Card } from "../components/ui/Card";
import { useProjectParam } from "../hooks/useProjectParam";
import { useProjectMutations } from "../hooks/useProjectMutations";
import { useProjectData } from "../hooks/useProjectData";
import { Button } from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Modal } from "../components/ui/Modal";
import { Trash2 } from "lucide-react";

export function SettingsPage() {
  const projectId = useProjectParam();
  const { config, dataset } = useProjectData(projectId);
  const { updateConfig, deleteProject } = useProjectMutations();
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: endpoints.health });
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setThreshold = (key: string, value: number) => {
    updateConfig.mutate({ id: projectId, payload: { [key]: value } });
  };

  if (!config) return null;

  const rows: Array<{ key: string; label: string; help: string; step?: number }> = [
    { key: "missing_threshold_pct", label: "Missing values threshold (%)", help: "Per-column missing share that triggers a WARNING." },
    { key: "iqr_multiplier", label: "IQR multiplier", help: "Fence multiplier for possible outlier detection.", step: 0.1 },
    { key: "quasi_constant_threshold_pct", label: "Quasi-constant threshold (%)", help: "Dominant category share considered quasi-constant." },
    { key: "rare_category_threshold_pct", label: "Rare category threshold (%)", help: "Categories below this frequency are rare." },
    { key: "duplicate_rows_threshold_pct", label: "Duplicate rows threshold (%)", help: "Duplicate share above which the check FAILs." },
    { key: "imbalance_ratio_warn", label: "Target imbalance ratio", help: "Majority/minority ratio that triggers a WARNING." },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-400">Analysis thresholds and application information.</p>
      </header>

      <Card
        title="Analysis thresholds"
        subtitle="Thresholds are stored per project and applied deterministically by the analyzers."
        bodyClassName="space-y-3"
      >
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor={row.key} className="block text-sm text-slate-200">
                {row.label}
              </label>
              <p className="text-[11px] text-slate-500">{row.help}</p>
            </div>
            <input
              id={row.key}
              type="number"
              step={row.step ?? 1}
              min={0}
              className="input !w-24 text-right font-mono"
              value={config[row.key as keyof typeof config] as number}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed)) setThreshold(row.key, parsed);
              }}
            />
          </div>
        ))}
        <p className="text-[11px] text-slate-500">
          Changing a threshold does not re-run the analysis automatically — use “Re-run analysis” on the Data Readiness page.
        </p>
      </Card>

      <Card title="Application">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Tool version</dt>
            <dd className="font-mono text-slate-200">{health?.version ?? "…"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Backend</dt>
            <dd className="text-slate-200">{health?.status === "ok" ? "online" : "offline"} ({health?.environment ?? "…"})</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Active dataset</dt>
            <dd className="text-slate-200">{dataset ? dataset.original_filename : "none"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Project id</dt>
            <dd className="font-mono text-slate-400">{projectId}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-200">Delete this project</p>
            <p className="text-xs text-slate-500">Removes the project, its stored dataset and all analysis history.</p>
          </div>
          <Button
            variant="danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete project
          </Button>
        </div>
      </Card>

      <Modal open={Boolean(health && confirmDelete)} onClose={() => setConfirmDelete(false)} title="Delete project">
        <p className="text-sm text-slate-300">This action permanently deletes the project and its data. Continue?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              deleteProject.mutate(projectId, {
                onSuccess: () => navigate("/projects"),
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
