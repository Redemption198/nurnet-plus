// The map itself, read and clicked through geowright (TheMap exposes it in dev builds)
import { test, expect } from "@playwright/test";
import { geowright } from "geowright";

test.describe("Map loading and filters", () => {
  test("Clicking a marker on the map opens its site", async ({ page }) => {
    // Casa Zapata opens on its network: the sites it sees, framed, their markers in focus
    await page.goto("/nurnet-plus/poi/NUR5023/");
    // What's drawn over a site the pointer is on (its marker bigger, its highlight dot and name)
    // lets clicks through to the marker: not something that hides it
    const map = geowright(page, {
      ignoreLayers: ["poi-hover", "visibility-highlight", "visibility-highlight-label"],
    });
    await map.waitForIdle();

    // Su Nuraxi, one of them: a real click at a pixel where its marker is drawn
    await map.feature({ layer: "pois", where: { content_id: "NUR4974" } }).click();
    await expect(page).toHaveURL(/\/nurnet-plus\/poi\/NUR4974\/$/);
    await expect(page.getByRole("heading", { name: "Su Nuraxi", level: 2 })).toBeVisible();
  });
});
