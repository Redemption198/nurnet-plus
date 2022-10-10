// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    "@nuxtjs/tailwindcss",
    "@vueuse/nuxt",
    "@kevinmarrec/nuxt-pwa",
    "@vueuse/motion/nuxt",
  ],

  components: ["~/components", "~/components/icons"],

  pwa: {
    meta: {
      name: "NurNet+",
      description: "Discover Sardinia's numerous Nuraghe and more",
      theme_color: "#fe8702",
      ogDescription: "Discover Sardinia's numerous Nuraghe and more",
      ogSiteName: "NurNet+",
      ogTitle: "NurNet+",
      mobileAppIOS: true,
    },
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
  },
});
