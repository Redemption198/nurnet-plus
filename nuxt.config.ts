import { defineNuxtConfig } from "nuxt";

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  css: ["@/assets/css/main.css"],

  modules: ["@nuxtjs/tailwindcss", "@vueuse/nuxt", "@kevinmarrec/nuxt-pwa"],

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
          src: "/pwa/manifest-icon-192.maskable.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/manifest-icon-192.maskable.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/pwa/manifest-icon-512.maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/manifest-icon-512.maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
  },
});
