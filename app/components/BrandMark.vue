<script setup lang="ts">
// The brand, one of two ways, never both side by side:
// - symbol: the logo on its terracotta tile, the app icon (the compact button on phones). As on
//   the home screen and the favicon (scripts/app-icons): the mark 60% of the tile (its SVG box is
//   69.7%, the circles fill 86% of it), corners 22.5% of the side
// - wordmark: "NurNet" with the logo as its plus, a nuraghe seen from above. The size comes from
//   the parent's font size; the mark is a little taller than the capitals so its five circles
//   stay apart at UI sizes, and centred on them like a plus sign. Screen readers, copy and find
//   in page get a real "+"
withDefaults(defineProps<{ variant?: "symbol" | "wordmark" }>(), { variant: "wordmark" });
</script>

<template>
  <span
    v-if="variant === 'symbol'"
    class="flex size-11 shrink-0 items-center justify-center rounded-[22.5%] bg-brand"
  >
    <IconNurnetPlus class="size-[69.7%] fill-white" aria-hidden="true" />
  </span>
  <span v-else class="font-display font-semibold tracking-tight whitespace-nowrap text-basalt"
    >NurNet<span class="sr-only">+</span
    ><IconNurnetPlus
      class="ml-[0.04em] inline-block size-[0.8em] fill-terracotta align-[-0.05em]"
      aria-hidden="true"
  /></span>
</template>
