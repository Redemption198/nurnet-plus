// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { TOTAL_SITES, inMap } from "../data.ts";

test.describe("URL and deep-link state", () => {
  test("Malformed poi URL is handled gracefully", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    let dialogShown = false;
    page.on("dialog", async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });

    // 1. Open /nurnet-plus/poi/%00%3Cscript%3E/
    await page.goto("/nurnet-plus/poi/%00%3Cscript%3E/");

    // Falls back to the map home with the not-found toast
    await expect(page).toHaveURL(/\/nurnet-plus\/$/, { timeout: 30_000 });
    const toast = page.getByRole("listitem").filter({ hasText: "Sito non trovato" });
    await expect(toast).toBeVisible();
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(page.getByText(inMap(TOTAL_SITES)).first()).toBeVisible();

    // ... and open /nurnet-plus/poi/
    await page.goto("/nurnet-plus/poi/");

    // Falls back to the map home. Difference from the plan: no not-found toast is shown for the bare /poi/ URL
    // (there is no site ID to look up), it simply redirects to the map home.
    await expect(page).toHaveURL(/\/nurnet-plus\/$/, { timeout: 30_000 });
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(page.getByText(inMap(TOTAL_SITES)).first()).toBeVisible();
    await expect(page.getByText("Sito non trovato")).toBeHidden();

    // No crash or unhandled error, and no script executed
    expect(pageErrors).toEqual([]);
    expect(dialogShown).toBe(false);
  });
});
