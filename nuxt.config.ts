// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    "@nuxtjs/tailwindcss",
    "@vite-pwa/nuxt",
    "@vueuse/nuxt",
    "@vueuse/motion/nuxt",
  ],

  components: ["~/components", "~/components/icons"],

  pwa: {
    manifest: {
      name: "NurNet+",
      short_name: "NurNet+",
      description: "Discover Sardinia's numerous Nuraghe and more",
      theme_color: "#fe8702",
      icons: [
        {
          src: `${process.env.NUXT_APP_BASE_URL}pwa/manifest-icon-192.maskable.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${process.env.NUXT_APP_BASE_URL}pwa/manifest-icon-192.maskable.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: `${process.env.NUXT_APP_BASE_URL}pwa/manifest-icon-512.maskable.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${process.env.NUXT_APP_BASE_URL}pwa/manifest-icon-512.maskable.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
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
