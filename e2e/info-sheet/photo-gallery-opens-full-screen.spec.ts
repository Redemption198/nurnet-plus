// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { photoCount } from "../data.ts";

test.describe("Site info sheet", () => {
  test("Photo gallery opens full screen", async ({ page }) => {
    const photos = photoCount("NUR5023");
    await page.goto("/nurnet-plus/poi/NUR5023/");

    // 1. On /poi/NUR5023/ click the first photo
    await page
      .getByRole("button", { name: `Apri la foto 1 di ${photos} a schermo intero` })
      .click();

    const viewer = page.getByRole("dialog", { name: "Foto di Casa Zapata e Nuraxi 'e Cresia" });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText(`Casa Zapata e Nuraxi 'e Cresia 1 / ${photos}`)).toBeVisible();

    // 2. Navigate to the next photo and then press Escape
    await viewer.getByRole("button", { name: "Foto successiva" }).click();
    await expect(viewer.getByText(`Casa Zapata e Nuraxi 'e Cresia 2 / ${photos}`)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();

    // The info sheet remains open
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR5023\/$/);
    await expect(
      page.getByRole("heading", { name: "Casa Zapata e Nuraxi 'e Cresia", level: 2 }),
    ).toBeVisible();
  });
});
