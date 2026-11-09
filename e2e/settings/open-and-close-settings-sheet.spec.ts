// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Settings sheet", () => {
  test("Open and close settings sheet", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    // 1. Click the 'NurNet+: impostazioni e informazioni' button
    const settingsButton = page.getByRole("button", {
      name: "NurNet+: impostazioni e informazioni",
    });
    await settingsButton.click();
    const dialog = page.getByRole("dialog", { name: "NurNet+" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Aspetto" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Lingua" })).toBeVisible();
    for (const name of ["Legenda", "Come si usa", "Privacy", "Informazioni e crediti"]) {
      await expect(dialog.getByRole("button", { name })).toBeVisible();
    }

    // 2. Click 'Chiudi'
    // Note: during exploration a pointer click on 'Chiudi' hung the browser tool, while
    // activating the (already focused) button with the keyboard closed the dialog, so the
    // test activates it via keyboard. The button is focused when the dialog opens.
    const close = dialog.getByRole("button", { name: "Chiudi" });
    await close.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(settingsButton).toBeFocused();
  });
});
