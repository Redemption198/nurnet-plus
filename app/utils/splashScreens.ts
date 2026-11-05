// iOS launch screens: one image per device size and orientation, which iOS picks by media query.
// app.vue links them; scripts/pwa-assets draws them (vp run generate-pwa-assets)

// Device width and height in css px, and pixel ratio: every screen size of the iPhones and iPads
// that run iOS 15 or later, up to the iPhone 17 and iPhone Air (2025). Apple no longer publishes a
// table of them (removed from its Human Interface Guidelines in September 2026), so the list is
// kept by hand; it matched pwa-asset-generator 8.1.7's bundled specs when it replaced it. For a new
// device: its screen in pixels divided by its scale factor (e.g. 1320 × 2868 at 3x is
// 440 × 956), then `vp run generate-pwa-assets`. A screen with no image gets no launch screen,
// only the in-app splash
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

export interface SplashScreen {
  // In public/pwa, named by its size in pixels
  file: string;
  // css px of the screen in this orientation, and its pixel ratio
  width: number;
  height: number;
  ratio: number;
  media: string;
}

export const SPLASH_SCREENS: SplashScreen[] = SPLASH_DEVICES.flatMap(([width, height, ratio]) =>
  (["portrait", "landscape"] as const).map((orientation) => {
    const [w, h] = orientation === "portrait" ? [width, height] : [height, width];
    return {
      file: `apple-splash-${w * ratio}-${h * ratio}.png`,
      width: w,
      height: h,
      ratio,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`,
    };
  }),
);
