// spec: specs/nurnet-plus.md
// seed: e2e/seed.spec.ts

import { test, expect } from "@playwright/test";
import { TOTAL_SITES } from "../data.ts";

test.describe("Search", () => {
  test("Search with no results", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const searchbox = page.getByRole("searchbox", { name: "Cerca un sito o un comune" });

    // 1. Type 'zzzzqqqq' in the searchbox
    await searchbox.fill("zzzzqqqq");

    // Real behaviour: the empty state reads 'Nessun sito trovato' / «Nessun sito per «zzzzqqqq»»
    // rather than the plan's '0 siti'.
    await expect(page.getByText("Nessun sito trovato").first()).toBeVisible();
    await expect(page.getByText("Nessun sito per «zzzzqqqq»")).toBeVisible();
    await expect(page.getByText("Prova con il nome del comune o con meno lettere.")).toBeVisible();
    await expect(page.locator('a[href^="/nurnet-plus/poi/"]')).toHaveCount(0);
    expect(consoleErrors).toEqual([]);

    // 2. Clear the search using the clear button inside the searchbox
    // Note: the clear control that exists is the 'Cancella la ricerca' button of the empty state.
    await page.getByText("Cancella la ricerca").click();

    await expect(searchbox).toHaveValue("");
    await expect(page.getByText(`${TOTAL_SITES} siti nella mappa`).first()).toBeVisible();
  });
});
