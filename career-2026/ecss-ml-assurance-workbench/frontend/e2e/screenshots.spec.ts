import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHOT_DIR = path.join(__dirname, "../../portfolio/screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

test.describe("screenshot automation (portfolio)", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test.use({ viewport });
    test(`capture landing and portfolio (${viewport.name})`, async ({ page }) => {
      const captures: Array<[string, string]> = [
        ["/workbench", "workbench-landing"],
        ["/portfolio", "portfolio-overview"],
        ["/portfolio/PRJ-SEU-001", "project-seu"],
        ["/flagship", "flagship-lunar"],
        ["/publications", "publications"],
      ];
      for (const [url, name] of captures) {
        await page.goto(url);
        await page.waitForTimeout(400);
        const file = path.join(SHOT_DIR, `${name}-${viewport.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
      }
      const sample = path.join(SHOT_DIR, `portfolio-overview-${viewport.name}.png`);
      expect(sample.length).toBeGreaterThan(0);
    });

    test(`capture assurance analysis (${viewport.name})`, async ({ page }) => {
      await page.goto("/portfolio/PRJ-TAD-001");
      await page.getByTestId("assurance-analysis").click();
      await expect(page.getByTestId("gaps-table")).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `assurance-analysis-${viewport.name}.png`), fullPage: true });
    });
  }
});
