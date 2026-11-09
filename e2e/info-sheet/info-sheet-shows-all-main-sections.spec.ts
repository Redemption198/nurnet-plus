// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Site info sheet", () => {
  test("Info sheet shows all main sections", async ({ page }) => {
    // 1. Navigate to /nurnet-plus/poi/NUR5023/
    await page.goto("/nurnet-plus/poi/NUR5023/");

    await expect(page).toHaveTitle("Casa Zapata e Nuraxi 'e Cresia · NurNet+");
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia", level: 2 }),
    ).toBeVisible();
    await expect(page.getByText("Nuraghe complesso · Barumini, Marmilla")).toBeVisible();

    await expect(
      page.getByRole("region", { name: "Foto di Casa Zapata e Nuraxi 'e Cresia" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Descrizione" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Visibili da qui · 36" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Il sito" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Indicazioni" })).toHaveAttribute(
      "href",
      /^geo:39\.70283,8\.99986/,
    );
    await expect(page.getByRole("link", { name: "Foto nella Mediateca NurNet" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copia le coordinate: 39.70283, 8.99986" }),
    ).toBeVisible();
  });
});
