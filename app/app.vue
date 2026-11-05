<script setup lang="ts">
const config = useRuntimeConfig();
const asset = (file: string) => `${config.app.baseURL}pwa/${file}`;

// iOS launch screens (pwa-asset-generator): device width and height in css px, pixel ratio.
// Each has a portrait and a landscape image, named by their size in pixels
const SPLASH_DEVICES: [width: number, height: number, ratio: number][] = [
  [1032, 1376, 2],
  [1024, 1366, 2],
  [834, 1210, 2],
  [820, 1180, 2],
  [744, 1133, 2],
  [834, 1194, 2],
  [768, 1024, 2],
  [834, 1112, 2],
  [810, 1080, 2],
  [440, 956, 3],
  [430, 932, 3],
  [420, 912, 3],
  [402, 874, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [360, 780, 3],
  [414, 896, 3],
  [414, 896, 2],
  [414, 736, 3],
  [375, 667, 2],
  [320, 568, 2],
];

const splashLinks = SPLASH_DEVICES.flatMap(([width, height, ratio]) =>
  (["portrait", "landscape"] as const).map((orientation) => {
    const [w, h] = orientation === "portrait" ? [width, height] : [height, width];
    return {
      rel: "apple-touch-startup-image" as const,
      href: asset(`apple-splash-${w * ratio}-${h * ratio}.jpg`),
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`,
    };
  }),
);

// Title, description, canonical and Open Graph come from `site` in nuxt.config (Nuxt SEO)
useHead({
  meta: [
    // The browser and status bars take the map's sand colour
    { name: "theme-color", content: BRAND.sand, media: "(prefers-color-scheme: light)" },
    { name: "theme-color", content: BRAND_DARK.sand, media: "(prefers-color-scheme: dark)" },
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
