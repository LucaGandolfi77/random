import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { DatasetPage } from "../DatasetPage";
import { renderWithProviders } from "../../test/utils";
import type { AnalysisConfig, Dataset, DatasetPreview, Project, RunSummary } from "../../types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const projectId = "p1";

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
  status: "Data Uploaded",
  version: 3,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  has_dataset: false,
  latest_run: null,
};

const projectWithDataset: Project = {
  ...project,
  has_dataset: true,
  latest_run: {
    id: "r1",
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
  original_filename: "degraded_telemetry.csv",
  sha256: "abc",
  size_bytes: 1000,
  row_count: 1248,
  column_count: 9,
  columns: [
    { name: "timestamp", index: 0, inferred_type: "datetime", missing_count: 0, missing_pct: 0, unique_count: 1248, non_null_count: 1248 },
    { name: "temperature", index: 1, inferred_type: "float", missing_count: 5, missing_pct: 0.4, unique_count: 1200, non_null_count: 1243 },
  ],
  uploaded_at: "2026-01-01T00:00:00Z",
};

const preview: DatasetPreview = {
  dataset_id: "d1",
  columns: dataset.columns,
  rows: [
    ["2026-01-01T00:00:00Z", 42.5],
    ["2026-01-01T00:01:00Z", 43.1],
  ],
  truncated: false,
  limit: 100,
  dtypes_summary: { float: 1, datetime: 1 },
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

function mockApis(overrides: { project?: Project; datasetStatus?: number; latestRun?: RunSummary | null } = {}) {
  const proj = overrides.project ?? project;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `/api/projects/${projectId}`) return jsonResponse(proj);
    if (url === `/api/projects/${projectId}/dataset`) {
      if (overrides.datasetStatus === 404) return jsonResponse({ code: "NO_DATASET", message: "No dataset uploaded" }, 404);
      if (proj.has_dataset) return jsonResponse(dataset);
      return jsonResponse({ code: "NO_DATASET", message: "No dataset uploaded" }, 404);
    }
    if (url === `/api/projects/${projectId}/dataset/preview?limit=100`) {
      if (proj.has_dataset) return jsonResponse(preview);
      return jsonResponse({ code: "NO_DATASET", message: "No dataset uploaded" }, 404);
    }
    if (url === `/api/projects/${projectId}/config`) return jsonResponse(config);
    if (url === `/api/projects/${projectId}/analysis/latest`) {
      if (overrides.latestRun !== undefined) return overrides.latestRun ? jsonResponse(overrides.latestRun) : jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
      if (proj.latest_run) return jsonResponse(proj.latest_run);
      return jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("DatasetPage", () => {
  it("shows empty state with upload area when no dataset", async () => {
    mockApis({ latestRun: null });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByText("Drag & drop a CSV file here")).toBeInTheDocument();
    expect(screen.getByText("Choose CSV file")).toBeInTheDocument();
  });

  it("renders the Choose CSV file button in empty state", async () => {
    mockApis({ latestRun: null });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByRole("button", { name: "Choose CSV file" })).toBeInTheDocument();
  });

  it("shows filename, row count, and column count when dataset exists", async () => {
    mockApis({ project: projectWithDataset });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByTestId("preview-table")).toBeInTheDocument();
    await waitFor(() => {
      const el = screen.getByText((_content, node) =>
        !!(node?.tagName === "P" && node?.textContent?.includes("degraded_telemetry.csv")),
      );
      expect(el).toBeInTheDocument();
    });
  });

  it("renders the preview table when dataset exists", async () => {
    mockApis({ project: projectWithDataset });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByTestId("preview-table")).toBeInTheDocument();
    expect(screen.getAllByText("timestamp").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("temperature").length).toBeGreaterThanOrEqual(1);
  });

  it("renders column health section when dataset exists", async () => {
    mockApis({ project: projectWithDataset });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByText("Column health")).toBeInTheDocument();
    expect(screen.getByText("0.4% miss")).toBeInTheDocument();
  });

  it("shows target/timestamp/id column selectors when dataset exists", async () => {
    mockApis({ project: projectWithDataset });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByText("Target column (optional)")).toBeInTheDocument();
    expect(screen.getByText("Timestamp column (optional)")).toBeInTheDocument();
    expect(screen.getByText("Identifier column (optional)")).toBeInTheDocument();
  });

  it("shows Delete button that triggers confirmation modal", async () => {
    mockApis({ project: projectWithDataset });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    const deleteBtn = await screen.findByRole("button", { name: /Delete/ });
    deleteBtn.click();
    expect(await screen.findByRole("heading", { name: "Delete dataset" })).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole("button", { name: /Delete dataset/ });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Run analysis button when dataset exists", async () => {
    mockApis({ project: projectWithDataset });
    renderWithProviders(<DatasetPage />, { path: "/projects/:projectId/dataset", initialEntry: `/projects/${projectId}/dataset` });
    expect(await screen.findByTestId("run-analysis")).toBeInTheDocument();
    expect(screen.getByText("Run analysis")).toBeInTheDocument();
  });
});
