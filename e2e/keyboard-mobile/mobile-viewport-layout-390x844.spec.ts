// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Keyboard and mobile viewport", () => {
  test("Mobile viewport layout (390x844)", async ({ page }) => {
    // 1. Set viewport to 390x844 and load /nurnet-plus/
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/nurnet-plus/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const search = page.getByRole("searchbox", { name: "Cerca un sito o un comune" });
    await expect(search).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuraghe" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Map" })).toBeVisible();
    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noHorizontalScroll).toBe(true);

    // 2. Open a site via search result
    await search.fill("Mal di Ventre");
    await page.getByRole("link", { name: /Nuraghe Isola di Mal di Ventre/ }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR10096\/$/);
    const sheetHeading = page.getByRole("heading", {
      name: "Nuraghe Isola di Mal di Ventre",
      level: 2,
    });
    await expect(sheetHeading).toBeVisible();
    // The sheet must not cover the whole viewport: part of the map stays visible.
    // (the article is the drawer's full scrollable content, so measure the drawer's visible top edge:
    // it rests at a detent well below the top of the viewport; the slide animation may still run)
    const drawerScroll = page.locator("[data-drawer-scroll]");
    await expect
      .poll(async () => (await drawerScroll.boundingBox())?.y ?? 0, { timeout: 10_000 })
      .toBeGreaterThan(100);
    const sheetBox = await drawerScroll.boundingBox();
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.width).toBeLessThanOrEqual(390);
    await expect(page.getByRole("region", { name: "Map" })).toBeVisible();
    // Closing with 'Chiudi'
    await page.getByRole("link", { name: "Chiudi" }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
    await expect(sheetHeading).toHaveCount(0);

    // 3. Open settings
    await page.getByRole("button", { name: "NurNet+: impostazioni e informazioni" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390 + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844 + 1);
  });
});
