import { expect, test } from "@playwright/test";

test.describe("week-4 professional site flows", () => {
  test("Flow 1: recruiter journey (home -> flagship decision -> CV print)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Embedded AI & ML Verification Engineer for Space Systems" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Telemetry Anomaly Detector" }).first()).toBeVisible();
    await page.getByRole("link", { name: "View Flagship Project" }).click();
    await expect(page.getByRole("heading", { name: "Lunar Landing Safety Cage" })).toBeVisible();
    await expect(page.getByText("CONDITIONAL_GO").first()).toBeVisible();
    await expect(page.getByText("NO_GO").first()).toBeVisible();
    await page.goto("/cv");
    await expect(page.getByTestId("cv")).toBeVisible();
    await expect(page.getByText("Core competencies")).toBeVisible();
    const printBtn = page.getByTestId("print-cv");
    await expect(printBtn).toBeVisible();
  });

  test("Flow 3: publication journey (index -> article TOC -> project)", async ({ page }) => {
    await page.goto("/publications");
    await expect(page.getByRole("heading", { name: "Publications" })).toBeVisible();
    await page
      .getByRole("link", { name: "How to Perform a Data Readiness Review for Space ML" })
      .first()
      .click();
    await expect(page.getByText("Table of contents", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Practical Checklist/ }).first()).toBeVisible();
    await page.getByRole("link", { name: "Telemetry Anomaly Detector", exact: false }).first().click();
    await expect(page.getByRole("heading", { name: "Telemetry Anomaly Detector" })).toBeVisible();
  });

  test("Flow 2: engineer journey via Workbench and SEU evidence", async ({ page }) => {
    await page.goto("/site-projects/seu-fault-injector");
    await expect(page.getByRole("heading", { name: "SEU Fault Injector" })).toBeVisible();
    await page.getByRole("link", { name: "Full project data in Workbench" }).click();
    await expect(page.getByRole("heading", { name: "SEU Fault Injector" })).toBeVisible();
    await page.getByTestId("verdict-filter").selectOption("FAIL");
    await expect(page.getByText("Silent data corruption sweep")).toBeVisible();
    await expect(page.getByText("NOT_ACCEPTABLE").first()).toBeVisible();
  });
});
