import { expect, test } from "@playwright/test";

/**
 * Week-3 E2E flows against the running Docker stack:
 * 1) TAD: requirements -> failed-tests filter -> risk -> decision -> generate -> download
 * 2) SEU: silent-data-corruption FAIL visible; decision NO_GO; generate + verify integrity
 * 3) LLS: ODD -> FMEA -> limitations -> deployment decision (deployment report in package)
 */

test.describe("week-3 portfolio flows", () => {
  test("Flow 1: Telemetry Anomaly Detector end-to-end", async ({ page }) => {
    await page.goto("/portfolio");
    await expect(page.getByRole("heading", { name: "Week-3 portfolio" })).toBeVisible();
    await page.getByRole("link", { name: "Telemetry Anomaly Detector" }).click();
    await expect(page.getByRole("heading", { name: "Telemetry Anomaly Detector" })).toBeVisible();

    // requirements present
    await expect(page.getByTestId("requirements-table")).toBeVisible();
    await expect(page.getByText("REQ-P-001", { exact: true })).toBeVisible();

    // filter failed tests
    await page.getByTestId("verdict-filter").selectOption("FAIL");
    await expect(page.locator('[data-verdict="FAIL"]').first()).toBeVisible();

    // risk + decision visible
    await expect(page.getByTestId("risk-card").first()).toBeVisible();
    await expect(page.getByText("CONDITIONAL_GO").first()).toBeVisible();

    // generate + download
    await page.getByTestId("generate-package").first().click();
    await expect(page.getByTestId("verify-package")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("verify-package").click();
    await expect(page.getByText(/Verification: VALID/)).toBeVisible({ timeout: 20_000 });
  });

  test("Flow 2: SEU Fault Injector silent data corruption is NOT_ACCEPTABLE / NO_GO", async ({ page }) => {
    await page.goto("/portfolio/PRJ-SEU-001");
    await expect(page.getByRole("heading", { name: "SEU Fault Injector" })).toBeVisible();

    await page.getByTestId("verdict-filter").selectOption("FAIL");
    await expect(page.getByText("Silent data corruption sweep")).toBeVisible();

    await page.getByTestId("verdict-filter").selectOption("");
    await expect(page.getByText("NOT_ACCEPTABLE").first()).toBeVisible();
    await expect(page.getByText("NO_GO").first()).toBeVisible();
  });

  test("Flow 3: Lunar Landing Safety Cage ODD/FMEA/limitations", async ({ page }) => {
    await page.goto("/portfolio/PRJ-LLS-001");
    await expect(page.getByRole("heading", { name: "Lunar Landing Safety Cage" })).toBeVisible();
    await expect(page.getByText("Operational Design Domain")).toBeVisible();
    await expect(page.getByText("vertical_velocity", { exact: true })).toBeVisible();
    await expect(page.getByTestId("fmea-table")).toBeVisible();
    await expect(page.getByText("Common-mode failure", { exact: true })).toBeVisible();
    await expect(page.getByText("Simulator-only validation", { exact: true })).toBeVisible();
    await expect(page.getByText("CONDITIONAL_GO").first()).toBeVisible();
  });
});
