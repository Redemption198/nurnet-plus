// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { TOTAL_SITES } from "../data.ts";

test.describe("URL and deep-link state", () => {
  test("Unknown site ID shows 'Sito non trovato'", async ({ page }) => {
    // 1. Open /nurnet-plus/poi/NUR999999/
    await page.goto("/nurnet-plus/poi/NUR999999/");

    // URL is redirected to /nurnet-plus/
    await expect(page).toHaveURL(/\/nurnet-plus\/$/, { timeout: 30_000 });

    // A toast 'Sito non trovato' appears (auto-dismisses after a few seconds)
    const toast = page.getByRole("listitem").filter({ hasText: "Sito non trovato" });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Il link non corrisponde a nessun sito della mappa.");

    // ...and can be dismissed with 'Chiudi'
    await toast.getByRole("button", { name: "Chiudi" }).click();
    await expect(toast).toBeHidden();

    // The map and all the sites load normally
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(page.getByText(`${TOTAL_SITES} siti nella mappa`).first()).toBeVisible();
  });
});
