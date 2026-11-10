// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts
import { test, expect } from "@playwright/test";
import { TOTAL_SITES, inMap, sitesOfType } from "../data.ts";

test.describe("Map loading and filters", () => {
  test("Type filter chips narrow the sites", async ({ page }) => {
    await page.goto("/");
    const total = page.getByText(inMap(TOTAL_SITES), { exact: true });
    await expect(total).toBeVisible({ timeout: 30_000 });
    const nuraghe = page.getByRole("button", { name: "Nuraghe", exact: true });
    const count = async () =>
      Number(
        (
          await page
            .locator("p", { hasText: /siti nella mappa$/ })
            .first()
            .innerText()
        )
          // Grouped with a dot from four digits up (inMap)
          .match(/[\d.]+/)![0]
          .replaceAll(".", ""),
      );

    // 1. Click the 'Nuraghe' filter chip
    await nuraghe.click();
    await expect(nuraghe).toHaveAttribute("aria-pressed", "true");
    await expect(total).toBeHidden();
    // The list doesn't show a site's type, so the count is checked against the dataset
    await expect.poll(count).toBe(sitesOfType("Nuraghe"));

    // 2. Click the same chip again
    await nuraghe.click();
    await expect(nuraghe).toHaveAttribute("aria-pressed", "false");
    await expect(total).toBeVisible();

    // 3. One type at a time: 'Dolmen' replaces 'Menhir' (the plan expected the two to combine)
    const menhir = page.getByRole("button", { name: "Menhir", exact: true });
    const dolmen = page.getByRole("button", { name: "Dolmen", exact: true });
    await menhir.click();
    await expect.poll(count).toBe(sitesOfType("Menhir"));
    await dolmen.click();
    await expect(menhir).toHaveAttribute("aria-pressed", "false");
    await expect(dolmen).toHaveAttribute("aria-pressed", "true");
    await expect.poll(count).toBe(sitesOfType("Dolmen"));
  });
});
