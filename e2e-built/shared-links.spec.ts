import { test, expect, type Page } from "@playwright/test";

// A shared link to a site, as the deployed site answers it

// Read by link previews, which run no script: the address has a page of its own (not 404.html)
// with the site's tags (prerendered by Nuxt: nuxt.config's siteRoutes, plugins/site-head.server.ts)
test.describe("Link previews", () => {
  test("A site's address has its own title, description and photo", async ({ request }) => {
    const response = await request.get("/nurnet-plus/poi/NUR3551/");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<meta property="og:title" content="Nuraghe Losa">');
    expect(html).toContain("Nuraghe complesso ad Abbasanta, Guilcer, sulla mappa di NurNet+.");
    expect(html).toContain(
      '<link rel="canonical" href="https://redemption198.github.io/nurnet-plus/poi/NUR3551/">',
    );
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toMatch(
      /<meta property="og:image" content="https:\/\/www\.nurnet\.net\/[^"]+\.jpg">/,
    );
    // The photo at full size, not the Mediateca's 300x300 thumbnail, and in place of the app's
    // own preview image, not beside it
    expect(html).not.toMatch(/og:image" content="[^"]*-\d+x\d+\.\w+"/);
    expect(html.match(/<meta property="og:image"/g)).toHaveLength(1);
    expect(html).toContain(
      '<link rel="alternate" hreflang="en" href="https://redemption198.github.io/nurnet-plus/en/poi/NUR3551/">',
    );
  });

  test("In English at /en/", async ({ request }) => {
    const html = await (await request.get("/nurnet-plus/en/poi/NUR13310/")).text();
    expect(html).toMatch(/<html\s+lang="en">/);
    expect(html).toContain("Sacred well in Paulilatino, Guilcer, on the NurNet+ map.");
  });

  test("A site without photos keeps the app's preview image", async ({ request }) => {
    const html = await (await request.get("/nurnet-plus/poi/NUR1000/")).text();
    expect(html).toContain(
      '<meta property="og:image" content="https://redemption198.github.io/nurnet-plus/og-image.jpg">',
    );
  });

  test("An address that names no site is still a 404", async ({ request }) => {
    expect((await request.get("/nurnet-plus/poi/NUR0/")).status()).toBe(404);
  });
});

async function expectSite(page: Page, path: string, name: string) {
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

test.describe("Opening a shared link", () => {
  test("A first visit opens the site", async ({ page }) => {
    await page.goto("/nurnet-plus/poi/NUR7302/");
    await expectSite(page, "/nurnet-plus/poi/NUR7302/", "Domus de janas di Mandras");
  });

  // The installed app's service worker answers navigations itself: it used to give every address
  // the home page, and the app replaced the site's URL with the map's
  test("A returning visitor, with the service worker in charge, gets the site", async ({
    context,
    page,
  }) => {
    await page.goto("/nurnet-plus/");
    await expect
      .poll(
        () =>
          page.evaluate(
            async () => (await navigator.serviceWorker.getRegistration())?.active?.state ?? null,
          ),
        { timeout: 90_000 },
      )
      .toBe("activated");

    const link = await context.newPage();
    await link.goto("/nurnet-plus/en/poi/NUR3551/");
    expect(await link.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await expectSite(link, "/nurnet-plus/en/poi/NUR3551/", "Nuraghe Losa");
  });

  test("A link that names no site opens the map with a notice", async ({ page }) => {
    await page.goto("/nurnet-plus/poi/NUR0/");
    // Exact: the toast's live region repeats its text for screen readers
    await expect(page.getByText("Sito non trovato", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/nurnet-plus\/$/);
  });
});
