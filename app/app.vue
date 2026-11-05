<script setup lang="ts">
const config = useRuntimeConfig();
const asset = (file: string) => `${config.app.baseURL}pwa/${file}`;

// iOS launch screens (utils/splashScreens.ts), one per device size and orientation
const splashLinks = SPLASH_SCREENS.map(({ file, media }) => ({
  rel: "apple-touch-startup-image" as const,
  href: asset(file),
  media,
}));

// The browser and status bars take the map's sand colour, light or dark. Following the system,
// a pair by media query: right from the first paint of the prerendered page. With the visitor's
// own choice (info sheet), that one
const colorMode = useColorMode();
const themeColor = computed(() =>
  colorMode.preference === "system"
    ? [
        { name: "theme-color", content: BRAND.sand, media: "(prefers-color-scheme: light)" },
        { name: "theme-color", content: BRAND_DARK.sand, media: "(prefers-color-scheme: dark)" },
      ]
    : [{ name: "theme-color", content: colorMode.value === "dark" ? BRAND_DARK.sand : BRAND.sand }],
);

// Title, description, canonical and Open Graph come from `site` in nuxt.config (Nuxt SEO)
useHead({
  meta: () => [
    ...themeColor.value,
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "NurNet+" },
  ],
  link: [
    // The logo on its tile (public/favicon.svg), sharp at any size; the PNG, rendered from it, for
    // browsers without SVG favicons
    { rel: "icon", type: "image/svg+xml", href: `${config.app.baseURL}favicon.svg` },
    { rel: "icon", type: "image/png", sizes: "196x196", href: asset("favicon-196.png") },
    { rel: "apple-touch-icon", href: asset("apple-icon-180.png") },
    ...splashLinks,
  ],
});
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
