// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Random site", () => {
  test("'A caso' respects the active type filter", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const randomButton = page.getByRole("button", { name: "A caso" });
    const article = page.getByRole("article");

    // 1. Enable the 'Menhir' chip and click 'A caso' several times
    await page.getByRole("button", { name: "Menhir" }).click();

    for (let i = 0; i < 3; i++) {
      await randomButton.click();
      await expect(page).toHaveURL(/\/nurnet-plus\/poi\/[^/]+\/$/);
      // The sheet's first line shows "<Type> · <Town>, <Area>"
      await expect(article.getByText(/^Menhir · /)).toBeVisible();

      // Note: the sheet has no close button; Escape closes it.
      await page.keyboard.press("Escape");
      await expect(article).toHaveCount(0);
    }
  });
});
