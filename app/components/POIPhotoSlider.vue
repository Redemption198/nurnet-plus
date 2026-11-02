<script setup>
const currentPOI = useCurrentPOI();

const scroller = ref();
const { arrivedState } = useScroll(scroller);

// Photo opened in the fullscreen viewer, null when closed
const viewerIndex = ref(null);

const photos = computed(() => currentPOI.value.values_?.photos ?? []);
const name = computed(() => currentPOI.value.values_?.name ?? "");

// About one screen of photos at a time, for the arrow buttons
function scrollPage(direction) {
  const el = scroller.value;
  el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
}
</script>

<template>
  <div class="group relative">
    <!-- Native horizontal scrolling (touch, trackpad, shift+wheel), snapping to each photo -->
    <div
      ref="scroller"
      class="scrollbar-hidden flex snap-x snap-mandatory scroll-px-4 gap-x-4 overflow-x-auto px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta"
      tabindex="0"
      role="region"
      :aria-label="`Foto di ${name}`"
    >
      <button
        v-for="(photo, i) in photos"
        :key="photo"
        type="button"
        class="shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        :aria-label="`Apri la foto ${i + 1} di ${photos.length} a schermo intero`"
        @click="viewerIndex = i"
      >
        <!-- Mediateca thumbnails are 300x300: a fixed square keeps the strip stable while they load -->
        <img
          :src="photo"
          alt=""
          width="256"
          height="256"
          class="size-64 max-w-none bg-slate-300/50 object-cover"
          loading="lazy"
        />
      </button>
    </div>

    <!-- Arrows for mouse users (shown on hover); touch screens just swipe -->
    <button
      v-if="!arrivedState.left"
      type="button"
      class="absolute top-1/2 left-6 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-slate-200/80 text-basalt opacity-0 shadow-md backdrop-blur-md transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 pointer-fine:flex"
      aria-label="Foto precedenti"
      @click="scrollPage(-1)"
    >
      <UIcon name="i-lucide-chevron-left" class="size-5" />
    </button>
    <button
      v-if="!arrivedState.right"
      type="button"
      class="absolute top-1/2 right-6 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-slate-200/80 text-basalt opacity-0 shadow-md backdrop-blur-md transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 pointer-fine:flex"
      aria-label="Foto successive"
      @click="scrollPage(1)"
    >
      <UIcon name="i-lucide-chevron-right" class="size-5" />
    </button>

    <PhotoViewer v-model:index="viewerIndex" :photos="photos" :name="name" />
  </div>
</template>
