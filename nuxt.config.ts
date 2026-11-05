// https://nuxt.com/docs/api/configuration/nuxt-config
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BRAND } from "./app/utils/brand.ts";

const baseURL = process.env.NUXT_APP_BASE_URL ?? "/";

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

  modules: ["@vite-pwa/nuxt", "@vueuse/nuxt", "@nuxt/ui", "@nuxt/a11y", "@nuxtjs/seo"],

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
    clientBundle: { scan: true },
  },

  css: ["~/assets/css/tailwind.css"],

  components: ["~/components", "~/components/icons"],

  pwa: {
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
      icons: [
        {
          src: `${baseURL}pwa/manifest-icon-192.maskable.png`,
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
          src: `${baseURL}pwa/manifest-icon-512.maskable.png`,
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
      // @vite-pwa/nuxt replaces workbox's default patterns, so the app shell must be listed explicitly
      globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
      // No sourcemaps for the service worker, as for the app. vite-plugin-pwa follows the top-level
      // build.sourcemap, which with Vite's environment API (Nuxt 5) is the server build's
      sourcemap: false,
      additionalManifestEntries: [
        dataFileEntry("nurnet-index.json"),
        dataFileEntry("nurnet-details.json"),
        dataFileEntry("nurnet-visibility.json"),
      ],
    },
  },

  routeRules: {
    // Old links to the POI page without an id
    "/poi": { redirect: baseURL },
    // A site's page is the map with that site open: shareable, but not a page of its own for
    // search engines. noindex, nofollow, and out of the sitemap
    "/poi/**": { robots: false },
  },

  compatibilityDate: "2025-10-20",
});
