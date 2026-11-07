<script setup lang="ts">
import { en, it } from "@nuxt/ui/locale";

const config = useRuntimeConfig();

const { locale, locales, localeProperties } = useI18n();

// Nuxt UI's own words (a toast's close button, a modal's) in the UI's language
const UI_LOCALES = { it, en };
const uiLocale = computed(() => UI_LOCALES[locale.value as AppLocale]);

// Each page names its twin in the other language (hreflang, as the sitemap does) and its own
// locale (og:locale). Not i18n's useLocaleHead: its canonical, which would replace Nuxt SEO's,
// drops the root's trailing slash. <html lang> and the canonical URL come from Nuxt SEO
const switchLocalePath = useSwitchLocalePath();
const siteUrl = useSiteConfig().url;
// The paths come with their slash ("/", "/en/": i18n.trailingSlash)
const absoluteUrl = (path: string) => siteUrl + config.app.baseURL.replace(/\/$/, "") + path;
const hreflangLinks = computed(() => [
  ...locales.value.map(({ code, language }) => ({
    rel: "alternate" as const,
    hreflang: language,
    href: absoluteUrl(switchLocalePath(code)),
  })),
  { rel: "alternate" as const, hreflang: "x-default", href: absoluteUrl(switchLocalePath("it")) },
]);
useSeoMeta({ ogLocale: () => localeProperties.value.language?.replace("-", "_") });

const asset = (file: string) => `${config.app.baseURL}pwa/${file}`;

// iOS launch screens (utils/splashScreens.ts), one per device size and orientation
const splashLinks = SPLASH_SCREENS.map(({ file, media }) => ({
  rel: "apple-touch-startup-image" as const,
  href: asset(file),
  media,
}));

// The browser and status bars take the map's sand colour, light or dark. Following the system,
// a pair by media query: right from the first paint of the prerendered page. With the visitor's
// own choice (info sheet), that one. While the splash is up, its orange (prerendered with it)
const colorMode = useColorMode();
const splashVisible = useSplashVisible();
const themeColor = computed(() =>
  splashVisible.value
    ? [{ name: "theme-color", content: SPLASH_STATUS_BAR }]
    : colorMode.preference === "system"
      ? [
          { name: "theme-color", content: BRAND.sand, media: "(prefers-color-scheme: light)" },
          { name: "theme-color", content: BRAND_DARK.sand, media: "(prefers-color-scheme: dark)" },
        ]
      : [
          {
            name: "theme-color",
            content: colorMode.value === "dark" ? BRAND_DARK.sand : BRAND.sand,
          },
        ],
);

// "È disponibile una nuova versione": a toast to switch to it (PWA service worker)
useAppUpdates();

// Title, description, canonical and Open Graph come from `site` in nuxt.config (Nuxt SEO)
useHead({
  meta: () => [
    ...themeColor.value,
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "NurNet+" },
  ],
  link: () => [
    // The logo on its tile (public/favicon.svg), sharp at any size; the PNG, rendered from it, for
    // browsers without SVG favicons
    { rel: "icon", type: "image/svg+xml", href: `${config.app.baseURL}favicon.svg` },
    { rel: "icon", type: "image/png", sizes: "196x196", href: asset("favicon-196.png") },
    { rel: "apple-touch-icon", href: asset("apple-icon-180.png") },
    ...splashLinks,
    ...hreflangLinks.value,
  ],
  script: [
    {
      // An app on the iPhone or iPad home screen starts below the status bar, but its launch
      // screen covers the whole screen. --status-bar: the bar's height, measured before the first
      // paint, so the splash reaches up behind it and its logo sits where the launch screen's
      // does (AppSplash). iOS only (navigator.standalone), where the screen size is fixed in
      // portrait; elsewhere it stays unset
      innerHTML:
        "if(navigator.standalone){var s=screen,l=innerWidth>innerHeight,h=l?Math.min(s.width,s.height):Math.max(s.width,s.height);document.documentElement.style.setProperty('--status-bar',Math.max(0,Math.min(80,h-innerHeight))+'px')}",
    },
  ],
});
</script>

<template>
  <!-- Toasts at the top (app.config toaster): the drawer owns the bottom of the screen -->
  <UApp :toaster="{ position: 'top-right' }" :locale="uiLocale">
    <NuxtPage />
  </UApp>
</template>
