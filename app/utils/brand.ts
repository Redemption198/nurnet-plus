// The brand colours for code that can't read CSS: the map's style, its markers and sight lines,
// the categories, the PWA manifest. The source is the @theme block of app/assets/css/tailwind.css;
// test/brand.test.ts fails when these drift from it
export const BRAND = {
  terracotta: "#c44f01",
  basalt: "#312528",
  sand: "#f1e9dc",
} as const;

// Their dark-mode values (the .dark block of tailwind.css)
export const BRAND_DARK = {
  basalt: "#f1e9dc",
  sand: "#1d1819",
} as const;

// The status bar while the splash shows (theme-color): on iOS the launch screen's gradient is
// behind it, halfway along its top edge from brand-light to terracotta, so the bar stays orange
// when the app takes over. test/brand.test.ts checks it against tailwind.css
export const SPLASH_STATUS_BAR = "#d65e09";

// "#312528" -> "49, 37, 40", for rgba() strings
export function rgbChannels(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].join(", ");
}
