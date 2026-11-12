// https://nuxt.com/docs/api/configuration/nuxt-config
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BRAND } from "./app/utils/brand.ts";

const baseURL = process.env.NUXT_APP_BASE_URL ?? "/";

// Every site's address, in each language, prerendered with its own title, description and photo
// (plugins/site-head.server.ts): link previews read the HTML at the address and run no script. Without them
// GitHub Pages answered a shared link with 404.html and the home page's generic tags
// The ids as the index stores them: the differences between them, after a prefix (parseIndex)
const { idPrefix, ids } = JSON.parse(
  readFileSync(new URL("./public/nurnet-index.json", import.meta.url), "utf8"),
) as { idPrefix: string; ids: number[] };
let lastId = 0;
const siteRoutes = ids.flatMap((difference) => {
  const id = `${idPrefix}${(lastId += difference)}`;
  return [`/poi/${id}/`, `/en/poi/${id}/`];
});

// Offline cache entry for a data file, versioned by its content: a data refresh gets a new
// revision, so installed apps download it (revision null would mean "never changes")
function dataFileEntry(file: string) {
  const revision = createHash("md5")
    .update(readFileSync(new URL(`./public/${file}`, import.meta.url)))
    .digest("hex");
  return { url: file, revision };
}

export default defineNuxtConfig({
  // Nuxt 5's defaults ahead of time: case-sensitive routes, typed pages, no Options API, Vite's
  // environment API, no autoprefixer/cssnano (Tailwind's Lightning CSS prefixes and minifies)
  future: {
    compatibilityVersion: 5,
  },

  modules: [
    "@vite-pwa/nuxt",
    "@vueuse/nuxt",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@nuxt/a11y",
    "@nuxtjs/seo",
  ],

  // The UI in Italian (the root) and English (/en/), each prerendered and indexed, linked to the
  // other with hreflang (Nuxt SEO). No redirect by the browser's language, which search engines
  // advise against: plugins/locale.client.ts offers the other language, and applies the one the
  // visitor chose, kept in localStorage rather than in i18n's cookie
  i18n: {
    locales: [
      { code: "it", language: "it-IT", name: "Italiano", file: "it.json" },
      { code: "en", language: "en", name: "English", file: "en.json" },
    ],
    defaultLocale: "it",
    strategy: "prefix_except_default",
    detectBrowserLanguage: false,
    // As `site`: links to /en/, the folder GitHub Pages serves, not to /en, which it redirects
    trailingSlash: true,
  },
  experimental: {
    // Nitro's auto-imports, which Nuxt 5 turns off: @nuxtjs/i18n 10.6's server code still takes
    // useRuntimeConfig from #imports (its rewrite to an explicit import misses the call in
    // runtime/shared/utils.js), and the build fails without them
    nitroAutoImports: true,
    // No _payload.json beside each page (Nuxt 5's 'client' still writes them, for navigating in
    // the app): their state is empty, the app loads its data itself, so with a page for every
    // site they were 15,000 files of 69 bytes, and a request for one each time a site opened
    payloadExtraction: false,
  },

  // Development only: axe-core accessibility checks, logged to the console and DevTools
  a11y: {
    logIssues: true,
  },

  // Nuxt SEO reads this for the title template, canonical URLs, Open Graph, <html lang> and the
  // sitemap. The app lives under app.baseURL on GitHub Pages: the url stays the bare origin
  site: {
    url: "https://redemption198.github.io",
    name: "NurNet+",
    description:
      "Esplora i siti della Sardegna nuragica: nuraghi, domus de janas, tombe dei giganti e altri, dai dati del progetto NurNet.",
    defaultLocale: "it-IT",
    // Page titles read "Nuraghe Losa · NurNet+"
    separator: "·",
    // GitHub Pages redirects /nurnet-plus to /nurnet-plus/: the canonical URL is the one with
    // the slash, not a redirect
    trailingSlash: true,
  },

  // An app, not a catalogue: only the map is indexed, never the single sites (see routeRules)
  robots: {
    // Crawlers only read /robots.txt at the host root, which a GitHub Pages project site doesn't
    // own: the robots meta tag on each page does the job
    robotsTxt: false,
  },
  seo: {
    // No title made from the URL: until a site loads, its tab reads "NurNet+", not its id
    fallbackTitle: false,
    // Site ids are upper case (/poi/NUR3551): a lowercased canonical or og:url would be a link
    // that doesn't open the site
    canonicalLowercase: false,
  },
  // A static site: the sitemap is written at build time, with no runtime code
  sitemap: {
    zeroRuntime: true,
  },
  // No OG image renderer: link previews use the static public/og-image.jpg (vp run og-image)
  ogImage: false,
  // The map has no text worth an llms.txt or a Markdown twin
  aiReady: false,
  // The PWA's service worker already precaches each release and swaps it in whole
  skewProtection: false,

  // Light or dark as the system is (the .dark palette in tailwind.css), no toggle of our own
  colorMode: {
    preference: "system",
    fallback: "light",
  },

  // Bundle the icons the app uses (from the locally installed sets) instead of fetching
  // them from the Iconify API at runtime: faster, and they work offline in the PWA
  // Self-hosted at build time (no requests to Google at runtime)
  fonts: {
    families: [{ name: "Fraunces", provider: "google", weights: [600] }],
  },

  icon: {
    // Icons named in .vue files are found by the scan; the ones named elsewhere are listed
    clientBundle: { scan: true, icons: ["lucide:refresh-cw", "lucide:languages"] },
  },

  css: ["~/assets/css/tailwind.css"],

  components: ["~/components", "~/components/icons"],

  pwa: {
    // A new version waits until the visitor takes it from the "nuova versione" toast
    // (useAppUpdates), rather than reloading the page under them mid-use
    registerType: "prompt",
    // Seconds between checks for a new version while the app stays open
    client: { periodicSyncForUpdates: 3600 },
    manifest: {
      name: "NurNet+",
      short_name: "NurNet+",
      description:
        "Esplora i siti della Sardegna nuragica: nuraghi, domus de janas, tombe dei giganti e altri.",
      lang: "it",
      display: "standalone",
      // The map's sand colour, as the theme-color meta in app.vue
      theme_color: BRAND.sand,
      // Android's launch screen: the logo on terracotta, as the iOS launch screens and the splash
      background_color: BRAND.terracotta,
      // scripts/pwa-assets: "any" is the rounded tile, as the favicon (desktop installs and other
      // places that show the icon as it is); "maskable" is full bleed, for launchers that shape it
      icons: [
        {
          src: `${baseURL}pwa/manifest-icon-192.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${baseURL}pwa/manifest-icon-192.maskable.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: `${baseURL}pwa/manifest-icon-512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${baseURL}pwa/manifest-icon-512.maskable.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      // @vite-pwa/nuxt replaces workbox's default patterns, so the app shell must be listed explicitly,
      // the UI's translations (fetched by @nuxtjs/i18n) with it
      globPatterns: ["**/*.{js,mjs,css,html,svg,ico,woff2}", "_i18n/**/messages.json"],
      // Never the ~15,000 site pages (siteRoutes, for link previews): precached, they would be the
      // whole download
      globIgnores: ["**/node_modules/**", "poi/*/**", "en/poi/*/**"],
      // Any other address opened (a site's link, /en/poi/NUR3551/) gets the bare app shell, which
      // opens what the URL names. The default, the prerendered home page, carried the home's own
      // render: the app booted as the home and replaced a shared site's URL with the map's.
      // The prerendered pages are precached under their own addresses and served as they are.
      // Named as the precache lists it, without .html (GitHub Pages serves /200 from 200.html)
      navigateFallback: `${baseURL}200`,
      // No sourcemaps for the service worker, as for the app. vite-plugin-pwa follows the top-level
      // build.sourcemap, which with Vite's environment API (Nuxt 5) is the server build's
      sourcemap: false,
      additionalManifestEntries: [
        dataFileEntry("nurnet-index.json"),
        dataFileEntry("nurnet-details.json"),
        dataFileEntry("nurnet-visibility.json"),
      ],
      // The translated descriptions aren't precached for everyone: a language's file is downloaded
      // the first time a visitor opens a site in it, then kept for offline use. Served from the
      // cache at once and refreshed behind, so a newer translation shows on the next visit
      runtimeCaching: [
        {
          urlPattern: /\/nurnet-descriptions\.[a-z-]+\.json$/,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "nurnet-descriptions" },
        },
        // The map as the visitor has seen it, for the field without a connection: about 100 MB
        // (550 of each kind of tile: ~61 KB a basemap tile, ~119 KB an elevation tile), dropped
        // after 30 days, and first if the device runs short of storage. The styles' address has
        // no version: served from the cache and refreshed behind
        {
          urlPattern: /^https:\/\/tiles\.openfreemap\.org\/styles\//,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "map-styles",
            cacheableResponse: { statuses: [200] },
            expiration: { maxEntries: 4 },
          },
        },
        // Tiles, sprites and fonts: their addresses carry a version, a new one comes with a release
        {
          urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
          handler: "CacheFirst",
          options: {
            cacheName: "map-tiles",
            cacheableResponse: { statuses: [200] },
            expiration: {
              maxEntries: 550,
              maxAgeSeconds: 30 * 24 * 3600,
              purgeOnQuotaError: true,
            },
          },
        },
        // Elevation (terrain, hillshading, contour lines): the tiles never change
        {
          urlPattern: /^https:\/\/elevation-tiles-prod\.s3\.amazonaws\.com\//,
          handler: "CacheFirst",
          options: {
            cacheName: "elevation-tiles",
            cacheableResponse: { statuses: [200] },
            expiration: {
              maxEntries: 550,
              maxAgeSeconds: 30 * 24 * 3600,
              purgeOnQuotaError: true,
            },
          },
        },
      ],
    },
  },

  app: {
    head: {
      // Both themes, so the browser draws its first, empty canvas dark on a dark system, before
      // the styles arrive (tailwind.css then sets the theme's own color-scheme on <html>)
      meta: [{ name: "color-scheme", content: "light dark" }],
      link: [
        // The index (list, search, map) starts downloading with the page, not once the app and its
        // data worker are up
        {
          rel: "preload",
          as: "fetch",
          href: `${baseURL}nurnet-index.json`,
          crossorigin: "anonymous",
        },
        // The basemap's style, tiles and fonts (OpenFreeMap): the connection is ready when the map
        // asks
        { rel: "preconnect", href: "https://tiles.openfreemap.org", crossorigin: "anonymous" },
      ],
    },
  },

  nitro: {
    prerender: {
      routes: siteRoutes,
      // The index's preload link (app.head above) is a file from public/, copied as it is: not a
      // page for the crawler to render, where it would 404 and fail the build
      ignore: [`${baseURL}nurnet-index.json`],
    },
  },

  routeRules: {
    // Old links to the POI page without an id
    "/poi": { redirect: baseURL },
    "/en/poi": { redirect: `${baseURL}en/` },
    // Italian has no prefix (i18n), but /it/ is a natural guess: the Italian root. Deeper /it/
    // paths (a site) go to their Italian address in middleware/italian-prefix.global.ts
    "/it": { redirect: baseURL },
    // A site's page is the map with that site open: shareable, but not a page of its own for
    // search engines. noindex, nofollow, and out of the sitemap
    "/poi/**": { robots: false },
    "/en/poi/**": { robots: false },
  },

  compatibilityDate: "2025-10-20",
});
