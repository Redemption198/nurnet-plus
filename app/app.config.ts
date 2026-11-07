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
      // White on terracotta in both modes, as the app's own buttons: Nuxt UI's dark-mode text
      // (near black) is 3.7:1 on it, under AA
      compoundVariants: [{ color: "primary", variant: "solid", class: "text-white" }],
    },
    // Notices ("Sito non trovato", a new version) on the app's panel material: translucent sand,
    // blurred, as see-through as the drawer at each size (TheDrawer), the soft basalt shadow of the
    // floating controls
    toast: {
      slots: {
        root: "rounded-2xl bg-panel/75 shadow-[0_4px_16px_rgb(49_37_40/0.14)] ring-0 backdrop-blur-2xl lg:bg-panel/92",
        title: "font-semibold text-basalt",
        description: "text-pretty text-muted",
        // The × as big a target as the rest (44px), its icon where it was
        close: "-m-3 size-11 justify-center p-0",
      },
    },
    // Where the map's own notices go (TheMap's offline message): on phones full width under the
    // brand button, clear of the drawer; on desktop at the top right, beside the map's buttons
    toaster: {
      variants: {
        position: {
          "top-right": {
            viewport:
              "right-4 left-4 w-auto sm:w-auto max-lg:top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] lg:right-18 lg:left-auto lg:w-96",
          },
        },
      },
    },
  },
});
