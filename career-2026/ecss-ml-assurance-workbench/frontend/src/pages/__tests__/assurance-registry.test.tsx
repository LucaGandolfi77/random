import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AssuranceRegistryPage } from "../AssuranceRegistryPage";
import { renderWithProviders } from "../../test/utils";
import type { RegistrySummary } from "../../types/assurance";

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

const summaryWithTests: RegistrySummary = {
  id: "PRJ-ABC-002",
  name: "Predictive Maintenance",
  slug: "predictive-maintenance",
  assurance_status: "Gaps Open",
  model_status: "Available",
  deployment_status: "Decision Pending",
  lifecycle_status: "Under Verification",
  criticality: "Medium - development",
  artefact_available: 5,
  artefact_total: 9,
  requirements: 4,
  tests_registered: 6,
  tests_passed: 4,
  tests_failed: 1,
  tests_not_executed: 1,
  risks: 2,
  evidence: 3,
  packages: 1,
  last_updated: "2026-06-15T00:00:00Z",
};

describe("AssuranceRegistryPage", () => {
  it("shows a loading spinner while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Loading registry/)).toBeInTheDocument();
  });

  it("renders the page title", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([summary]));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByRole("heading", { name: "Assurance registry" })).toBeInTheDocument();
  });

  it("renders the project list with project names and statuses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([summary, summaryWithTests]));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByText("Telemetry Anomaly Detector")).toBeInTheDocument();
    expect(screen.getByText("Predictive Maintenance")).toBeInTheDocument();
    expect(screen.getAllByText("Not Available").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Decision Pending").length).toBeGreaterThanOrEqual(1);
  });

  it("displays test counts as P/F/NE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([summaryWithTests]));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByTestId("registry-table")).toBeInTheDocument();
    expect(
      screen.getByText((_content, element) => element?.tagName === "TD" && element?.textContent === "4/1/1"),
    ).toBeInTheDocument();
  });

  it("shows zero test counts as 0/0/0", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([summary]));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByTestId("registry-table")).toBeInTheDocument();
    expect(
      screen.getByText((_content, element) => element?.tagName === "TD" && element?.textContent === "0/0/0"),
    ).toBeInTheDocument();
  });

  it("renders assurance status badges", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([summary]));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    await screen.findByTestId("registry-table");
    expect(screen.getAllByText("Not Available").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Decision Pending").length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no projects are returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByText("No tracked projects")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ code: "ERROR", message: "boom" }, 500));
    renderWithProviders(<AssuranceRegistryPage />, { path: "/assurance", initialEntry: "/assurance" });
    expect(await screen.findByText("Could not load the assurance registry.")).toBeInTheDocument();
  });
});
