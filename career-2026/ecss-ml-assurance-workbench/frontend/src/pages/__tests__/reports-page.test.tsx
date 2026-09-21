import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ReportsPage } from "../ReportsPage";
import { renderWithProviders } from "../../test/utils";
import type { AnalysisConfig, Dataset, Project, ReportInfo, RunSummary } from "../../types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const projectId = "p1";
const runId = "r1";

const project: Project = {
  id: projectId,
  name: "ADCS detector",
  description: "",
  application_type: "Telemetry anomaly detection",
  target_platform: "sim",
  operating_context: "onboard",
  criticality_level: "Medium - development",
  ml_function: "anomaly",
  notes: "",
  status: "Analysis Completed",
  version: 3,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  has_dataset: true,
  latest_run: {
    id: runId,
    project_id: projectId,
    dataset_id: "d1",
    status: "completed",
    started_at: "2026-01-01T00:00:00Z",
    completed_at: "2026-01-01T00:01:00Z",
    config_snapshot: {},
    overall_score: 88.5,
  },
};

const dataset: Dataset = {
  id: "d1",
  project_id: projectId,
  original_filename: "data.csv",
  sha256: "abc",
  size_bytes: 1000,
  row_count: 100,
  column_count: 5,
  columns: [],
  uploaded_at: "2026-01-01T00:00:00Z",
};

const config: AnalysisConfig = {
  project_id: projectId,
  target_column: null,
  timestamp_column: null,
  id_column: null,
  missing_threshold_pct: 10,
  iqr_multiplier: 1.5,
  quasi_constant_threshold_pct: 98,
  rare_category_threshold_pct: 1,
  dominant_category_threshold_pct: 90,
  high_cardinality_ratio: 0.5,
  duplicate_rows_threshold_pct: 5,
  imbalance_ratio_warn: 10,
};

const reports: ReportInfo[] = [
  {
    id: "rep-001",
    project_id: projectId,
    run_id: runId,
    schema_version: "1.0",
    filename: "report_r1.json",
    size_bytes: 2048,
    generated_at: "2026-08-01T10:00:00Z",
  },
];

function mockApis(overrides: { reports?: ReportInfo[]; latestRun?: RunSummary | null } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `/api/projects/${projectId}`) return jsonResponse(project);
    if (url === `/api/projects/${projectId}/dataset`) return jsonResponse(dataset);
    if (url === `/api/projects/${projectId}/dataset/preview?limit=100`) return jsonResponse({ dataset_id: "d1", columns: [], rows: [], truncated: false, limit: 100, dtypes_summary: {} });
    if (url === `/api/projects/${projectId}/config`) return jsonResponse(config);
    if (url === `/api/projects/${projectId}/analysis/latest`) {
      if (overrides.latestRun !== undefined) return overrides.latestRun ? jsonResponse(overrides.latestRun) : jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
      if (project.latest_run) return jsonResponse(project.latest_run);
      return jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
    }
    if (url === `/api/projects/${projectId}/reports`) {
      return jsonResponse(overrides.reports ?? reports);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("ReportsPage", () => {
  it("shows empty state when no completed analysis", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<ReportsPage />, { path: "/projects/:projectId/reports", initialEntry: `/projects/${projectId}/reports` });
    expect(await screen.findByText("No completed analysis")).toBeInTheDocument();
  });

  it("renders the Reports heading", async () => {
    mockApis();
    renderWithProviders(<ReportsPage />, { path: "/projects/:projectId/reports", initialEntry: `/projects/${projectId}/reports` });
    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
  });

  it("renders report list with report details", async () => {
    mockApis();
    renderWithProviders(<ReportsPage />, { path: "/projects/:projectId/reports", initialEntry: `/projects/${projectId}/reports` });
    expect(await screen.findByText("report_r1.json")).toBeInTheDocument();
    expect(screen.getByText(/schema v1\.0/)).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
  });

  it("renders Export JSON report button", async () => {
    mockApis();
    renderWithProviders(<ReportsPage />, { path: "/projects/:projectId/reports", initialEntry: `/projects/${projectId}/reports` });
    expect(await screen.findByTestId("export-report")).toBeInTheDocument();
    expect(screen.getByText("Export JSON report")).toBeInTheDocument();
  });

  it("shows empty state when no reports exist", async () => {
    mockApis({ reports: [] });
    renderWithProviders(<ReportsPage />, { path: "/projects/:projectId/reports", initialEntry: `/projects/${projectId}/reports` });
    expect(await screen.findByText("No report exported yet")).toBeInTheDocument();
  });

  it("shows empty state when no completed analysis", async () => {
    mockApis({ latestRun: null });
    renderWithProviders(<ReportsPage />, { path: "/projects/:projectId/reports", initialEntry: `/projects/${projectId}/reports` });
    expect(await screen.findByText("No completed analysis")).toBeInTheDocument();
  });
});
