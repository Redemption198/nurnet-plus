// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Map loading and filters", () => {
  test("Map controls: zoom, 3D toggle, compass", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    // 1. Click 'Ingrandisci' then 'Riduci'
    await page.getByRole("button", { name: "Ingrandisci" }).click();
    await page.getByRole("button", { name: "Riduci" }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);

    // 2. Click 'Vista 3D con il rilievo'
    // Note: the label does not change; the state is exposed via aria-pressed.
    const threeD = page.getByRole("button", { name: "Vista 3D con il rilievo" });
    await threeD.click();
    await expect(threeD).toHaveAttribute("aria-pressed", "true");

    // 3. Click the compass button
    await page.getByRole("button", { name: /^Bussola/ }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
    expect(errors).toEqual([]);
  });
});
