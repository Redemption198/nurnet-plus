<script setup>
const props = defineProps({
  photos: {
    type: Array,
    default: () => [],
  },
  name: {
    type: String,
    default: "",
  },
});

// Index of the photo to show, null when closed
const index = defineModel("index", { type: Number, default: null });

const track = ref();
const current = ref(0);

// The Mediateca's originals: the URLs we have are WordPress thumbnails ("-300x300")
const fullSize = (url) => url.replace(/-\d+x\d+(?=\.\w+$)/, "");

// While an arrow/key navigation animates, the scroll position is in between photos: ignore it
let navigatingUntil = 0;

function updateCurrent() {
  const el = track.value;
  if (el && Date.now() > navigatingUntil)
    current.value = Math.round(el.scrollLeft / el.clientWidth);
}

// From the photo we're heading to, not the scroll position: quick repeated presses add up
// instead of being measured from the middle of a running animation
function go(direction) {
  const el = track.value;
  if (!el) return;
  const target = Math.min(Math.max(current.value + direction, 0), props.photos.length - 1);
  current.value = target;
  navigatingUntil = Date.now() + 600;
  el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
}

// Open on the photo that was tapped
watch(index, async (value) => {
  if (value === null) return;
  current.value = value;
  await nextTick();
  if (track.value) track.value.scrollLeft = value * track.value.clientWidth;
});

function onKeydown(event) {
  if (event.key === "ArrowRight") go(1);
  else if (event.key === "ArrowLeft") go(-1);
}
</script>

<template>
  <UModal
    :open="index !== null"
    fullscreen
    :title="`Foto di ${name}`"
    description="Scorri per vedere le altre foto"
    :ui="{ overlay: 'bg-black', content: 'bg-black ring-0 shadow-none' }"
    @update:open="(open) => !open && (index = null)"
  >
    <template #content="{ close }">
      <div class="relative flex h-full flex-col" @keydown="onKeydown">
        <div class="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-x-3 p-4">
          <p class="truncate text-sm font-semibold text-white/90">
            {{ name }}
            <span class="ml-2 text-white/60">{{ current + 1 }} / {{ photos.length }}</span>
          </p>
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-95"
            aria-label="Chiudi"
            @click="close"
          >
            <IconCancel class="h-4.5 w-4.5" />
          </button>
        </div>

        <!-- One photo per screen; swipe or scroll to move. The thumbnail shows until the original loads -->
        <div
          ref="track"
          class="scrollbar-hidden flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain focus-visible:outline-none"
          tabindex="0"
          role="region"
          :aria-label="`Foto di ${name}, ${current + 1} di ${photos.length}`"
          @scroll.passive="updateCurrent"
        >
          <div
            v-for="(photo, i) in photos"
            :key="photo"
            class="flex h-full w-full shrink-0 snap-center items-center justify-center px-2 py-16"
          >
            <img
              :src="fullSize(photo)"
              :alt="`Foto ${i + 1} di ${photos.length}: ${name}`"
              loading="lazy"
              class="h-full w-full object-contain"
              :style="{
                backgroundImage: `url(${photo})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }"
            />
          </div>
        </div>

        <!-- Arrows for mouse and keyboard users; on touch screens swiping is enough -->
        <button
          v-if="current > 0"
          type="button"
          class="absolute top-1/2 left-4 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 pointer-fine:flex"
          aria-label="Foto precedente"
          @click="go(-1)"
        >
          <UIcon name="i-lucide-chevron-left" class="size-6" />
        </button>
        <button
          v-if="current < photos.length - 1"
          type="button"
          class="absolute top-1/2 right-4 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 pointer-fine:flex"
          aria-label="Foto successiva"
          @click="go(1)"
        >
          <UIcon name="i-lucide-chevron-right" class="size-6" />
        </button>
      </div>
    </template>
  </UModal>
</template>
