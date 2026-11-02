<script setup lang="ts">
const config = useRuntimeConfig();
const asset = (file: string) => `${config.app.baseURL}pwa/${file}`;

// iOS launch screens (pwa-asset-generator): device width and height in css px, pixel ratio.
// Each has a portrait and a landscape image, named by their size in pixels
const SPLASH_DEVICES: [width: number, height: number, ratio: number][] = [
  [1024, 1366, 2],
  [834, 1194, 2],
  [768, 1024, 2],
  [834, 1112, 2],
  [810, 1080, 2],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
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

useHead({
  title: "NurNet+",
  meta: [
    {
      name: "description",
      content:
        "La mappa dei siti della Sardegna nuragica: nuraghi, domus de janas, tombe dei giganti e altri, dai dati del progetto NurNet.",
    },
    // The browser and status bars take the map's sand colour
    { name: "theme-color", content: "#f1e9dc" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "NurNet+" },
  ],
  link: [
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
