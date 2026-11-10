// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";
import { TOTAL_SITES, inMap } from "../data.ts";

test.describe("Map loading and filters", () => {
  test("Map loads with site markers and count", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    // 1. Navigate to /nurnet-plus/ and wait for the 'Caricamento dei siti' status to disappear
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Caricamento dei siti" })).toBeHidden({
      timeout: 30_000,
    });
    await expect(page).toHaveTitle("NurNet+");
    await expect(page.getByRole("region", { name: "Map" })).toBeVisible();
    await expect(page.getByText(inMap(TOTAL_SITES), { exact: true })).toBeVisible();
    const list = page.getByRole("list", { name: inMap(TOTAL_SITES) });
    await expect(list.getByRole("link").first()).toHaveAttribute(
      "href",
      /\/nurnet-plus\/poi\/[^/]+\/$/,
    );
    expect(errors).toEqual([]);

    // 2. Verify the map controls
    for (const name of [
      "Ingrandisci",
      "Riduci",
      "Vista 3D con il rilievo",
      /^Bussola/,
      "Mostra la mia posizione",
    ]) {
      const btn = page.getByRole("button", { name });
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    }
  });
});
