import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AssuranceRegistryPage } from "../AssuranceRegistryPage";
import { AssuranceProjectPage } from "../AssuranceProjectPage";
import { renderWithProviders } from "../../test/utils";
import type { RegistryProjectDetail, RegistrySummary } from "../../types/assurance";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const summary: RegistrySummary = {
  id: "PRJ-TAD-001",
  name: "Telemetry Anomaly Detector",
  slug: "telemetry-anomaly-detector",
  assurance_status: "Not Available",
  model_status: "Not Available",
  deployment_status: "Decision Pending",
  lifecycle_status: "Not Started",
  criticality: "High - engineering model",
  artefact_available: 0,
  artefact_total: 9,
  requirements: 0,
  tests_registered: 0,
  tests_passed: 0,
  tests_failed: 0,
  tests_not_executed: 0,
  risks: 0,
  evidence: 0,
  packages: 0,
  last_updated: "2026-01-01T00:00:00Z",
};

const detail: RegistryProjectDetail = {
  ...summary,
  updated_at: "2026-01-01T00:00:00Z",
  short_description: "Planned ML function. Not present in the repository.",
  project_type: "ml_classification",
  domain: "onboard-telemetry-monitoring",
  repository_path: "",
  documentation_path: "",
  owner: "Not Provided",
  reviewers: [],
  version: "Not Provided",
  source_type: "Not Available",
  artefact_availability: { PROJECT_CHARTER: "Not Available", MODEL_CARD: "Not Available" },
  related_assets: [],
  tags: ["telemetry"],
  known_limitations: ["No source code found."],
  open_actions: ["Create documentation."],
  notes: "",
  import_procedure: "Not available in the repository.",
  counts: {
    requirements: 0,
    tests_registered: 0,
    tests_passed: 0,
    tests_failed: 0,
    tests_not_executed: 0,
    risks: 0,
    evidence: 0,
    packages: 0,
    artefact_available: 0,
    artefact_total: 2,
  },
  requirements: [],
  tests: [],
  evidence: [],
  risks: [],
  packages: [],
};

describe("AssuranceRegistryPage", () => {
  it("renders availability states and zero-test counts without inventing results", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/assurance/projects/summary") return jsonResponse([summary]);
      if (url === "/api/assurance/projects") return jsonResponse([detail]);
      throw new Error(`unexpected fetch ${url}`);
    });
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByRole("heading", { name: "Assurance registry" })).toBeInTheDocument();
    expect(await screen.findByText("Telemetry Anomaly Detector")).toBeInTheDocument();
    // tests column shows 0 passed / 0 failed / 0 not-executed (spans inside one cell)
    expect(
      screen.getByText((_content, element) => element?.tagName === "TD" && element?.textContent === "0/0/0"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not Available").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Decision Pending").length).toBeGreaterThan(0);
  });
});

describe("AssuranceProjectPage", () => {
  it("shows artefact gaps and a package action for a not-available project", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/assurance/projects/PRJ-TAD-001") return jsonResponse(detail);
      if (url === "/api/assurance/projects/PRJ-TAD-001/evidence-packages") return jsonResponse([]);
      throw new Error(`unexpected fetch ${url}`);
    });
    renderWithProviders(<AssuranceProjectPage />, { path: "/assurance/:projectId", initialEntry: "/assurance/PRJ-TAD-001" });
    expect(await screen.findByText("Telemetry Anomaly Detector")).toBeInTheDocument();
    expect(await screen.findByText("Generate evidence package")).toBeInTheDocument();
    expect(screen.getByText("No test records registered — zero tests are reported as zero, never as passed or failed.")).toBeInTheDocument();
    expect(screen.getByText("PROJECT_CHARTER")).toBeInTheDocument();
  });
});
