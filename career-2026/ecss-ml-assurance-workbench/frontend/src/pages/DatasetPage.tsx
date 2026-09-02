import { useCallback, useRef, useState } from "react";
import { UploadCloud, Trash2, Play, FileSpreadsheet } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Spinner, WarningBanner } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Modal";
import { useProjectParam } from "../hooks/useProjectParam";
import { useProjectMutations } from "../hooks/useProjectMutations";
import { useProjectData } from "../hooks/useProjectData";
import { joinClassName, formatBytes, formatDate } from "../utils/format";
import type { ColumnInfo } from "../types";

const TYPE_TONE: Record<string, string> = {
  integer: "text-sky-300 border-sky-500/40",
  float: "text-sky-300 border-sky-500/40",
  boolean: "text-violet-300 border-violet-500/40",
  categorical: "text-emerald-300 border-emerald-500/40",
  text: "text-slate-300 border-slate-600/50",
  datetime: "text-amber-300 border-amber-500/40",
};

export function DatasetPage() {
  const projectId = useProjectParam();
  const { dataset, preview, config, latestRun } = useProjectData(projectId);
  const { uploadDataset, deleteDataset, updateConfig, runAnalysis } = useProjectMutations();
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);

  const autoRun = useCallback(() => {
    if (runAnalysis.isPending) return;
    runAnalysis.mutate(projectId, {
      onSettled: () => setAnalysisBusy(false),
    });
  }, [projectId, runAnalysis]);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    setAnalysisBusy(true);
    uploadDataset.mutate(
      { id: projectId, file },
      {
        onSuccess: () => autoRun(),
        onSettled: () => setAnalysisBusy(false),
      },
    );
  };

  const saveSelection = (patch: { target_column?: string | null; timestamp_column?: string | null; id_column?: string | null }) => {
    const hadDataset = Boolean(dataset);
    updateConfig.mutate(
      { id: projectId, payload: patch },
      { onSuccess: () => hadDataset && runAnalysis.mutate(projectId) },
    );
  };

  const selectFor = (role: "target_column" | "timestamp_column" | "id_column", columnName: string | null) =>
    saveSelection({ [role]: columnName || null });

  if (!dataset) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-lg font-semibold text-slate-100">Dataset</h1>
          <p className="text-xs text-slate-400">CSV upload with automatic quality inspection.</p>
        </header>
        <Card>
          <div
            className={joinClassName(
              "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition",
              dragging ? "border-accent-400 bg-accent-600/10" : "border-slate-700",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud className={joinClassName("h-10 w-10", dragging ? "text-accent-300" : "text-slate-500")} />
            <div>
              <p className="text-sm font-medium text-slate-200">Drag &amp; drop a CSV file here</p>
              <p className="mt-1 text-xs text-slate-500">
                Comma separated text. Files are stored under a server-generated name; original names are never trusted.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
              data-testid="file-input"
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploadDataset.isPending || analysisBusy}>
              {uploadDataset.isPending || analysisBusy ? "Uploading & analysing…" : "Choose CSV file"}
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Analysis runs automatically after a successful upload. Uploaded content is never executed.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Dataset</h1>
          <p className="text-xs text-slate-400">
            {dataset.original_filename} · {dataset.row_count.toLocaleString()} rows × {dataset.column_count} columns ·{" "}
            {formatBytes(dataset.size_bytes)} · uploaded {formatDate(dataset.uploaded_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploadDataset.isPending}>
            <FileSpreadsheet className="h-4 w-4" /> Replace CSV
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          data-testid="file-input"
        />
      </header>

      {latestRun?.status === "failed" && (
        <WarningBanner>Last analysis failed: {latestRun.error_message || "unknown error"}. Fix the dataset or re-run.</WarningBanner>
      )}

      <Card
        title="Schema & column roles"
        subtitle="Type inference is automatic and informational; confirm the roles used by the analysis."
        actions={
          <Button onClick={() => autoRun()} disabled={runAnalysis.isPending} data-testid="run-analysis">
            <Play className="h-4 w-4" /> {runAnalysis.isPending ? "Running…" : "Run analysis"}
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="field-label">Target column (optional)</span>
            <select className="input" value={config?.target_column ?? ""} onChange={(e) => selectFor("target_column", e.target.value)}>
              <option value="">— none —</option>
              {dataset.columns.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Timestamp column (optional)</span>
            <select className="input" value={config?.timestamp_column ?? ""} onChange={(e) => selectFor("timestamp_column", e.target.value)}>
              <option value="">— none —</option>
              {dataset.columns.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Identifier column (optional)</span>
            <select className="input" value={config?.id_column ?? ""} onChange={(e) => selectFor("id_column", e.target.value)}>
              <option value="">— none —</option>
              {dataset.columns.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-4">
        <Card title={`Preview (first ${preview?.rows.length ?? 0} rows)`} className="lg:col-span-3" bodyClassName="p-0">
          <PreviewTable columns={dataset.columns} rows={preview?.rows ?? []} truncated={preview?.truncated ?? false} loading={!preview} />
        </Card>
        <Card title="Column health" bodyClassName="max-h-[28rem] overflow-y-auto space-y-1">
          {dataset.columns.map((column) => (
            <ColumnHealth key={column.name} column={column} />
          ))}
        </Card>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete dataset">
        <p className="text-sm text-slate-300">
          Delete <strong>{dataset.original_filename}</strong>? The stored file is removed. Existing analysis results and reports
          stay in the project history.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteDataset.mutate(projectId);
              setConfirmDelete(false);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete dataset
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PreviewTable({
  columns,
  rows,
  truncated,
  loading,
}: {
  columns: ColumnInfo[];
  rows: Array<Array<string | number | boolean | null>>;
  truncated: boolean;
  loading: boolean;
}) {
  if (loading) return <Spinner label="Loading preview" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" data-testid="preview-table">
        <thead className="sticky top-0 bg-base-800 text-[10px] uppercase tracking-wide text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column.name} className="whitespace-nowrap border-b border-slate-700 px-2 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-200">{column.name}</span>
                  <span className={joinClassName("w-fit rounded border px-1 font-mono normal-case", TYPE_TONE[column.inferred_type])}>
                    {column.inferred_type}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-800/60 hover:bg-base-800/40">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="max-w-[220px] truncate whitespace-nowrap px-2 py-1.5 font-mono text-slate-300">
                  {cell === null ? <span className="text-red-400/80">∅</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No rows to preview.</p>}
      {truncated && <p className="border-t border-slate-800 p-2 text-[11px] text-slate-500">Showing the first {rows.length} rows.</p>}
    </div>
  );
}

function ColumnHealth({ column }: { column: ColumnInfo }) {
  const missingRatio = column.missing_count / Math.max(1, column.missing_count + column.non_null_count);
  return (
    <div className="rounded border border-slate-800 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-slate-200">{column.name}</span>
        <span className={joinClassName("rounded border px-1 font-mono text-[10px]", TYPE_TONE[column.inferred_type] ?? "text-slate-400")}>
          {column.inferred_type}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded bg-slate-800">
          <div className={joinClassName("h-full", missingRatio > 0.1 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${Math.min(100, missingRatio * 100)}%` }} />
        </div>
        <span className="w-14 shrink-0 text-right font-mono text-[10px] text-slate-500">{column.missing_pct.toFixed(1)}% miss</span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500">{column.non_null_count} values · {column.unique_count} unique</p>
    </div>
  );
}
