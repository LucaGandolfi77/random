import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ScorePanel } from "../ScorePanel";
import type { ScoreResult } from "../../../types";

const highScore: ScoreResult = {
  overall_score: 92.5,
  coverage_pct: 75.0,
  pass_count: 6,
  warning_count: 1,
  fail_count: 0,
  not_applicable_count: 1,
  not_evaluated_count: 1,
  method: "weighted-penalty v1",
  categories: [
    { name: "Data Quality", score: 95.0, weight: 20, evaluated: true, pass_count: 3, warning_count: 0, fail_count: 0, not_applicable_count: 0 },
    { name: "Model Robustness", score: 88.0, weight: 25, evaluated: true, pass_count: 2, warning_count: 1, fail_count: 0, not_applicable_count: 0 },
    { name: "Coverage", score: null, weight: 15, evaluated: false, pass_count: 0, warning_count: 0, fail_count: 0, not_applicable_count: 1 },
    { name: "Safety Cases", score: 90.0, weight: 20, evaluated: true, pass_count: 1, warning_count: 0, fail_count: 0, not_applicable_count: 0 },
  ],
};

const lowScore: ScoreResult = {
  overall_score: 45.0,
  coverage_pct: 50.0,
  pass_count: 2,
  warning_count: 2,
  fail_count: 4,
  not_applicable_count: 0,
  not_evaluated_count: 0,
  method: "weighted-penalty v1",
  categories: [
    { name: "Data Quality", score: 30.0, weight: 20, evaluated: true, pass_count: 0, warning_count: 1, fail_count: 3, not_applicable_count: 0 },
    { name: "Model Robustness", score: 60.0, weight: 25, evaluated: true, pass_count: 2, warning_count: 1, fail_count: 1, not_applicable_count: 0 },
  ],
};

describe("ScorePanel", () => {
  it("renders the overall score", () => {
    render(<ScorePanel score={highScore} />);
    expect(screen.getByText("92.5")).toBeInTheDocument();
  });

  it("renders PASS/WARNING/FAIL counts", () => {
    render(<ScorePanel score={highScore} />);
    // Use the summary panel section to verify counts
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the coverage percentage", () => {
    render(<ScorePanel score={highScore} />);
    expect(screen.getByText("75.0% (3/8)")).toBeInTheDocument();
  });

  it("renders category rows in the table", () => {
    render(<ScorePanel score={highScore} />);
    const table = screen.getByTestId("score-table");
    expect(within(table).getByText("Data Quality")).toBeInTheDocument();
    expect(within(table).getByText("Model Robustness")).toBeInTheDocument();
    expect(within(table).getByText("Coverage")).toBeInTheDocument();
    expect(within(table).getByText("Safety Cases")).toBeInTheDocument();
  });

  it("shows score for evaluated categories", () => {
    render(<ScorePanel score={highScore} />);
    const table = screen.getByTestId("score-table");
    expect(within(table).getByText("95.0")).toBeInTheDocument();
  });

  it("shows dash for non-evaluated categories", () => {
    render(<ScorePanel score={highScore} />);
    const table = screen.getByTestId("score-table");
    const coverageRow = within(table).getByText("Coverage").closest("tr")!;
    expect(within(coverageRow).getByText("—")).toBeInTheDocument();
  });

  it("renders the SCORE_DISCLAIMER banner", () => {
    render(<ScorePanel score={highScore} />);
    expect(screen.getByText(/The Data Readiness Score is a decision-support indicator/i)).toBeInTheDocument();
  });

  it("applies red tone for low scores", () => {
    render(<ScorePanel score={lowScore} />);
    const scoreEl = screen.getByText("45.0");
    expect(scoreEl.className).toContain("text-red-300");
  });

  it("renders weight percentages", () => {
    render(<ScorePanel score={highScore} />);
    const table = screen.getByTestId("score-table");
    expect(within(table).getAllByText(/20%/).length).toBeGreaterThanOrEqual(1);
    expect(within(table).getByText(/25%/)).toBeInTheDocument();
  });
});
