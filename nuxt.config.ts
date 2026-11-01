// https://nuxt.com/docs/api/configuration/nuxt-config
const baseURL = process.env.NUXT_APP_BASE_URL ?? "/";

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

  css: ["~/assets/css/tailwind.css"],

  components: ["~/components", "~/components/icons"],

  pwa: {
    manifest: {
      name: "NurNet+",
      short_name: "NurNet+",
      description: "Discover Sardinia's numerous Nuraghe and more",
      theme_color: "#fe8702",
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
      globPatterns: ["**/*.{js,css,html,svg,ico,woff2}", "icons-tileset.png"],
      additionalManifestEntries: [
        {
          url: "nurnet-data.json",
          revision: null,
        },
      ],
    },
  },

  compatibilityDate: "2025-10-20",
});
