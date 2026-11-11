// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { geowright, expect as expectMap } from "geowright";

test.describe("URL and deep-link state", () => {
  test("Deep link to a site opens its sheet directly", async ({ page }) => {
    // 1. Open /nurnet-plus/poi/NUR5023/ in a fresh context
    await page.goto("/nurnet-plus/poi/NUR5023/");

    // The sheet for the site is shown
    await expect(
      page.getByRole("heading", { level: 2, name: "Casa Zapata e Nuraxi 'e Cresia" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("article", { name: "Casa Zapata e Nuraxi 'e Cresia" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Chiudi" })).toHaveAttribute(
      "href",
      "/nurnet-plus/",
    );
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    // On the map too: the site's pin
    await expectMap(geowright(page)).toHaveFeature({
      layer: "poi-selected",
      where: { content_id: "NUR5023" },
    });

    // Page title includes the site name
    await expect(page).toHaveTitle(/Casa Zapata e Nuraxi 'e Cresia/);
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR5023\/$/);
  });
});
