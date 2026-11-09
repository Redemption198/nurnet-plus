// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Site info sheet", () => {
  test("Close the info sheet", async ({ page }) => {
    await page.goto("/nurnet-plus/poi/NUR5023/");
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia", level: 2 }),
    ).toBeVisible();

    // 1. On /poi/NUR5023/ click 'Chiudi'
    await page.getByRole("link", { name: "Chiudi" }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
    await expect(page.getByRole("searchbox", { name: "Cerca un sito o un comune" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia", level: 2 }),
    ).toBeHidden();

    // 2. Use browser Back
    await page.goBack();
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR5023\/$/);
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia", level: 2 }),
    ).toBeVisible();
  });
});
