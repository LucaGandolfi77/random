import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { FindingsPage } from "../FindingsPage";
import { renderWithProviders } from "../../test/utils";
import type { AnalysisConfig, Dataset, FindingsPage as FindingsPageType, Project } from "../../types";

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
  columns: [
    { name: "col_a", index: 0, inferred_type: "float", missing_count: 0, missing_pct: 0, unique_count: 100, non_null_count: 100 },
  ],
  uploaded_at: "2026-01-01T00:00:00Z",
};

const findingsPage: FindingsPageType = {
  items: [
    {
      id: "f1",
      check_id: "CHK-001",
      category: "Structure",
      title: "Missing primary key",
      description: "No unique identifier column detected",
      status: "WARNING",
      severity: "MEDIUM",
      observed_value: "0 unique id columns",
      threshold: ">= 1",
      columns: [],
      evidence: {},
      risk: "Duplicate rows may not be detected",
      recommendation: "Designate an ID column",
      analyzer_version: "1.0.0",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "f2",
      check_id: "CHK-002",
      category: "Completeness",
      title: "High missing values in col_a",
      description: "Column has >10% missing",
      status: "FAIL",
      severity: "HIGH",
      observed_value: "15.2%",
      threshold: "<= 10%",
      columns: ["col_a"],
      evidence: {},
      risk: "Model may learn biased patterns",
      recommendation: "Impute or remove column",
      analyzer_version: "1.0.0",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  total: 2,
  limit: 500,
  offset: 0,
  applied_filters: {},
};

const emptyFindings: FindingsPageType = {
  items: [],
  total: 0,
  limit: 500,
  offset: 0,
  applied_filters: {},
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

function mockApis(findingsData: FindingsPageType = findingsPage) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `/api/projects/${projectId}`) return jsonResponse(project);
    if (url === `/api/projects/${projectId}/dataset`) return jsonResponse(dataset);
    if (url === `/api/projects/${projectId}/dataset/preview?limit=100`) return jsonResponse({ dataset_id: "d1", columns: dataset.columns, rows: [], truncated: false, limit: 100, dtypes_summary: {} });
    if (url === `/api/projects/${projectId}/config`) return jsonResponse(config);
    if (url === `/api/projects/${projectId}/analysis/latest`) return jsonResponse(project.latest_run);
    if (url === `/api/projects/${projectId}/reports`) return jsonResponse([]);
    if (url.startsWith(`/api/analysis/${runId}/findings`)) return jsonResponse(findingsData);
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("FindingsPage", () => {
  it("shows empty state when latest run is loading", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    expect(await screen.findByText("No findings yet")).toBeInTheDocument();
  });

  it("renders the Findings heading", async () => {
    mockApis();
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    expect(await screen.findByRole("heading", { name: "Findings" })).toBeInTheDocument();
  });

  it("renders findings table with finding data", async () => {
    mockApis();
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    expect(await screen.findByTestId("findings-table")).toBeInTheDocument();
    expect(screen.getByText("Missing primary key")).toBeInTheDocument();
    expect(screen.getByText("High missing values in col_a")).toBeInTheDocument();
  });

  it("displays the total count of findings", async () => {
    mockApis();
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    expect(await screen.findByText(/2 structured results/)).toBeInTheDocument();
  });

  it("has status and severity filter dropdowns", async () => {
    mockApis();
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    await screen.findByTestId("findings-table");
    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by severity")).toBeInTheDocument();
  });

  it("shows empty state when no findings match", async () => {
    mockApis(emptyFindings);
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    expect(await screen.findByText("No findings match the current filters.")).toBeInTheDocument();
  });

  it("shows empty state when no analysis run exists", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `/api/projects/${projectId}`) return jsonResponse({ ...project, latest_run: null });
      if (url === `/api/projects/${projectId}/dataset`) return jsonResponse(dataset);
      if (url === `/api/projects/${projectId}/dataset/preview?limit=100`) return jsonResponse({ dataset_id: "d1", columns: [], rows: [], truncated: false, limit: 100, dtypes_summary: {} });
      if (url === `/api/projects/${projectId}/config`) return jsonResponse(config);
      if (url === `/api/projects/${projectId}/analysis/latest`) return jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
      if (url === `/api/projects/${projectId}/reports`) return jsonResponse([]);
      throw new Error(`unexpected fetch ${url}`);
    });
    renderWithProviders(<FindingsPage />, { path: "/projects/:projectId/findings", initialEntry: `/projects/${projectId}/findings` });
    expect(await screen.findByText("No findings yet")).toBeInTheDocument();
  });
});
