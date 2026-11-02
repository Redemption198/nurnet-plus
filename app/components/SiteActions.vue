<script setup lang="ts">
// Getting to the open site: directions in the phone's maps app, and its coordinates to share
const site = useCurrentSite();

const coordinates = computed(() => {
  const [lon, lat] = site.value?.coordinates ?? [0, 0];
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
});

// Apple Maps on Apple devices (it opens the app), Google Maps elsewhere (app or web)
const directionsUrl = computed(() => {
  const [lon, lat] = site.value?.coordinates ?? [0, 0];
  const apple = import.meta.client && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return apple
    ? `https://maps.apple.com/?daddr=${lat},${lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
});

const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });
</script>

<template>
  <div v-if="site" class="flex flex-wrap items-center gap-2">
    <a
      :href="directionsUrl"
      target="_blank"
      rel="noopener"
      class="inline-flex min-h-11 items-center gap-x-2 rounded-full bg-terracotta px-5 font-semibold text-white shadow-[0_2px_6px_rgb(154_62_1/0.3)] transition hover:bg-terracotta-dark active:scale-[0.97]"
    >
      <UIcon name="i-lucide-navigation" class="size-4.5" aria-hidden="true" />
      Indicazioni
    </a>
    <button
      v-if="isSupported"
      type="button"
      class="inline-flex min-h-11 items-center gap-x-2 rounded-full px-4 text-sm font-semibold text-basalt tabular-nums transition hover:bg-well active:scale-[0.97]"
      :aria-label="`Copia le coordinate: ${coordinates}`"
      @click="copy(coordinates)"
    >
      <UIcon
        :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        class="size-4 text-muted"
        aria-hidden="true"
      />
      <span>{{ copied ? "Coordinate copiate" : coordinates }}</span>
    </button>
    <p v-else class="px-1 text-sm text-muted tabular-nums">{{ coordinates }}</p>
    <span class="sr-only" aria-live="polite">{{ copied ? "Coordinate copiate" : "" }}</span>
  </div>
</template>
