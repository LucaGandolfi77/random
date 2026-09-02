import { FileJson, FilePlus2, Download, Eye } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, Spinner } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Modal";
import { useProjectParam } from "../hooks/useProjectParam";
import { useProjectMutations } from "../hooks/useProjectMutations";
import { useProjectData } from "../hooks/useProjectData";
import { formatBytes, formatDate } from "../utils/format";
import { endpoints } from "../api/endpoints";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export function ReportsPage() {
  const projectId = useProjectParam();
  const { latestRun, reports } = useProjectData(projectId);
  const { generateReport } = useProjectMutations();
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: content } = useQuery({
    queryKey: ["report-content", viewing],
    queryFn: () => endpoints.getReportContent(viewing!),
    enabled: Boolean(viewing),
  });

  const canGenerate = latestRun?.status === "completed";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Reports</h1>
          <p className="text-xs text-slate-400">Versioned, deterministic JSON export of the current analysis.</p>
        </div>
        <Button
          onClick={() => latestRun && generateReport.mutate(latestRun.id)}
          disabled={!canGenerate || generateReport.isPending}
          data-testid="export-report"
        >
          <FilePlus2 className="h-4 w-4" /> {generateReport.isPending ? "Generating…" : "Export JSON report"}
        </Button>
      </header>

      {!canGenerate ? (
        <Card>
          <EmptyState
            title="No completed analysis"
            description="Export requires a completed analysis run. Run the Data Readiness analysis first."
          />
        </Card>
      ) : !reports || reports.length === 0 ? (
        <Card>
          <EmptyState title="No report exported yet" description="Generate the versioned JSON report for this run." />
        </Card>
      ) : (
        <Card title={`Exported reports (${reports.length})`}>
          <ul className="divide-y divide-slate-800/70">
            {reports.map((report) => (
              <li key={report.id} className="flex flex-wrap items-center gap-3 py-3">
                <FileJson className="h-5 w-5 shrink-0 text-accent-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-slate-200">{report.filename}</p>
                  <p className="text-[11px] text-slate-500">
                    schema v{report.schema_version} · {formatBytes(report.size_bytes)} · {formatDate(report.generated_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => setViewing(report.id)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <a className="btn-secondary !py-1.5 !text-xs" href={endpoints.downloadReportUrl(report.id)} download>
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Report JSON" wide>
        {content ? (
          <pre className="max-h-[70vh] overflow-auto rounded bg-base-950 p-3 text-[11px] leading-relaxed text-slate-300">
            {JSON.stringify(content, null, 2)}
          </pre>
        ) : (
          <Spinner label="Loading report" />
        )}
      </Modal>
    </div>
  );
}
