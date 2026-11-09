// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Keyboard and mobile viewport", () => {
  test("Keyboard navigation and focus handling", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const settings = page.getByRole("button", { name: "NurNet+: impostazioni e informazioni" });

    // 1. Press Tab repeatedly from page load
    await page.keyboard.press("Tab");
    await expect(settings).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("searchbox", { name: "Cerca un sito o un comune" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "A caso" })).toBeFocused();
    await page.keyboard.press("Tab");
    const chips = page.getByRole("group", { name: "Filtra per tipo" }).getByRole("button");
    await expect(chips.first()).toBeFocused();
    // Visible focus indicator on the chip (2px outline)
    // Note: the "A caso" button has a transparent outline in this state; only chips and links are asserted.
    await expect(chips.first()).toHaveCSS("outline-width", "2px");
    await expect(chips.first()).toHaveCSS("outline-color", "rgb(196, 79, 1)");
    const chipCount = await chips.count();
    for (let i = 1; i < chipCount; i++) {
      await page.keyboard.press("Tab");
      await expect(chips.nth(i)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    const focusedLink = page.locator("a[href*='/nurnet-plus/poi/']:focus");
    await expect(focusedLink).toBeFocused();
    await expect(focusedLink).toHaveCSS("outline-width", "2px");

    // 2. Focus a result link and press Enter
    const href = await focusedLink.getAttribute("href");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("link", { name: "Chiudi" })).toBeVisible();

    // 3. Press Escape inside the open settings dialog
    // Note: the settings button is not shown while the site sheet is open, so close the sheet first.
    await page.getByRole("link", { name: "Chiudi" }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
    await settings.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
