import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AssuranceAnalysisPage } from "../AssuranceAnalysisPage";
import { renderWithProviders } from "../../test/utils";
import type { PortfolioDetail } from "../../types/portfolio";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const projectId = "PRJ-TAD-001";

const portfolioDetail: PortfolioDetail = {
  project: { id: projectId, name: "Telemetry Anomaly Detector", version: "1.2.0" },
  requirements: [],
  tests: [],
  evidence: [],
  risks: [],
  limitations: [],
  fmea: [],
  deployment_decision: { decision: "CONDITIONAL_GO", decision_date: "2026-08-15", approver: "board",
    review_status: "APPROVED", decision_summary: "conditional", rationale: "r", rollback_strategy: "rs",
    blocking_findings: [], accepted_risks: [], required_mitigations: [],
    operational_constraints: [], monitoring_requirements: [] },
  deployment_checklist: [],
  model_card: {},
  data_quality: {},
  odd: { input_ranges: [], unsupported_modes: [], fallback: "f", prohibited_region: "p", operational_objective: "o" },
  monitoring: { metrics: [], alert_thresholds: {}, escalation: "e", safe_state: "s", rollback_trigger: "rt" },
  coverage: { verdict_counts: { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_EXECUTED: 0, INCONCLUSIVE: 0, NOT_APPLICABLE: 0 } },
  traceability: [],
  completeness: { overall_indicator_pct: 0, categories: {} },
  packages: [],
};

const gapsData = {
  gap_count: 2,
  blocking_count: 1,
  gaps: [
    { gap_id: "GAP-001", category: "TESTING", severity: "High", title: "No test for requirement", description: "Missing test coverage", blocking: true },
    { gap_id: "GAP-002", category: "EVIDENCE", severity: "Medium", title: "Weak evidence", description: "Evidence does not fully cover the requirement", blocking: false },
  ],
};

const gateData = {
  recommendation: "CONDITIONAL_GO",
  official_deployment_decision: null,
  rules: [
    { rule_id: "RULE-01", description: "All critical tests pass", result: "FAIL", severity: "Critical", blocking: true },
    { rule_id: "RULE-02", description: "Evidence linked", result: "PASS", severity: "High", blocking: false },
  ],
  inconsistencies: [],
  blocking_fails: ["RULE-01"],
};

const dimsData = {
  dimensions: [
    { dimension_id: "DIM-1", name: "Requirements coverage", numerator: 3, denominator: 5, status: "PARTIAL" },
    { dimension_id: "DIM-2", name: "Test pass rate", numerator: 2, denominator: 3, status: "PARTIAL" },
  ],
};

const traceData = {
  orphan_ids: ["REQ-MISSING-01"],
  duplicate_ids: [],
};

const monitoringData = {
  status: "CONFIGURED",
  metrics: [
    { monitoring_id: "MON-001", name: "Latency p99", warning_threshold: "200ms", critical_threshold: "500ms" },
    { monitoring_id: "MON-002", name: "Error rate", warning_threshold: "1%", critical_threshold: "5%" },
  ],
};

function mockAllEndpoints(overrides: Record<string, Response> = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (overrides[url]) return overrides[url];
    if (url === `/api/portfolio/projects/${projectId}`) return jsonResponse(portfolioDetail);
    if (url === `/api/assurance-engine/projects/${projectId}/gaps`) return jsonResponse(gapsData);
    if (url === `/api/assurance-engine/projects/${projectId}/deployment-gate`) return jsonResponse(gateData);
    if (url === `/api/assurance-engine/projects/${projectId}/dimensions`) return jsonResponse(dimsData);
    if (url === `/api/assurance-engine/projects/${projectId}/traceability-issues`) return jsonResponse(traceData);
    if (url === `/api/assurance-engine/projects/${projectId}/monitoring`) return jsonResponse(monitoringData);
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("AssuranceAnalysisPage", () => {
  it("shows a loading spinner before data loads", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Loading assurance analysis/)).toBeInTheDocument();
  });

  it("renders the page title and action buttons", async () => {
    mockAllEndpoints();
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByText("Assurance analysis (week 5)")).toBeInTheDocument();
    expect(screen.getByText("Generate assurance report")).toBeInTheDocument();
    expect(screen.getByText("Validate evidence package")).toBeInTheDocument();
  });

  it("renders the gap table with gap data", async () => {
    mockAllEndpoints();
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByTestId("gaps-table")).toBeInTheDocument();
    expect(screen.getByText("No test for requirement")).toBeInTheDocument();
    expect(screen.getByText("Weak evidence")).toBeInTheDocument();
    expect(screen.getByText("GAP-001")).toBeInTheDocument();
    expect(screen.getByText("GAP-002")).toBeInTheDocument();
  });

  it("renders the deployment gate recommendation", async () => {
    mockAllEndpoints();
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByText("CONDITIONAL_GO")).toBeInTheDocument();
    expect(screen.getByText("RULE-01")).toBeInTheDocument();
    expect(screen.getByText("RULE-02")).toBeInTheDocument();
    expect(screen.getByText(/Blocking rules failed/)).toBeInTheDocument();
  });

  it("renders the dimensions table", async () => {
    mockAllEndpoints();
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByTestId("dims-table")).toBeInTheDocument();
    expect(screen.getByText("Requirements coverage")).toBeInTheDocument();
    expect(screen.getByText("Test pass rate")).toBeInTheDocument();
  });

  it("displays traceability issues count", async () => {
    mockAllEndpoints();
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByText(/Orphan references/)).toBeInTheDocument();
    expect(screen.getByText(/Duplicate ids/)).toBeInTheDocument();
    expect(screen.getByText("REQ-MISSING-01")).toBeInTheDocument();
  });

  it("displays monitoring metrics", async () => {
    mockAllEndpoints();
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByText(/Status:/)).toBeInTheDocument();
    expect(screen.getByText("Latency p99")).toBeInTheDocument();
    expect(screen.getByText("Error rate")).toBeInTheDocument();
    expect(screen.getByText("warn: 200ms")).toBeInTheDocument();
  });

  it("shows error state with retry option when gate fetch fails", async () => {
    mockAllEndpoints({
      [`/api/assurance-engine/projects/${projectId}/deployment-gate`]: jsonResponse({ code: "ERROR", message: "boom" }, 500),
    });
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByText("Could not evaluate the gate.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows error state for gaps when fetch fails", async () => {
    mockAllEndpoints({
      [`/api/assurance-engine/projects/${projectId}/gaps`]: jsonResponse({ code: "ERROR", message: "boom" }, 500),
    });
    renderWithProviders(<AssuranceAnalysisPage />, {
      path: "/assurance-analysis/:projectId",
      initialEntry: `/assurance-analysis/${projectId}`,
    });
    expect(await screen.findByText("Could not analyze gaps.")).toBeInTheDocument();
  });
});
