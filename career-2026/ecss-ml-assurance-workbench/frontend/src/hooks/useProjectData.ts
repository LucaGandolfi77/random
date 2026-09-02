import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import type {
  AnalysisConfig,
  Dataset,
  DatasetPreview,
  Project,
  ReportInfo,
  RunSummary,
  ScoreResult,
} from "../types";

export const qk = {
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  dataset: (projectId: string) => ["dataset", projectId] as const,
  preview: (projectId: string) => ["preview", projectId] as const,
  config: (projectId: string) => ["config", projectId] as const,
  latestRun: (projectId: string) => ["latest-run", projectId] as const,
  score: (runId: string | undefined) => ["score", runId ?? "none"] as const,
  reports: (projectId: string) => ["reports", projectId] as const,
  audit: (projectId: string) => ["audit", projectId] as const,
};

export function useHealth(pollMs = 15000) {
  return useQuery({
    queryKey: ["health"],
    queryFn: endpoints.health,
    refetchInterval: pollMs,
    retry: 2,
    staleTime: 5000,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.project(projectId ?? ""),
    queryFn: () => endpoints.getProject(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useDataset(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.dataset(projectId ?? ""),
    queryFn: () => endpoints.getDataset(projectId!),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function usePreview(projectId: string | undefined, datasetId: string | undefined) {
  return useQuery({
    queryKey: qk.preview(projectId ?? ""),
    queryFn: () => endpoints.getPreview(projectId!),
    enabled: Boolean(projectId) && Boolean(datasetId),
  });
}

export function useConfig(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.config(projectId ?? ""),
    queryFn: () => endpoints.getConfig(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useLatestRun(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.latestRun(projectId ?? ""),
    queryFn: () => endpoints.latestRun(projectId!),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useScore(runId: string | undefined) {
  return useQuery({
    queryKey: qk.score(runId),
    queryFn: () => endpoints.getScore(runId!),
    enabled: Boolean(runId),
    retry: false,
  });
}

export function useReports(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.reports(projectId ?? ""),
    queryFn: () => endpoints.listReports(projectId!),
    enabled: Boolean(projectId),
  });
}

/** Aggregated query bundle for one project — reduces wiring in pages. */
export interface ProjectData {
  project?: Project;
  dataset?: Dataset;
  preview?: DatasetPreview;
  config?: AnalysisConfig;
  latestRun?: RunSummary;
  score?: ScoreResult;
  reports?: ReportInfo[];
  projectLoading: boolean;
  projectError: unknown;
}
export function useProjectData(projectId: string | undefined): ProjectData {
  const project = useProject(projectId);
  const dataset = useDataset(projectId);
  const preview = usePreview(projectId, dataset.data?.id);
  const config = useConfig(projectId);
  const latestRun = useLatestRun(projectId);
  const score = useScore(latestRun.data?.id);
  const reports = useReports(projectId);

  return {
    project: project.data,
    dataset: dataset.data,
    preview: preview.data,
    config: config.data,
    latestRun: latestRun.data,
    score: score.data,
    reports: reports.data,
    projectLoading: project.isLoading || project.isFetching,
    projectError: project.error,
  };
}
