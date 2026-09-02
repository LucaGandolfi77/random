import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FindingsExplorer } from "../FindingsExplorer";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../../test/utils";
import type { Finding } from "../../../types";

function finding(over: Partial<Finding>): Finding {
  return {
    id: "f-" + (over.id ?? Math.random()),
    check_id: "check",
    category: "Structure",
    title: "Sample finding",
    description: "description",
    status: "PASS",
    severity: "INFO",
    observed_value: "",
    threshold: "",
    columns: [],
    evidence: {},
    risk: "",
    recommendation: "",
    analyzer_version: "0.1.0",
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderExplorer(runId: string | undefined) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FindingsExplorer runId={runId} columns={[]} categories={[]} showDetails={false} />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("FindingsExplorer", () => {
  it("shows an empty state without a run", () => {
    renderExplorer(undefined);
    expect(screen.getByText("No analysis results")).toBeInTheDocument();
  });

  it("renders results and filters by severity", async () => {
    const user = userEvent.setup();
    const warning = finding({ id: "w1", status: "WARNING", severity: "MEDIUM", title: "Warning finding" });
    const pass = finding({ id: "p1", status: "PASS", severity: "INFO", title: "Pass finding" });
    const all = { items: [warning, pass], total: 2, limit: 500, offset: 0, applied_filters: {} };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/analysis/r1/findings")) {
        const severity = new URL(url, "http://x").searchParams.get("severity");
        if (severity === "MEDIUM") {
          return jsonResponse({ items: [warning], total: 1, limit: 500, offset: 0, applied_filters: { severity: "WARNING" } });
        }
        return jsonResponse(all);
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    renderExplorer("r1");
    expect(await screen.findByText("Warning finding")).toBeInTheDocument();
    expect(screen.getByText("Pass finding")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter by severity"), "MEDIUM");
    await waitFor(() => expect(screen.getByText("1 results")).toBeInTheDocument());
    const table = screen.getByTestId("findings-table");
    expect(within(table).getByText("Warning finding")).toBeInTheDocument();
    expect(within(table).queryByText("Pass finding")).not.toBeInTheDocument();
  });
});
