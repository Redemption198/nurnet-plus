<script setup lang="ts">
// The compass's needle (TheMap): north in terracotta, pointing where north is on the map rotated
// by `bearing` (degrees clockwise from north)
defineProps<{ bearing: number }>();
</script>

<template>
  <svg class="size-6" viewBox="0 0 24 24" aria-hidden="true" :style="{ rotate: `${-bearing}deg` }">
    <path d="M12 2.5 15.5 12h-7z" :fill="BRAND.terracotta" />
    <path d="M12 21.5 8.5 12h7z" class="fill-subtle" />
  </svg>
</template>
