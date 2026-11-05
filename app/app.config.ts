export default defineAppConfig({
  ui: {
    colors: {
      // Nuxt UI's colour scales for anything not mapped to the palette in tailwind.css (where
      // primary is terracotta, text basalt, surfaces the well)
      primary: "orange",
      neutral: "stone",
    },
    // Buttons as the app's own: round pills, 44px tall so they're easy to hit outdoors
    button: {
      slots: {
        base: "min-h-11 rounded-full px-4 font-semibold",
      },
    },
  },
});
