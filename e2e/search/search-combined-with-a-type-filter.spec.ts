// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { sitesOfType } from "../data.ts";

test.describe("Search", () => {
  test("Search combined with a type filter", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const searchbox = page.getByRole("searchbox", { name: "Cerca un sito o un comune" });
    const nuragheChip = page.getByRole("button", { name: "Nuraghe" });

    const results = page.getByRole("list", { name: /^\d+ siti trovati$/ });
    const found = async () => Number((await results.getAttribute("aria-label"))!.match(/\d+/)![0]);

    // 1. Type 'Barumini' then enable the 'Nuraghe' chip
    await searchbox.fill("Barumini");
    await expect(results).toBeVisible();
    const unfiltered = await found();
    await nuragheChip.click();

    await expect(nuragheChip).toHaveAttribute("aria-pressed", "true");
    await expect(results).toBeVisible();
    // The filter can only narrow the results (in Barumini they're all nuraghi, so it may not)
    expect(await found()).toBeLessThanOrEqual(unfiltered);
    await expect(
      results.getByRole("link", { name: "Casa Zapata e Nuraxi 'e Cresia" }),
    ).toBeVisible();
    // The list is virtualised, so we check the rendered subset.
    const links = results.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toContainText("Barumini · Marmilla");
    }

    // 2. Clear the search text
    await page.getByRole("button", { name: "Cancella la ricerca" }).click();

    await expect(searchbox).toHaveValue("");
    await expect(nuragheChip).toHaveAttribute("aria-pressed", "true");
    // All the nuraghi are shown
    await expect(
      page.getByRole("list", { name: `${sitesOfType("Nuraghe")} siti nella mappa` }),
    ).toBeVisible();
  });
});
