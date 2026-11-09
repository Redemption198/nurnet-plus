// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Settings sheet", () => {
  test("Switch language to English and persist", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    // 1. Open settings and select 'English' in the Lingua radiogroup
    await page.getByRole("button", { name: "NurNet+: impostazioni e informazioni" }).click();
    await page.getByRole("radio", { name: "English" }).click();
    await expect(page.getByRole("radio", { name: "English" })).toBeChecked();
    // Note: the app switches to the /en/ URL prefix; the 'A caso' button is labelled 'Surprise me' (not 'Random').
    await expect(page).toHaveURL(/\/nurnet-plus\/en\/$/);
    // The settings dialog is modal and hides the page behind it from the accessibility tree: close it first
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("searchbox", { name: "Search for a site or a town" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Surprise me" })).toBeVisible();

    // 2. Open /poi/NUR5023/
    // (English routes live under /en/)
    await page.goto("/nurnet-plus/en/poi/NUR5023/");
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Description" })).toBeVisible();
    await expect(page.getByRole("region", { name: "The site" })).toBeVisible();

    // 3. Reload the page
    await page.goto("/nurnet-plus/en/");
    await page.getByRole("button", { name: "NurNet+: settings and information" }).click();
    await expect(page.getByRole("radio", { name: "English" })).toBeChecked();

    // 4. Switch back to 'Italiano'
    await page.getByRole("radio", { name: "Italiano" }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
    // The modal settings dialog is still open and hides the page behind it: close it first
    await page.getByRole("dialog").getByRole("button", { name: "Chiudi" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "NurNet+: impostazioni e informazioni" }),
    ).toBeVisible();
  });
});
