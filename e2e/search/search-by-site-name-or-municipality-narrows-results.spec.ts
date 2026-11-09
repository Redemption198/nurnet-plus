// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { TOTAL_SITES } from "../data.ts";

test.describe("Search", () => {
  test("Search by site name or municipality narrows results", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    // 1. Type 'Barumini' in the searchbox 'Cerca un sito o un comune'
    await page.getByRole("searchbox", { name: "Cerca un sito o un comune" }).fill("Barumini");

    const results = page.getByRole("list", { name: /^\d+ siti trovati$/ });
    await expect(results).toBeVisible();
    const found = Number((await results.getAttribute("aria-label"))!.match(/\d+/)![0]);
    expect(found).toBeGreaterThan(0);
    expect(found).toBeLessThan(TOTAL_SITES);

    // The app virtualises the list and only renders a subset, so we assert on the rendered items
    const links = results.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toContainText("Barumini · Marmilla");
    }

    const casaZapata = page.getByRole("link", { name: "Casa Zapata e Nuraxi 'e Cresia" });
    await expect(casaZapata).toBeVisible();

    // 2. Click the result 'Casa Zapata e Nuraxi 'e Cresia'
    await casaZapata.click();

    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR5023\/$/);
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia" }),
    ).toBeVisible();
    await expect(page).toHaveTitle("Casa Zapata e Nuraxi 'e Cresia · NurNet+");
  });
});
