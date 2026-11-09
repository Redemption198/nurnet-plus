// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Settings sheet", () => {
  test("Switch theme light/dark and persist", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const openSettings = async () => {
      await page.getByRole("button", { name: "NurNet+: impostazioni e informazioni" }).click();
      await expect(page.getByRole("dialog", { name: "NurNet+" })).toBeVisible();
    };

    // 1. Open settings; verify 'Automatico' radio is checked by default
    await openSettings();
    await expect(page.getByRole("radio", { name: "Automatico" })).toBeChecked();

    // 2. Select 'Scuro'
    // (the theme is applied as a class on <html> and stored in localStorage 'nuxt-color-mode')
    await page.getByRole("radio", { name: "Scuro" }).click();
    await expect(page.getByRole("radio", { name: "Scuro" })).toBeChecked();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // 3. Select 'Chiaro', then reload the page
    await page.getByRole("radio", { name: "Chiaro" }).click();
    await expect(page.locator("html")).toHaveClass(/light/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/light/);
    await openSettings();
    await expect(page.getByRole("radio", { name: "Chiaro" })).toBeChecked();
  });
});
