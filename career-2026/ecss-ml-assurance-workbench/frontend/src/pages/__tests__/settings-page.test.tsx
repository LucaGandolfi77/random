import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { SettingsPage } from "../SettingsPage";
import { renderWithProviders } from "../../test/utils";
import type { AnalysisConfig, Dataset, Health, Project } from "../../types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const projectId = "p1";

const project: Project = {
  id: projectId,
  name: "ADCS detector",
  description: "Test project",
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
  latest_run: null,
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

const health: Health = {
  status: "ok",
  version: "1.2.3",
  environment: "test",
  database: "ok",
  timestamp: "2026-08-01T00:00:00Z",
};

function mockApis() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `/api/projects/${projectId}`) return jsonResponse(project);
    if (url === `/api/projects/${projectId}/dataset`) return jsonResponse(dataset);
    if (url === `/api/projects/${projectId}/dataset/preview?limit=100`) return jsonResponse({ dataset_id: "d1", columns: [], rows: [], truncated: false, limit: 100, dtypes_summary: {} });
    if (url === `/api/projects/${projectId}/config`) return jsonResponse(config);
    if (url === `/api/projects/${projectId}/analysis/latest`) return jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
    if (url === `/api/projects/${projectId}/reports`) return jsonResponse([]);
    if (url === "/api/health") return jsonResponse(health);
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("SettingsPage", () => {
  it("renders the Settings heading", async () => {
    mockApis();
    renderWithProviders(<SettingsPage />, { path: "/projects/:projectId/settings", initialEntry: `/projects/${projectId}/settings` });
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders analysis thresholds section", async () => {
    mockApis();
    renderWithProviders(<SettingsPage />, { path: "/projects/:projectId/settings", initialEntry: `/projects/${projectId}/settings` });
    expect(await screen.findByText("Analysis thresholds")).toBeInTheDocument();
    expect(screen.getByText("Missing values threshold (%)")).toBeInTheDocument();
    expect(screen.getByText("IQR multiplier")).toBeInTheDocument();
  });

  it("renders application info section", async () => {
    mockApis();
    renderWithProviders(<SettingsPage />, { path: "/projects/:projectId/settings", initialEntry: `/projects/${projectId}/settings` });
    expect(await screen.findByText("Application")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
    expect(screen.getByText(/online/)).toBeInTheDocument();
    expect(screen.getByText("data.csv")).toBeInTheDocument();
  });

  it("renders the danger zone with delete button", async () => {
    mockApis();
    renderWithProviders(<SettingsPage />, { path: "/projects/:projectId/settings", initialEntry: `/projects/${projectId}/settings` });
    expect(await screen.findByText("Danger zone")).toBeInTheDocument();
    expect(screen.getByText("Delete project")).toBeInTheDocument();
  });
});
