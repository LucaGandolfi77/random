import { Play } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, Spinner } from "../components/ui/Feedback";
import { FindingsExplorer } from "../components/features/FindingsExplorer";
import { ScorePanel } from "../components/features/ScorePanel";
import { useProjectParam } from "../hooks/useProjectParam";
import { useProjectMutations } from "../hooks/useProjectMutations";
import { useProjectData } from "../hooks/useProjectData";
import { formatDate } from "../utils/format";

const SCORE_CATEGORIES = [
  "Structure",
  "Completeness",
  "Consistency",
  "Duplicates",
  "Statistical Quality",
  "Target Quality",
  "Time Quality",
  "Traceability",
];

export function DataReadinessPage() {
  const projectId = useProjectParam();
  const { dataset, config, latestRun, score, projectError } = useProjectData(projectId);
  const { runAnalysis } = useProjectMutations();

  if (projectError) {
    return <ErrorState message={projectError instanceof Error ? projectError.message : "Could not load project"} />;
  }

  if (!dataset) {
    return (
      <Card>
        <EmptyState
          title="No dataset yet"
          description="Upload a CSV on the Dataset page to start the Data Readiness inspection."
        />
      </Card>
    );
  }

  if (!latestRun) {
    return (
      <div className="space-y-4">
        <Header lastRun={null} />
        <Card>
          <EmptyState
            title="Analysis not run yet"
            description="Run the Data Readiness analysis against the uploaded dataset."
            action={
              <Button onClick={() => runAnalysis.mutate(projectId)} data-testid="run-analysis">
                <Play className="h-4 w-4" /> Run analysis
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (latestRun.status === "failed") {
    return (
      <div className="space-y-4">
        <Header lastRun={latestRun.completed_at} />
        <ErrorState message={`Analysis failed: ${latestRun.error_message || "unknown error"}`} onRetry={() => runAnalysis.mutate(projectId)} />
      </div>
    );
  }

  if (latestRun.status !== "completed" || !score) {
    return (
      <div className="space-y-4">
        <Header lastRun={null} />
        <Spinner label="Preparing results" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Data Readiness</h1>
          <p className="text-xs text-slate-400">
            {dataset.original_filename} · analysis {formatDate(latestRun.completed_at)}
            {config?.target_column ? ` · target: ${config.target_column}` : " · no target configured"}
          </p>
        </div>
        <Button onClick={() => runAnalysis.mutate(projectId)} disabled={runAnalysis.isPending} data-testid="run-analysis">
          <Play className="h-4 w-4" /> {runAnalysis.isPending ? "Running…" : "Re-run analysis"}
        </Button>
      </div>

      <ScorePanel score={score} />

      <Card
        title="Findings"
        subtitle="Every check produces a structured result with severity, evidence and recommendation."
        bodyClassName="p-0"
      >
        <div className="p-4">
          <FindingsExplorer runId={latestRun.id} columns={dataset.columns} categories={SCORE_CATEGORIES} />
        </div>
      </Card>
    </div>
  );
}

function Header({ lastRun }: { lastRun: string | null | undefined }) {
  return (
    <header>
      <h1 className="text-lg font-semibold text-slate-100">Data Readiness</h1>
      <p className="text-xs text-slate-400">{lastRun ? `Last analysis: ${formatDate(lastRun)}` : "No analysis yet"}</p>
    </header>
  );
}
