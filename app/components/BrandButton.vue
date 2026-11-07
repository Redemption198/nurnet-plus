<script setup lang="ts">
// Opens the (i) sheet.
// - compact (the floating button on phones): the logo's tile is the button itself, so it covers
//   as little of the map as possible, with an (i) badge so it reads as the guide, not a marker
// - otherwise (the top of the panel on desktop): the wordmark, then the (i)
// No `relative` of its own: the floating button is positioned by the page (absolute), and a
// `relative` here won over it in the CSS, putting the button in the page's flow, where it pushed
// the map 44px down. Absolute, it's also what places the (i) badge
defineProps<{ compact?: boolean }>();
const infoOpen = useInfoOpen();
</script>

<template>
  <button
    type="button"
    class="flex min-h-11 cursor-pointer items-center shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press"
    :class="
      compact
        ? // The tile's own corners (BrandMark), so the shadow follows its shape
          'size-11 justify-center rounded-[22.5%]'
        : 'gap-x-2 rounded-2xl bg-panel/80 py-1.5 pr-2.5 pl-3 backdrop-blur-2xl'
    "
    :aria-label="$t('app.brandButton')"
    :data-brand-pill="compact || undefined"
    @click="infoOpen = true"
  >
    <template v-if="compact">
      <BrandMark variant="symbol" />
      <span
        class="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-panel text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.25)]"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-info" class="size-3.5" />
      </span>
    </template>
    <template v-else>
      <!-- 22px: the smallest size at which the plus's five circles stay apart -->
      <BrandMark variant="wordmark" class="text-[1.375rem]" />
      <UIcon name="i-lucide-info" class="size-4 text-subtle" aria-hidden="true" />
    </template>
  </button>
</template>
