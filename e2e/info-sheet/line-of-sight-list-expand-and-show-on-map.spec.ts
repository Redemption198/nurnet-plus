// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Site info sheet", () => {
  test("Line-of-sight list: expand and show on map", async ({ page }) => {
    await page.goto("/nurnet-plus/poi/NUR5023/");

    // 1. On /poi/NUR5023/ click 'Mostra tutti (36)'
    await page.getByRole("button", { name: "Mostra tutti (36)" }).click();

    const visibility = page.getByRole("region", { name: "Visibili da qui · 36" });
    await expect(visibility.getByRole("listitem")).toHaveCount(36);
    await expect(visibility.getByText("Ben visibile").first()).toBeVisible();
    await expect(visibility.getByText("Visibile", { exact: true }).first()).toBeVisible();
    await expect(visibility.getByText("Poco visibile").first()).toBeVisible();

    // 2. Click 'Mostra sulla mappa'
    await visibility.getByRole("button", { name: "Mostra sulla mappa" }).click();
    await expect(page.getByRole("list", { name: "Legenda delle linee di vista" })).toBeVisible();

    // 3. Click the first visible site 'Su Nuraxi'
    await visibility.getByRole("link", { name: /^Su Nuraxi/ }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR4974\/$/);
    await expect(page).toHaveTitle("Su Nuraxi · NurNet+");
    await expect(page.getByRole("heading", { name: "Su Nuraxi", level: 2 })).toBeVisible();
  });
});
