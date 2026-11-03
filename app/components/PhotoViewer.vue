<script setup lang="ts">
// Fullscreen photos, laid on the app's sand like prints. Opening, the tapped thumbnail grows
// from its place in the strip to the middle of the screen, where the original fades in over it
// once loaded; closing, the photo shrinks back into its thumbnail. Clicking around it closes it
const props = defineProps<{
  photos: string[];
  name: string;
  // The thumbnail of a photo in the strip, to grow from and shrink back into
  thumbnail: (index: number) => HTMLElement | null | undefined;
}>();

// Index of the photo to show, null when closed
const index = defineModel<number | null>("index", { default: null });

const track = ref<HTMLElement | null>(null);
const current = ref(0);
// Hidden while the photo flies in or out: the flying copy stands in for it
const settled = ref(false);
const backdrop = ref<HTMLElement | null>(null);
const chrome = ref<HTMLElement | null>(null);
// Originals that have loaded, which fade in over their thumbnails
const loaded = ref(new Set<number>());

// The Mediateca's originals: the URLs we have are WordPress thumbnails ("-300x300")
const fullSize = (url: string) => url.replace(/-\d+x\d+(?=\.\w+$)/, "");

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const OPEN = { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
// Closing heads home at once and settles into the strip
const CLOSE = { duration: 280, easing: "cubic-bezier(0.3, 0, 0.1, 1)" };

// While an arrow/key navigation animates, the scroll position is in between photos: ignore it
let navigatingUntil = 0;

function updateCurrent() {
  const el = track.value;
  if (el && Date.now() > navigatingUntil)
    current.value = Math.round(el.scrollLeft / el.clientWidth);
}

// From the photo we're heading to, not the scroll position: quick repeated presses add up
// instead of being measured from the middle of a running animation
function go(direction: number) {
  const el = track.value;
  if (!el) return;
  const target = Math.min(Math.max(current.value + direction, 0), props.photos.length - 1);
  current.value = target;
  navigatingUntil = Date.now() + 600;
  el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
}

// Where a photo is drawn in its slide: the original once loaded, else its square thumbnail
function photoRect(i: number) {
  const slide = track.value?.children[i] as HTMLElement | undefined;
  const shown = slide?.querySelector(loaded.value.has(i) ? "[data-original]" : "[data-thumbnail]");
  return shown?.getBoundingClientRect() ?? null;
}

// A copy of the photo flying between two places, above everything (the strip's rounded corners
// at one end, square at the other)
function fly(src: string, from: DOMRect, to: DOMRect, timing: typeof OPEN, toStrip: boolean) {
  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.alt = "";
  Object.assign(ghost.style, {
    position: "fixed",
    left: "0",
    top: "0",
    objectFit: "cover",
    zIndex: "100",
    pointerEvents: "none",
    boxShadow: PRINT_SHADOW,
  });
  document.body.append(ghost);
  const frame = (rect: DOMRect, radius: number) => ({
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: `translate(${rect.left}px, ${rect.top}px)`,
    borderRadius: `${radius}px`,
  });
  const animation = ghost.animate([frame(from, toStrip ? 4 : 16), frame(to, toStrip ? 16 : 4)], {
    ...timing,
    fill: "forwards",
  });
  return animation.finished.finally(() => ghost.remove());
}

// The photos' shadow on the sand, also on the flying copy
const PRINT_SHADOW = "0 10px 40px -8px rgb(49 37 40 / 0.35)";

const fade = (el: HTMLElement | null, from: number, to: number, timing: typeof OPEN) =>
  el?.animate({ opacity: [from, to] }, { ...timing, fill: "forwards" }).finished;

// Open on the photo that was tapped, growing out of its thumbnail
watch(index, async (value) => {
  if (value === null) return;
  current.value = value;
  settled.value = false;
  await nextTick();
  if (!track.value) return;
  track.value.scrollLeft = value * track.value.clientWidth;
  const from = props.thumbnail(value)?.getBoundingClientRect();
  const to = photoRect(value);
  const motion = !reduceMotion() && from && to;
  // The controls arrive while the photo is still settling
  setTimeout(() => fade(chrome.value, 0, 1, { ...OPEN, duration: 200 }), motion ? 250 : 0);
  await Promise.all([
    fade(backdrop.value, 0, 1, motion ? OPEN : { ...OPEN, duration: 150 }),
    motion &&
      fly(
        loaded.value.has(value) ? fullSize(props.photos[value]!) : props.photos[value]!,
        from,
        to,
        OPEN,
        false,
      ),
  ]);
  settled.value = true;
  // Once shown: a hidden element can't take focus
  await nextTick();
  track.value?.focus({ preventScroll: true });
});

// Shrink back into the thumbnail of the photo now shown (just fade if it scrolled out of sight)
let closing = false;
async function close() {
  if (closing || index.value === null) return;
  closing = true;
  const i = current.value;
  const from = photoRect(i);
  const thumb = props.thumbnail(i);
  const to = thumb?.getBoundingClientRect();
  const inSight =
    to && to.right > 0 && to.left < window.innerWidth && to.bottom > 0 && to.top < innerHeight;
  const motion = !reduceMotion() && from && to && inSight;
  settled.value = false;
  fade(chrome.value, 1, 0, { ...CLOSE, duration: 120 });
  if (thumb && motion) thumb.style.visibility = "hidden";
  await Promise.all([
    fade(backdrop.value, 1, 0, motion ? CLOSE : { ...CLOSE, duration: 150 }),
    motion &&
      fly(
        loaded.value.has(i) ? fullSize(props.photos[i]!) : props.photos[i]!,
        from,
        to,
        CLOSE,
        true,
      ),
  ]);
  if (thumb) thumb.style.visibility = "";
  index.value = null;
  closing = false;
}

// A click around the photo (not on it, nor on a control) closes the viewer
function onTrackClick(event: MouseEvent) {
  const rect = photoRect(current.value);
  const inside =
    rect &&
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inside) close();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowRight") go(1);
  else if (event.key === "ArrowLeft") go(-1);
}

// A new site, new photos
watch(
  () => props.photos,
  () => (loaded.value = new Set()),
);
</script>

<template>
  <UModal
    :open="index !== null"
    fullscreen
    :transition="false"
    :overlay="false"
    :title="`Foto di ${name}`"
    description="Scorri per vedere le altre foto"
    :ui="{ content: 'bg-transparent ring-0 shadow-none' }"
    :content="{ onOpenAutoFocus: (event: Event) => event.preventDefault() }"
    @update:open="(open: boolean) => !open && close()"
  >
    <template #content>
      <div class="relative flex h-full flex-col" @keydown="onKeydown">
        <!-- The app's sand, the page faintly showing through: the photo is laid on the table it
             was picked up from, not taken into a dark room -->
        <div
          ref="backdrop"
          class="absolute inset-0 bg-sand/95 opacity-0 backdrop-blur-xl"
          aria-hidden="true"
        />

        <!-- One photo per screen; swipe or scroll to move. The thumbnail shows until the original
             loads and fades in over it -->
        <div
          ref="track"
          class="scrollbar-hidden relative flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain focus-visible:outline-none"
          :class="{ invisible: !settled }"
          tabindex="0"
          role="region"
          :aria-label="`Foto di ${name}, ${current + 1} di ${photos.length}`"
          @scroll.passive="updateCurrent"
          @click="onTrackClick"
        >
          <div
            v-for="(photo, i) in photos"
            :key="photo"
            class="flex h-full w-full shrink-0 snap-center items-center justify-center px-2 py-16"
          >
            <!-- Thumbnail and original in the same place: the square thumbnail as big as fits,
                 the original at its own shape; one fades into the other -->
            <div class="@container-size grid h-full w-full place-items-center">
              <img
                data-thumbnail
                :src="photo"
                alt=""
                aria-hidden="true"
                class="size-[min(100cqw,100cqh)] rounded-[4px] object-cover shadow-[0_10px_40px_-8px_rgb(49_37_40/0.35)] transition-opacity duration-300 [grid-area:1/1]"
                :class="loaded.has(i) ? 'opacity-0' : 'opacity-100'"
              />
              <img
                data-original
                :src="fullSize(photo)"
                :alt="`Foto ${i + 1} di ${photos.length}: ${name}`"
                :loading="Math.abs(i - (index ?? current)) <= 1 ? 'eager' : 'lazy'"
                class="max-h-[100cqh] max-w-[100cqw] rounded-[4px] shadow-[0_10px_40px_-8px_rgb(49_37_40/0.35)] transition-opacity duration-300 [grid-area:1/1]"
                :class="loaded.has(i) ? 'opacity-100' : 'opacity-0'"
                @load="loaded = new Set(loaded).add(i)"
              />
            </div>
          </div>
        </div>

        <!-- Only the controls take clicks: around them, a click reaches the track (and closes) -->
        <div ref="chrome" class="pointer-events-none absolute inset-0 opacity-0">
          <div class="absolute inset-x-0 top-0 flex items-center justify-between gap-x-3 p-4">
            <p class="truncate font-display text-base font-semibold tracking-tight text-basalt">
              {{ name }}
              <span class="ml-2 font-sans text-sm font-normal text-muted tabular-nums"
                >{{ current + 1 }} / {{ photos.length }}</span
              >
            </p>
            <button
              type="button"
              class="pointer-events-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-panel/85 text-basalt shadow-md backdrop-blur-md transition hover:bg-white active:scale-95"
              aria-label="Chiudi"
              @click="close"
            >
              <IconCancel class="h-4.5 w-4.5" />
            </button>
          </div>

          <p class="absolute inset-x-0 bottom-0 p-4 text-center text-xs text-muted">
            Foto dalla Mediateca NurNet, dei rispettivi autori
          </p>

          <!-- Arrows for mouse and keyboard users; on touch screens swiping is enough -->
          <button
            v-if="current > 0"
            type="button"
            class="pointer-events-auto absolute top-1/2 left-4 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-panel/85 text-basalt shadow-md backdrop-blur-md transition hover:bg-white pointer-fine:flex"
            aria-label="Foto precedente"
            @click="go(-1)"
          >
            <UIcon name="i-lucide-chevron-left" class="size-6" />
          </button>
          <button
            v-if="current < photos.length - 1"
            type="button"
            class="pointer-events-auto absolute top-1/2 right-4 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-panel/85 text-basalt shadow-md backdrop-blur-md transition hover:bg-white pointer-fine:flex"
            aria-label="Foto successiva"
            @click="go(1)"
          >
            <UIcon name="i-lucide-chevron-right" class="size-6" />
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
