import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ProjectInfoPage } from "../ProjectInfoPage";
import { renderWithProviders } from "../../test/utils";
import type { AnalysisConfig, AuditEvent, Dataset, Project } from "../../types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const projectId = "p1";

const project: Project = {
  id: projectId,
  name: "ADCS detector",
  description: "Telemetry anomaly detection for spacecraft",
  application_type: "Telemetry anomaly detection",
  target_platform: "sim",
  operating_context: "onboard",
  criticality_level: "Medium - development",
  ml_function: "anomaly",
  notes: "Some notes",
  status: "Analysis Completed",
  version: 3,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-15T00:00:00Z",
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

const auditEvents: AuditEvent[] = [
  {
    id: "evt-001",
    event_type: "project.created",
    project_id: projectId,
    dataset_id: null,
    run_id: null,
    details: {},
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "evt-002",
    event_type: "dataset.uploaded",
    project_id: projectId,
    dataset_id: "d1",
    run_id: null,
    details: { filename: "data.csv" },
    created_at: "2026-01-02T00:00:00Z",
  },
];

function mockApis(overrides: { audit?: AuditEvent[] } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `/api/projects/${projectId}`) return jsonResponse(project);
    if (url === `/api/projects/${projectId}/dataset`) return jsonResponse(dataset);
    if (url === `/api/projects/${projectId}/dataset/preview?limit=100`) return jsonResponse({ dataset_id: "d1", columns: [], rows: [], truncated: false, limit: 100, dtypes_summary: {} });
    if (url === `/api/projects/${projectId}/config`) return jsonResponse(config);
    if (url === `/api/projects/${projectId}/analysis/latest`) return jsonResponse({ code: "NO_ANALYSIS", message: "none" }, 404);
    if (url === `/api/projects/${projectId}/reports`) return jsonResponse([]);
    if (url === `/api/projects/${projectId}/audit`) return jsonResponse(overrides.audit ?? auditEvents);
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("ProjectInfoPage", () => {
  it("shows a loading spinner before data loads", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<ProjectInfoPage />, { path: "/projects/:projectId/info", initialEntry: `/projects/${projectId}/info` });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the project name in the edit form", async () => {
    mockApis();
    renderWithProviders(<ProjectInfoPage />, { path: "/projects/:projectId/info", initialEntry: `/projects/${projectId}/info` });
    expect(await screen.findByDisplayValue("ADCS detector")).toBeInTheDocument();
  });

  it("renders the edit form with project fields", async () => {
    mockApis();
    renderWithProviders(<ProjectInfoPage />, { path: "/projects/:projectId/info", initialEntry: `/projects/${projectId}/info` });
    expect(await screen.findByText("Project Information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ADCS detector")).toBeInTheDocument();
    expect(screen.getByDisplayValue("anomaly")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Telemetry anomaly detection")).toBeInTheDocument();
    expect(screen.getByDisplayValue("sim")).toBeInTheDocument();
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("renders the audit trail section", async () => {
    mockApis();
    renderWithProviders(<ProjectInfoPage />, { path: "/projects/:projectId/info", initialEntry: `/projects/${projectId}/info` });
    expect(await screen.findByText("Audit trail")).toBeInTheDocument();
    expect(screen.getByText("project.created")).toBeInTheDocument();
    expect(screen.getByText("dataset.uploaded")).toBeInTheDocument();
  });

  it("shows no audit events message when audit is empty", async () => {
    mockApis({ audit: [] });
    renderWithProviders(<ProjectInfoPage />, { path: "/projects/:projectId/info", initialEntry: `/projects/${projectId}/info` });
    expect(await screen.findByText("No audit events recorded yet.")).toBeInTheDocument();
  });

  it("displays the version as read-only", async () => {
    mockApis();
    renderWithProviders(<ProjectInfoPage />, { path: "/projects/:projectId/info", initialEntry: `/projects/${projectId}/info` });
    expect(await screen.findByText("v3")).toBeInTheDocument();
  });
});
