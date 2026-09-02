import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Week-1 main path E2E:
 * create project -> upload degraded_telemetry.csv -> configure target
 * -> run analysis -> findings visible -> export report.
 * Prerequisite: `docker compose up --build -d` running the stack.
 */
const SAMPLE = path.resolve(__dirname, "../../sample-data/degraded_telemetry.csv");

test("main assurance flow on degraded_telemetry.csv", async ({ page }) => {
  // 1. create project
  await page.goto("/projects");
  await page.getByRole("button", { name: /new project/i }).first().click();
  await page.getByLabel(/Name \*/i).fill(`E2E ${Date.now()}`);
  await page.getByRole("button", { name: /create project/i }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/overview/);

  // 2. upload degraded csv (auto-runs analysis)
  await page.goto(page.url().replace(/overview$/, "dataset"));
  await page.getByTestId("file-input").setInputFiles(SAMPLE);
  await expect(page.getByTestId("preview-table")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Column health")).toBeVisible();

  // 3. configure target column (re-runs analysis)
  await page.getByLabel("Target column (optional)").selectOption("anomaly_label");
  await page.goto(page.url().replace(/dataset$/, "data-readiness"));
  await expect(page.getByTestId("score-table")).toBeVisible({ timeout: 30_000 });

  // 4. run analysis explicitly (idempotent)
  await page.getByTestId("run-analysis").click();
  await expect(page.getByTestId("score-table")).toBeVisible({ timeout: 30_000 });

  // 5. degraded data yields at least one WARNING/FAIL finding
  await page.getByRole("link", { name: "Findings" }).click();
  await expect(page.getByTestId("findings-table")).toBeVisible();
  await expect(page.getByText("Duplicate rows", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Missing values above threshold: bus_voltage", { exact: true })).toBeVisible({ timeout: 30_000 });

  // 6. export report
  await page.getByRole("link", { name: "Reports" }).click();
  await page.getByTestId("export-report").click();
  await expect(page.getByText(/Exported reports \(1\)/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("a[download]")).toBeVisible();

  // ensure the file we tested with really exists on disk
  expect(() => readFileSync(SAMPLE)).not.toThrow();
});
