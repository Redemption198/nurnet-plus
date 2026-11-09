import { test, expect } from "@playwright/test";

test.describe("Error page", () => {
  test("A failure shows the NurNet+ error page with a way back to the map", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    // 1. Make the app fail, as showError() would: there is no address that fails on purpose
    await page.evaluate(() => {
      const app = (document.querySelector("#__nuxt") as unknown as { __vue_app__: any })
        .__vue_app__;
      app.config.globalProperties.$nuxt.payload.error = {
        statusCode: 500,
        message: "Simulated failure",
        fatal: true,
      };
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Qualcosa non ha funzionato" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Riprova" })).toBeVisible();

    // 2. Back to the map
    await page.getByRole("button", { name: "Torna alla mappa" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });
  });
});
