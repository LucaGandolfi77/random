import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectsPage } from "../ProjectsPage";
import { DataReadinessPage } from "../DataReadinessPage";
import { renderWithProviders } from "../../test/utils";
import type { Dataset, Project, ScoreResult } from "../../types";

afterEach(() => {
  vi.restoreAllMocks();
});

const project: Project = {
  id: "p1",
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
    id: "r1",
    project_id: "p1",
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
  project_id: "p1",
  original_filename: "degraded_telemetry.csv",
  sha256: "abc",
  size_bytes: 1000,
  row_count: 1248,
  column_count: 9,
  columns: [],
  uploaded_at: "2026-01-01T00:00:00Z",
};

const score: ScoreResult = {
  overall_score: 88.5,
  coverage_pct: 100,
  categories: [
    { name: "Structure", weight: 15, score: 100, evaluated: true, pass_count: 7, warning_count: 1, fail_count: 0, not_applicable_count: 0 },
  ],
  pass_count: 20,
  warning_count: 5,
  fail_count: 1,
  not_applicable_count: 0,
  not_evaluated_count: 0,
  method: "weighted-penalty v1.0.0",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ProjectsPage", () => {
  it("renders the empty state and opens the create modal", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
    renderWithProviders(<ProjectsPage />, { path: "/", initialEntry: "/" });
    expect(await screen.findByText("Assurance projects")).toBeInTheDocument();
    expect(await screen.findByText("No assurance project yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /create your first project/i }));
    expect(screen.getByLabelText(/Name \*/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith("/api/projects", expect.any(Object));
  });

  it("creates a project via POST and navigates into it", async () => {
    const user = userEvent.setup();
    let postedBody: unknown = null;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/projects" && init?.method === "POST") {
        postedBody = JSON.parse(String(init.body));
        return jsonResponse({ ...project, id: "new-project", name: "Test assurance case" }, 201);
      }
      if (url === "/api/projects") return jsonResponse([]);
      throw new Error(`unexpected fetch ${url}`);
    });
    renderWithProviders(<ProjectsPage />, { path: "/", initialEntry: "/" });
    await user.click(await screen.findByRole("button", { name: /create your first project/i }));
    await user.type(screen.getByLabelText(/Name \*/i), "Test assurance case");
    await user.click(screen.getByRole("button", { name: /create project/i }));
    await waitFor(() => expect(postedBody).toEqual(expect.objectContaining({ name: "Test assurance case" })));
    expect(fetchSpy).toHaveBeenCalled();
  });
});

describe("DataReadinessPage", () => {
  function mockProjectApi(overrides: { datasetStatus?: number; latestRun?: unknown; projectError?: boolean } = {}) {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const path = url.split("?")[0];
      if (method === "GET" && path === "/api/projects/p1") {
        return overrides.projectError
          ? jsonResponse({ code: "INTERNAL_ERROR", message: "boom" }, 500)
          : jsonResponse(project);
      }
      if (method === "GET" && path === "/api/projects/p1/dataset") {
        return overrides.datasetStatus === 404
          ? jsonResponse({ code: "NO_DATASET", message: "No dataset uploaded" }, 404)
          : jsonResponse(dataset);
      }
      if (method === "GET" && path === "/api/projects/p1/dataset/preview") {
        return jsonResponse({ dataset_id: "d1", columns: [], rows: [], truncated: false, limit: 100, dtypes_summary: {} });
      }
      if (method === "GET" && path === "/api/projects/p1/config") {
        return jsonResponse({ project_id: "p1", target_column: null, timestamp_column: null, id_column: null, missing_threshold_pct: 10, iqr_multiplier: 1.5, quasi_constant_threshold_pct: 98, rare_category_threshold_pct: 1, dominant_category_threshold_pct: 90, high_cardinality_ratio: 0.5, duplicate_rows_threshold_pct: 5, imbalance_ratio_warn: 10 });
      }
      if (method === "GET" && path === "/api/projects/p1/reports") return jsonResponse([]);
      if (method === "GET" && path === "/api/projects/p1/analysis/latest") {
        return overrides.latestRun === undefined ? jsonResponse(project.latest_run) : jsonResponse(overrides.latestRun);
      }
      if (method === "GET" && path === "/api/analysis/r1/score") return jsonResponse(score);
      if (method === "GET" && path === "/api/analysis/r1/findings") {
        return jsonResponse({
          items: [],
          total: 0,
          limit: 500,
          offset: 0,
          applied_filters: {},
        });
      }
      throw new Error(`unexpected fetch ${method} ${url}`);
    });
    return fetchSpy;
  }

  it("shows the empty state when the project has no dataset", async () => {
    mockProjectApi({ datasetStatus: 404, latestRun: { code: "NO_ANALYSIS", message: "none" } });
    renderWithProviders(<DataReadinessPage />, { path: "/projects/:projectId", initialEntry: "/projects/p1" });
    expect(await screen.findByText("No dataset yet")).toBeInTheDocument();
  });

  it("renders the score and findings for a completed run", async () => {
    const fetchSpy = mockProjectApi();
    renderWithProviders(<DataReadinessPage />, { path: "/projects/:projectId", initialEntry: "/projects/p1" });
    expect(await screen.findByText("Data Readiness")).toBeInTheDocument();
    expect(await screen.findByTestId("score-table")).toBeInTheDocument();
    expect(await screen.findByText("88.5", { selector: ".font-mono" })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("surfaces API errors as an error state", async () => {
    mockProjectApi({ projectError: true, datasetStatus: 404 });
    renderWithProviders(<DataReadinessPage />, { path: "/projects/:projectId", initialEntry: "/projects/p1" });
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
