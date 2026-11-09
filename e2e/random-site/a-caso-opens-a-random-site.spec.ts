// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Random site", () => {
  test("'A caso' opens a random site", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const randomButton = page.getByRole("button", { name: "A caso" });

    // 1. Click the 'A caso' button
    await randomButton.click();
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/[^/]+\/$/);
    // Note: the sheet is an <article> labelled with the site name (no h1/h2 heading, no close button).
    await expect(page.getByRole("article")).toBeVisible();
    await expect(page.getByRole("article")).toHaveAccessibleName(/\S+/);

    // 2. Close the sheet and click 'A caso' again
    // Note: the plan says "close the sheet", but the sheet has no visible close button; Escape closes it.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);

    await randomButton.click();
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/[^/]+\/$/);
    await expect(page.getByRole("article")).toBeVisible();
  });
});
