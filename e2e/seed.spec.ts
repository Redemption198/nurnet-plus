import { test, expect } from "@playwright/test";

test.describe("Test group", () => {
  test("seed", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });
  });
});
