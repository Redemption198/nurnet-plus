<script setup lang="ts">
// The key to the lines of sight (desktop; on mobile the rows in the drawer say it): a strip at the
// bottom right, the near side of a tilted map where framed sites rarely end up, kept clear by the
// camera (TheMap's OVERLAY_BOTTOM_DESKTOP). Only the levels the open nuraghe's lines have, and
// clicks go through it to the lines and markers
const { t } = useI18n();
const site = useCurrentSite();
const isHome = useIsHome();
const isDark = useIsDark();

// The visibility levels the open nuraghe's lines have, in their usual order
const shownLevels = computed(() => {
  const levels = new Set((site.value?.visible ?? []).map((entry) => visibilityLevel(entry.height)));
  return VISIBILITY_LEVELS.filter((_, i) => levels.has(i));
});

// What the legend shows. While the next nuraghe's lines load (its list is empty until then), it
// keeps the last levels, so going from one nuraghe to another changes the strip instead of
// blinking it out and back in
const legendLevels = shallowRef<(typeof VISIBILITY_LEVELS)[number][]>([]);
watchEffect(() => {
  if (isHome.value) legendLevels.value = [];
  else if (site.value?.visibleStatus !== "loading") legendLevels.value = shownLevels.value;
});
// The strip eases to the width of its items, so a level arriving or leaving resizes it smoothly
const legendItems = useTemplateRef("legendItems");
const { width: legendItemsWidth } = useElementSize(legendItems, undefined, { box: "border-box" });
</script>

<template>
  <Transition name="legend">
    <div
      v-if="legendLevels.length"
      class="legend pointer-events-none absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-1 hidden h-8 justify-end overflow-hidden rounded-full bg-panel/80 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl lg:flex"
      :style="legendItemsWidth ? { width: `${legendItemsWidth}px` } : undefined"
    >
      <div ref="legendItems" class="flex w-max shrink-0 px-3">
        <TransitionGroup
          tag="ul"
          name="legend-item"
          :aria-label="t('map.legend')"
          class="relative flex h-8 items-center gap-x-3"
        >
          <li
            v-for="level in legendLevels"
            :key="level.label"
            class="flex items-center gap-x-1.5 whitespace-nowrap"
          >
            <svg class="h-2 w-5 shrink-0" viewBox="0 0 20 8" aria-hidden="true">
              <line
                x1="2"
                y1="4"
                x2="18"
                y2="4"
                :stroke="levelColor(level, isDark)"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="level.dashed ? '4 3' : undefined"
              />
            </svg>
            {{ t(`visibilityLevels.${level.key}`) }}
          </li>
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* The legend strip, like Spotlight: it fades in with a little blur and scale, eases to the width
   of its items, and the items blur in, slide to their places and fade out on their own */
.legend {
  transition: width 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}

.legend-enter-active,
.legend-leave-active {
  transition:
    opacity 0.22s ease-out,
    filter 0.22s ease-out,
    scale 0.22s ease-out;
}

.legend-leave-active {
  transition-duration: 0.16s;
  transition-timing-function: ease-in;
}

.legend-enter-from,
.legend-leave-to {
  opacity: 0;
  filter: blur(4px);
  scale: 0.96;
}

.legend-item-move {
  transition: translate 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}

.legend-item-enter-active {
  transition:
    opacity 0.26s ease-out 0.08s,
    filter 0.26s ease-out 0.08s,
    scale 0.26s ease-out 0.08s;
}

.legend-item-leave-active {
  transition:
    opacity 0.14s ease-in,
    filter 0.14s ease-in;
}

.legend-item-enter-from,
.legend-item-leave-to {
  opacity: 0;
  filter: blur(3px);
  scale: 0.9;
}

/* Reduced motion: fades only, no resizing, sliding or blur */
@media (prefers-reduced-motion: reduce) {
  .legend,
  .legend-item-move {
    transition: none;
  }

  .legend-enter-from,
  .legend-leave-to,
  .legend-item-enter-from,
  .legend-item-leave-to {
    filter: none;
    scale: 1;
  }
}
</style>
