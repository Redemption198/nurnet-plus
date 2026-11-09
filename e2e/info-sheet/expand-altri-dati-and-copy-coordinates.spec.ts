// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Site info sheet", () => {
  test("Expand 'Altri dati' and copy coordinates", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/nurnet-plus/poi/NUR5023/");

    // 1. Click 'Altri dati (3)' in the 'Il sito' region
    const site = page.getByRole("region", { name: "Il sito" });
    await expect(site.getByRole("term")).toHaveCount(4);
    await site.getByRole("button", { name: "Altri dati (3)" }).click();

    // Three additional rows are revealed (4 -> 7)
    await expect(site.getByRole("term")).toHaveCount(7);
    await expect(site.getByText("Dalla sorgente")).toBeVisible();
    await expect(site.getByText("Geologia")).toBeVisible();
    await expect(site.getByText("Uso del suolo")).toBeVisible();
    await expect(site.getByRole("button", { name: "Meno dati" })).toBeVisible();

    // 2. Click the coordinates button
    await page.getByRole("button", { name: "Copia le coordinate: 39.70283, 8.99986" }).click();

    // Plan expects a "toast/feedback": the real app shows no toast; the button label
    // switches inline to "Coordinate copiate" for ~2s (plus a live-region announcement).
    await expect(page.getByRole("button", { name: /Copia le coordinate/ })).toContainText(
      "Coordinate copiate",
    );

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("39.70283");
    expect(clipboardText).toContain("8.99986");
  });
});
