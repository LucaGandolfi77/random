import { Download } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/Feedback";
import { FindingsExplorer } from "../components/features/FindingsExplorer";
import { useProjectParam } from "../hooks/useProjectParam";
import { useProjectData } from "../hooks/useProjectData";
import { useFindings, DEFAULT_FILTERS } from "../hooks/useFindings";
import { endpoints } from "../api/endpoints";

const CATEGORIES = [
  "Structure",
  "Completeness",
  "Consistency",
  "Duplicates",
  "Statistical Quality",
  "Target Quality",
  "Time Quality",
  "Traceability",
];

export function FindingsPage() {
  const projectId = useProjectParam();
  const { dataset, latestRun } = useProjectData(projectId);
  const { data: counts } = useFindings(latestRun?.id, DEFAULT_FILTERS);

  if (!latestRun) {
    return (
      <Card>
        <EmptyState title="No findings yet" description="Run the Data Readiness analysis to generate findings." />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Findings</h1>
          <p className="text-xs text-slate-400">
            {counts?.total ?? 0} structured results from run {latestRun.id.slice(0, 8)}
          </p>
        </div>
        <a href={endpoints.exportFindingsCsvUrl(latestRun.id)} download>
          <Button variant="secondary">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </a>
      </header>
      <Card bodyClassName="p-0">
        <div className="p-4">
          <FindingsExplorer runId={latestRun.id} columns={dataset?.columns ?? []} categories={CATEGORIES} />
        </div>
      </Card>
    </div>
  );
}
