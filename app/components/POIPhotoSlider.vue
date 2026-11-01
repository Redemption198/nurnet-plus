<script setup>
const currentPOI = useCurrentPOI();

const scrollingContainer = ref(null);

function handleHorizontalScroll(event) {
  scrollingContainer.value.scrollLeft += event.deltaY;
}
</script>

<template>
  <div
    ref="scrollingContainer"
    class="scrollbar-hidden flex snap-x gap-x-4 overflow-x-scroll px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
    tabindex="0"
    role="region"
    :aria-label="`Foto di ${currentPOI.values_.name}`"
    @wheel="handleHorizontalScroll($event)"
  >
    <div
      v-for="photo in currentPOI.values_.photos"
      :key="photo"
      class="shrink-0 snap-mandatory snap-center overflow-hidden rounded-2xl"
    >
      <img :src="photo" :alt="`${currentPOI.values_.name} Photo`" class="max-h-64" loading="lazy" />
    </div>
  </div>
</template>
