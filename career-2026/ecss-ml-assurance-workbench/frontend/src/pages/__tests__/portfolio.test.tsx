import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortfolioProjectsPage } from "../PortfolioProjectsPage";
import { PortfolioProjectPage } from "../PortfolioProjectPage";
import { renderWithProviders } from "../../test/utils";
import type { PortfolioDetail, PortfolioSummary } from "../../types/portfolio";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

const summary: PortfolioSummary = {
  id: "PRJ-TAD-001", slug: "telemetry-anomaly-detector", name: "Telemetry Anomaly Detector",
  short_description: "ML anomaly detection demo",
  lifecycle_status: "UNDER_VERIFICATION", assurance_status: "SUPPORTED_WITH_LIMITATIONS",
  deployment_decision: "CONDITIONAL_GO", version: "1.2.0", model_version: "m1", dataset_version: "d1",
  criticality: "High", updated_at: "2026-01-01T00:00:00Z",
  requirements_total: 12, requirements_verified: 8,
  tests_defined: 11, tests_passed: 8, tests_failed: 2, tests_blocked: 1, tests_not_executed: 0, tests_inconclusive: 0,
  evidence_count: 9, risk_count: 4, open_limitations: 3, fmea_count: 5,
  package_completeness_pct: 69.2, package_missing_manifest: "MISSING",
};

const detail: PortfolioDetail = {
  project: { id: "PRJ-TAD-001", name: "Telemetry Anomaly Detector", version: "1.2.0" },
  requirements: [
    { requirement_id: "REQ-P-002", title: "Missed anomaly bound", category: "PERFORMANCE", priority: "HIGH",
      verification_method: "TEST", status: "NOT_VERIFIED", coverage: { tests: ["TEST-TAD-003"], evidence: ["EVID-TAD-008"] },
      gaps: { no_test: false, no_evidence: false, has_failed_test: true, not_verified: true } },
    { requirement_id: "REQ-P-001", title: "FPR bound", category: "PERFORMANCE", priority: "HIGH",
      verification_method: "TEST", status: "VERIFIED", coverage: { tests: ["TEST-TAD-001"], evidence: [] },
      gaps: { no_test: false, no_evidence: true, has_failed_test: false, not_verified: false } },
  ],
  tests: [
    { case: { test_id: "TEST-TAD-001", title: "Nominal", test_type: "DATASET", severity_on_failure: "MEDIUM" },
      result: { verdict: "PASS", environment: "sim", actual_result: "ok", failure_reason: "" } },
    { case: { test_id: "TEST-TAD-003", title: "Unseen anomaly", test_type: "SCENARIO", severity_on_failure: "HIGH" },
      result: { verdict: "FAIL", environment: "sim", actual_result: "recall 0.61", failure_reason: "unseen pattern" } },
  ],
  evidence: [{ evidence_id: "EVID-TAD-001", title: "Eval", evidence_type: "TEST_RESULT", status: "VALID", file_reference: null, content_hash: "" }],
  risks: [{ risk_id: "RISK-TAD-001", title: "Missed anomaly", acceptance_status: "ACCEPTABLE_WITH_LIMITATIONS",
    initial_severity: 5, initial_likelihood: 3, initial_risk_level: "HIGH", residual_severity: 4, residual_likelihood: 2,
    residual_risk_level: "MEDIUM", acceptance_rationale: "accepted with monitoring", owner: "x", review_date: "d" }],
  limitations: [{ limitation_id: "LIM-TAD-001", title: "Unseen coverage", description: "d", affected_scope: "model",
    impact: "i", workaround: "", operational_constraint: "", severity: "HIGH", status: "OPEN" }],
  fmea: [{ fmea_item_id: "FM-TAD-001", function: "detect", failure_mode: "missed", severity: 5, occurrence: 3, detectability: 3, residual_risk: "M" }],
  deployment_decision: { decision: "CONDITIONAL_GO", decision_date: "2026-08-15", approver: "board",
    review_status: "APPROVED", decision_summary: "conditional", rationale: "r", rollback_strategy: "rs",
    blocking_findings: ["TEST-TAD-003"], accepted_risks: ["RISK-TAD-001"], required_mitigations: ["m"],
    operational_constraints: [], monitoring_requirements: [] },
  deployment_checklist: [{ check: "No blocking failed test", satisfied: false, note: null }],
  model_card: {}, data_quality: {}, odd: { input_ranges: [], unsupported_modes: [], fallback: "f", prohibited_region: "p", operational_objective: "o" },
  monitoring: { metrics: [], alert_thresholds: {}, escalation: "e", safe_state: "s", rollback_trigger: "rt" },
  coverage: { verdict_counts: { PASS: 1, FAIL: 1, BLOCKED: 0, NOT_EXECUTED: 0, INCONCLUSIVE: 0, NOT_APPLICABLE: 0 } },
  traceability: [],
  completeness: { overall_indicator_pct: 69.2, categories: { integrity_manifest: { state: "MISSING" } } },
  packages: [],
};

describe("PortfolioProjectsPage", () => {
  it("renders the four-project portfolio table with decisions and test counts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/portfolio/projects/summary") return jsonResponse([summary]);
      throw new Error(`unexpected fetch ${url}`);
    });
    renderWithProviders(<PortfolioProjectsPage />, { path: "/portfolio", initialEntry: "/portfolio" });
    expect(await screen.findByRole("heading", { name: "Week-3 portfolio" })).toBeInTheDocument();
    expect(await screen.findByText("Telemetry Anomaly Detector")).toBeInTheDocument();
    expect(screen.getAllByText("CONDITIONAL_GO").length).toBeGreaterThan(0);
    // P/F/B/NE cell (numbers rendered in separate spans within one cell)
    expect(
      screen.getByText((_content, element) => element?.tagName === "TD" && element?.textContent === "8/2/1/0"),
    ).toBeInTheDocument();
  });
});

describe("PortfolioProjectPage", () => {
  it("shows requirements, risk and deployment sections and filters failed tests", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/portfolio/projects/PRJ-TAD-001") return jsonResponse(detail);
      throw new Error(`unexpected fetch ${url}`);
    });
    renderWithProviders(<PortfolioProjectPage />, { path: "/portfolio/:projectId", initialEntry: "/portfolio/PRJ-TAD-001" });
    expect(await screen.findByRole("heading", { name: "Telemetry Anomaly Detector" })).toBeInTheDocument();
    expect(screen.getByTestId("requirements-table")).toBeInTheDocument();
    expect(screen.getAllByText("CONDITIONAL_GO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missed anomaly").length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByTestId("verdict-filter"), "FAIL");
    const rows = Array.from(document.querySelectorAll('[data-verdict]'));
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute("data-verdict")).toBe("FAIL");
  });
});
