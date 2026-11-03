// https://nuxt.com/docs/api/configuration/nuxt-config
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

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
  modules: ["@vite-pwa/nuxt", "@vueuse/nuxt", "@nuxt/ui", "@nuxt/a11y"],

  // Development only: axe-core accessibility checks, logged to the console and DevTools
  a11y: {
    logIssues: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: "it" },
    },
  },

  // The app only has a light design: don't follow the system's dark mode
  ui: {
    colorMode: false,
  },

  // Bundle the icons the app uses (from the locally installed sets) instead of fetching
  // them from the Iconify API at runtime: faster, and they work offline in the PWA
  // Self-hosted at build time (no requests to Google at runtime)
  fonts: {
    families: [{ name: "Fraunces", provider: "google", weights: [600, 700] }],
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
        "La mappa dei siti della Sardegna nuragica: nuraghi, domus de janas, tombe dei giganti e altri.",
      lang: "it",
      display: "standalone",
      // The map's sand colour, as the theme-color meta in app.vue
      theme_color: "#f1e9dc",
      background_color: "#f1e9dc",
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
      additionalManifestEntries: [
        dataFileEntry("nurnet-index.json"),
        dataFileEntry("nurnet-details.json"),
        dataFileEntry("nurnet-visibility.json"),
      ],
    },
  },

  // Old links to the POI page without an id
  routeRules: {
    "/poi": { redirect: baseURL },
  },

  compatibilityDate: "2025-10-20",
});
