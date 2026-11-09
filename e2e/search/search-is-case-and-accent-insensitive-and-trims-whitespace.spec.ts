// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { namesContaining } from "../data.ts";

test.describe("Search", () => {
  test("Search is case- and accent-insensitive and trims whitespace", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const searchbox = page.getByRole("searchbox", { name: "Cerca un sito o un comune" });

    // 1. 'Barumini' and '  BARUMINI  ' find the same sites
    const results = page.getByRole("list", { name: /^\d+ siti trovati$/ });
    await searchbox.fill("Barumini");
    await expect(results).toBeVisible();
    const label = (await results.getAttribute("aria-label"))!;
    await searchbox.fill("  BARUMINI  ");
    await expect(page.getByRole("list", { name: label, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Casa Zapata e Nuraxi 'e Cresia" })).toBeVisible();

    // 2. Replace the text with 'Allee couverte' (no accent)
    await searchbox.fill("Allee couverte");

    // Every site named Allée couverte, whatever its accent (the data also spells it 'Allèe')
    const names = namesContaining("Allee couverte");
    expect(names.length).toBeGreaterThan(1);
    const allee = page.getByRole("list", { name: `${names.length} siti trovati` });
    await expect(allee).toBeVisible();
    for (const name of names) {
      await expect(allee.getByRole("link", { name })).toBeVisible();
    }
  });
});
