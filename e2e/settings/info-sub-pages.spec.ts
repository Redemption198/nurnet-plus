// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Settings sheet", () => {
  test("Info sub-pages (Legenda, Come si usa, Privacy, Crediti)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "NurNet+: impostazioni e informazioni" }).click();
    const dialog = page.getByRole("dialog", { name: "NurNet+" });
    await expect(dialog).toBeVisible();

    // 1. Open settings and click each entry in turn
    // (the back control is the 'Indietro' button in the panel header)
    for (const entry of ["Legenda", "Come si usa", "Privacy", "Informazioni e crediti"]) {
      // The button's accessible name includes its subtitle ("Legenda Tipi di sito, ..."),
      // so match the title at the start instead of the whole name
      const entryButton = dialog.getByRole("button", { name: new RegExp(`^${entry}\\b`) });
      await entryButton.click();

      // Each opens a content panel with a heading and non-empty text
      await expect(dialog.getByRole("heading", { level: 3, name: entry })).toBeVisible();
      // (sub-headings in some panels, a plain list in others, e.g. "Come si usa")
      await expect(
        dialog.getByRole("heading", { level: 4 }).or(dialog.getByRole("listitem")).first(),
      ).toBeVisible();

      // A back control returns to the settings list
      await dialog.getByRole("button", { name: "Indietro" }).click();
      await expect(entryButton).toBeVisible();
      await expect(dialog.getByRole("heading", { level: 3, name: entry })).toBeHidden();
    }
  });
});
