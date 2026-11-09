// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Keyboard and mobile viewport", () => {
  test("Map compass keyboard rotation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("siti nella mappa").first()).toBeVisible();

    const compass = page.getByRole("button", { name: /Bussola/ });
    // The compass icon's CSS `rotate` reflects the map bearing (animated, so poll).
    const icon = compass.locator("svg");

    // 1. Focus the compass button and press ArrowLeft then ArrowRight
    await compass.focus();
    await expect(compass).toBeFocused();
    await expect(icon).toHaveCSS("rotate", "0deg");

    await page.keyboard.press("ArrowLeft");
    // Each arrow press rotates by 15 degrees.
    await expect(icon).toHaveCSS("rotate", "-15deg");

    await page.keyboard.press("ArrowRight");
    await expect(icon).toHaveCSS("rotate", "0deg");
    await page.keyboard.press("ArrowRight");
    await expect(icon).toHaveCSS("rotate", "15deg");

    // 2. Click the compass
    await compass.click();
    await expect(icon).toHaveCSS("rotate", "0deg");
  });
});
