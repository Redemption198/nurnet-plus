import { test, expect } from "@playwright/test";

test.describe("URL and deep-link state", () => {
  test("Unknown page opens the map with a notice", async ({ page }) => {
    // 1. An address that isn't a page: a 404 for search engines, the map for the visitor
    const response = await page.goto("/nurnet-plus/sssss");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "404" })).toBeHidden();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/, { timeout: 30_000 });
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    const toast = page.getByRole("listitem").filter({ hasText: "Pagina non trovata" });
    await expect(toast).toBeVisible();

    // 2. Deeper addresses too
    await page.goto("/nurnet-plus/a/b/c/");
    await expect(page).toHaveURL(/\/nurnet-plus\/$/, { timeout: 30_000 });
    await expect(
      page.getByRole("listitem").filter({ hasText: "Pagina non trovata" }),
    ).toBeVisible();

    // 3. In English, back to the English map
    await page.goto("/nurnet-plus/en/sssss");
    await expect(page).toHaveURL(/\/nurnet-plus\/en\/$/, { timeout: 30_000 });
    await expect(page.getByRole("listitem").filter({ hasText: "Page not found" })).toBeVisible();
  });
});
