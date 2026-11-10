<script setup lang="ts">
import type { MapLibreMap } from "maplibre-gl";

// The map's buttons: zoom, 3D, the compass and the visitor's position. On desktop a column at the
// top right; on phones fewer, riding on the drawer's top edge. The camera moves that frame things
// (zoom, 3D, flying to the visitor) are TheMap's: these ask for them
defineProps<{ is3D: boolean }>();
const emit = defineEmits<{
  zoom: [step: number];
  toggle3d: [];
  // The location button was pressed / the visitor's position came: [longitude, latitude]
  locate: [];
  located: [here: [number, number]];
}>();

const { t } = useI18n();
const map = useMap();
const isDesktop = useIsDesktop();

// The visitor's position, asked of the browser: a spinner meanwhile, a note if it fails
const locating = ref(false);
const locationError = ref<string | null>(null);
let locationErrorTimer: ReturnType<typeof setTimeout> | undefined;
// By GeolocationPositionError code
const LOCATION_ERRORS: Record<number, string> = {
  1: "map.locationDenied",
  2: "map.locationUnavailable",
  3: "map.locationTimeout",
};

function showMyLocation() {
  emit("locate");
  if (!map.value || !("geolocation" in navigator)) return;
  locating.value = true;
  locationError.value = null;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      locating.value = false;
      emit("located", [coords.longitude, coords.latitude]);
    },
    (error) => {
      locating.value = false;
      locationError.value = t(LOCATION_ERRORS[error.code] ?? "map.locationFailed");
      // A new error gets its full time on screen
      clearTimeout(locationErrorTimer);
      locationErrorTimer = setTimeout(() => (locationError.value = null), 6000);
    },
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
  );
}
onUnmounted(() => clearTimeout(locationErrorTimer));

// The compass: its needle follows the map's rotation (bearing, degrees clockwise from north).
// A click (or Enter) turns north back up; dragging it sideways, or the arrow keys on it, rotate
// the map, the one way to rotate that a mouse shows (the map's own are a right-click or Ctrl
// drag, or Shift with the arrow keys). Always there on desktop; on phones, where two fingers
// rotate, only once the map is rotated, as in the phones' own maps
const bearing = ref(0);
const isMac = useIsMac();
// The hidden ways to rotate, in the compass's tooltip, in the Mac's words there
const compassTip = computed(() => t(isMac.value ? "map.compassTipMac" : "map.compassTip"));
const showsCompass = computed(() => isDesktop.value || Math.abs(bearing.value) > 0.5);
let compassDrag: { x: number; bearing: number; moved: boolean } | null = null;
let compassDragged = false;
function onCompassDown(event: PointerEvent) {
  if (!map.value || event.button !== 0) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  compassDrag = { x: event.clientX, bearing: map.value.getBearing(), moved: false };
}
function onCompassMove(event: PointerEvent) {
  if (!compassDrag) return;
  const dx = event.clientX - compassDrag.x;
  if (Math.abs(dx) > 3) compassDrag.moved = true;
  // Like turning a dial: to the right, the map turns clockwise
  if (compassDrag.moved) map.value?.setBearing(compassDrag.bearing - dx * 0.6);
}
function onCompassUp() {
  compassDragged = compassDrag?.moved ?? false;
  compassDrag = null;
}
function onCompassClick() {
  // The click that ends a drag isn't a request for north
  if (compassDragged) return void (compassDragged = false);
  map.value?.easeTo({ bearing: 0, duration: 500 });
}
const rotateBy = (degrees: number) =>
  map.value?.easeTo({ bearing: map.value.getBearing() + degrees, duration: 250 });

// Safari on the Mac: a two-finger twist on the trackpad rotates the map, as in Apple's Maps.
// Safari reports it as gesture events (the rotation since the gesture began, in degrees) that
// MapLibre doesn't listen to; other browsers on the Mac don't report the twist at all. On
// iPhone and iPad, Safari sends them for two fingers on the screen too, which MapLibre already
// turns into rotation: those are left to it
type GestureEvent = UIEvent & { rotation: number };
function rotateWithTrackpadTwist(ml: MapLibreMap, container: HTMLElement) {
  let touches = 0;
  const countTouches = (event: TouchEvent) => (touches = event.touches.length);
  for (const type of ["touchstart", "touchend", "touchcancel"] as const)
    container.addEventListener(type, countTouches, { passive: true });

  let startBearing: number | null = null;
  container.addEventListener("gesturestart", (event) => {
    if (touches) return;
    // Otherwise Safari zooms the whole page
    event.preventDefault();
    startBearing = ml.getBearing();
  });
  container.addEventListener("gesturechange", (event) => {
    if (startBearing === null) return;
    event.preventDefault();
    // The map turns with the fingers: a clockwise twist turns it clockwise
    ml.setBearing(startBearing - (event as GestureEvent).rotation);
  });
  container.addEventListener("gestureend", () => (startBearing = null));
}

// Once TheMap has created the map: the needle follows it, and the trackpad twist turns it
watch(
  map,
  (ml, _, onCleanup) => {
    if (!ml) return;
    const onRotate = () => (bearing.value = ml.getBearing());
    ml.on("rotate", onRotate);
    rotateWithTrackpadTwist(ml, ml.getContainer());
    onCleanup(() => ml.off("rotate", onRotate));
  },
  { immediate: true },
);
</script>

<template>
  <!-- Desktop: a column at the top right. The space beside the buttons (as wide as the location
       error, when shown) must leave clicks and drags to the map, so only the items take them -->
  <div
    v-if="isDesktop"
    class="pointer-events-none absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-1 flex flex-col items-end gap-y-2 *:pointer-events-auto"
  >
    <div
      class="flex flex-col items-center overflow-hidden rounded-2xl bg-panel/80 shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
    >
      <MapControlsButton :aria-label="t('map.zoomIn')" @click.prevent="emit('zoom', 1)">
        <UIcon name="i-lucide-plus" class="size-6" aria-hidden="true" />
      </MapControlsButton>

      <MapControlsButton :aria-label="t('map.zoomOut')" @click.prevent="emit('zoom', -1)">
        <UIcon name="i-lucide-minus" class="size-6" aria-hidden="true" />
      </MapControlsButton>

      <MapControlsButton
        class="text-sm font-bold"
        :class="is3D ? 'bg-basalt text-panel! hover:bg-basalt!' : 'text-muted!'"
        :aria-label="t('map.view3d')"
        :aria-pressed="is3D"
        @click.prevent="emit('toggle3d')"
      >
        3D
      </MapControlsButton>

      <MapControlsButton
        v-if="showsCompass"
        class="touch-none"
        :aria-label="t('map.compassWithKeys')"
        :title="isDesktop ? compassTip : undefined"
        @pointerdown="onCompassDown"
        @pointermove="onCompassMove"
        @pointerup="onCompassUp"
        @pointercancel="onCompassUp"
        @click.prevent="onCompassClick"
        @keydown.left.prevent="rotateBy(15)"
        @keydown.right.prevent="rotateBy(-15)"
      >
        <CompassNeedle :bearing="bearing" />
      </MapControlsButton>

      <MapControlsButton
        :aria-label="t('map.myLocation')"
        :disabled="locating"
        @click.prevent="showMyLocation()"
      >
        <UIcon
          :name="locating ? 'i-lucide-loader-circle' : 'i-lucide-locate-fixed'"
          class="size-5.5"
          :class="{ 'animate-spin': locating }"
        />
      </MapControlsButton>
    </div>

    <p
      v-if="locationError"
      role="alert"
      class="max-w-56 rounded-2xl bg-panel/90 px-3 py-2 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
    >
      {{ locationError }}
    </p>
  </div>

  <!-- Mobile: fewer buttons, riding on the drawer's top edge (TheDrawer's #drawer-float), within
       the thumb's reach. Zoom is a pinch. 3D and the compass only show when there is something to
       undo (a tilted or rotated map), at the left: «2D» flattens the map; the location at the right. They follow the
       drawer down and to the middle, and fade away as it opens fully -->
  <Teleport v-else defer to="#drawer-float">
    <div class="absolute inset-x-4 bottom-3 flex items-end justify-between gap-x-3">
      <div class="flex gap-x-2">
        <Transition name="float-button">
          <button
            v-if="is3D"
            type="button"
            class="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press bg-panel/85 text-sm font-bold text-basalt backdrop-blur-2xl"
            :aria-label="t('map.view2d')"
            @click="emit('toggle3d')"
          >
            2D
          </button>
        </Transition>
        <Transition name="float-button">
          <button
            v-if="showsCompass"
            type="button"
            class="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press touch-none bg-panel/85 backdrop-blur-2xl"
            :aria-label="t('map.compass')"
            @pointerdown="onCompassDown"
            @pointermove="onCompassMove"
            @pointerup="onCompassUp"
            @pointercancel="onCompassUp"
            @click="onCompassClick"
          >
            <CompassNeedle :bearing="bearing" />
          </button>
        </Transition>
      </div>

      <div class="flex flex-col items-end gap-y-2">
        <p
          v-if="locationError"
          role="alert"
          class="pointer-events-auto max-w-56 rounded-2xl bg-panel/90 px-3 py-2 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
        >
          {{ locationError }}
        </p>
        <button
          type="button"
          class="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press bg-panel/85 text-subtle backdrop-blur-2xl"
          :aria-label="t('map.myLocation')"
          :disabled="locating"
          @click="showMyLocation()"
        >
          <UIcon
            :name="locating ? 'i-lucide-loader-circle' : 'i-lucide-locate-fixed'"
            class="size-5.5"
            :class="{ 'animate-spin': locating }"
          />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Mobile 3D and compass buttons: they pop in when the map is tilted or rotated, and out when
   it's back flat and north up */
.float-button-enter-active {
  transition:
    opacity 0.2s ease-out,
    scale 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.float-button-leave-active {
  transition:
    opacity 0.15s ease-in,
    scale 0.15s ease-in;
}

.float-button-enter-from,
.float-button-leave-to {
  opacity: 0;
  scale: 0.6;
}
</style>
