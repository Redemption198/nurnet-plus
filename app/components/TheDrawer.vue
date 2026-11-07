<script setup lang="ts">
import gsap from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";

if (import.meta.client) gsap.registerPlugin(InertiaPlugin);

const drawer = ref<HTMLElement | null>(null);
// The map's buttons on mobile ride on the drawer's top edge (TheMap teleports them here): a layer
// moved with the drawer by the same tweens, and faded out as the drawer reaches the top
const float = ref<HTMLElement | null>(null);
const sheets = () => [drawer.value, float.value].filter((el): el is HTMLElement => !!el);
const drawerContent = ref<HTMLElement | null>(null);
provideDrawerScroller(drawerContent);

const drawerState = useDrawerState();
const headerHeight = useDrawerHeaderHeight();
const mapPadding = useMapPadding();
const isHome = useIsHome();

const lgAndGreater = useIsDesktop();
const reducedMotion = usePreferredReducedMotion();

// All the drawer's tweens live in this context, reverted when the drawer goes away
let animations: gsap.Context | undefined;
const animate = (tween: () => gsap.core.Tween) => animations?.add(tween);

// Resting positions (detents) on mobile, as the drawer's y offset
const POSITIONS: DrawerPosition[] = ["top", "middle", "bottom"];

function positionY(position: DrawerPosition) {
  const screenSection = window.innerHeight / 3;
  if (position === "top") return screenSection * 0.01;
  if (position === "middle") return screenSection;
  return screenSection * 2;
}

function closestPosition(y: number) {
  return POSITIONS.reduce((best, position) =>
    Math.abs(positionY(position) - y) < Math.abs(positionY(best) - y) ? position : best,
  );
}

// Tell the map which part of the screen the drawer covers, so it centers in what is left
function updateMapPadding(targetY: number) {
  const el = drawer.value;
  if (!el) return;

  if (lgAndGreater.value) {
    mapPadding.value = [0, 0, 0, el.offsetLeft + el.offsetWidth];
  } else {
    mapPadding.value = [0, 0, Math.max(0, window.innerHeight - (el.offsetTop + targetY)), 0];
  }
}

// Record where the drawer rests; the map is hidden behind it at the top, so the last
// useful padding is kept there
function settle(position: DrawerPosition) {
  drawerState.value.position = position;
  if (position !== "top") updateMapPadding(positionY(position));
}

// The buttons' opacity for a drawer offset: full from the middle down, gone at the top
function floatAlpha(y: number) {
  const top = positionY("top");
  return Math.min(1, Math.max(0, (y - top) / (positionY("middle") - top)));
}

// After the drawer's tween (which overwrites every tween of its targets), the buttons' fade
function fadeFloat(position: DrawerPosition) {
  const autoAlpha = position === "top" ? 0 : 1;
  if (reducedMotion.value === "reduce") gsap.set(float.value, { autoAlpha });
  else animate(() => gsap.to(float.value, { autoAlpha, duration: 0.3, overwrite: "auto" }));
}

function moveTo(position: DrawerPosition) {
  settle(position);
  if (reducedMotion.value === "reduce") {
    gsap.set(sheets(), { y: positionY(position) });
  } else {
    animate(() =>
      gsap.to(sheets(), {
        y: positionY(position),
        duration: 0.6,
        ease: "expo.out",
        overwrite: true,
      }),
    );
  }
  fadeFloat(position);
}

// Positions requested by the rest of the app (e.g. the map raises the drawer for a site)
watch(
  () => drawerState.value.request,
  (request) => {
    if (!request) return;
    drawerState.value.request = null;
    if (!lgAndGreater.value) moveTo(request);
  },
);

// iOS-style sheet gestures (mobile only):
// - the header (handle + title/search) always drags the sheet
// - on the content, scrolling takes priority: the sheet only moves when the content can't
//   scroll any further that way (pulling down at its top, or nothing to scroll)
// - the release velocity picks the detent, and the sheet carries on at that speed
interface Gesture {
  startX: number;
  startY: number;
  startDrawerY: number;
  target: Element;
  isMouse: boolean;
  mode: "sheet" | "scroll" | null;
  moved: boolean;
}
let gesture: Gesture | null = null;

// Resistance past the first/last detent, the same curve UIScrollView uses for its bounce
function rubberBand(overshoot: number) {
  const dimension = window.innerHeight;
  return (1 - 1 / ((overshoot * 0.55) / dimension + 1)) * dimension;
}

// Can a scroll container under the finger move its content for a drag of dy?
// (dy < 0: finger moves up, content scrolls down)
function canScroll(target: Element, dy: number) {
  for (let el = target.closest("[data-drawer-scroll]"); el;) {
    if (dy < 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) {
      return true;
    }
    el = el.parentElement?.closest("[data-drawer-scroll]") ?? null;
  }
  return false;
}

function gestureMode(target: Element, dy: number) {
  if (target.closest("[data-drawer-drag]")) return "sheet";
  return canScroll(target, dy) ? "scroll" : "sheet";
}

function startGesture(
  clientX: number,
  clientY: number,
  target: EventTarget | null,
  isMouse: boolean,
) {
  if (lgAndGreater.value || !(target instanceof Element)) return;
  gesture = {
    startX: clientX,
    startY: clientY,
    startDrawerY: 0,
    target,
    isMouse,
    mode: null,
    moved: false,
  };
}

function moveGesture(clientX: number, clientY: number, event: Event) {
  if (!gesture) return;
  const dy = clientY - gesture.startY;

  // Decide within the first few pixels: the browser starts scrolling natively soon after,
  // and from then on it can't be stopped. The small threshold avoids misreading jitter.
  if (!gesture.mode) {
    const dx = clientX - gesture.startX;
    if (Math.abs(dy) < 3 && Math.abs(dx) < 3) return;
    // Mostly sideways (e.g. the category chips): leave it to native horizontal scrolling
    gesture.mode = Math.abs(dx) > Math.abs(dy) ? "scroll" : gestureMode(gesture.target, dy);
    if (gesture.mode === "sheet") {
      // Catch the sheet mid-animation, like iOS
      gsap.killTweensOf(sheets());
      gesture.startDrawerY = Number(gsap.getProperty(drawer.value, "y"));
      InertiaPlugin.track(drawer.value!, "y");
    }
  }
  if (gesture.mode !== "sheet") return;

  if (event.cancelable) event.preventDefault();
  if (Math.abs(dy) > 6) gesture.moved = true;

  const min = positionY("top");
  const max = positionY("bottom");
  let y = gesture.startDrawerY + dy;
  if (y < min) y = min - rubberBand(min - y);
  else if (y > max) y = max + rubberBand(y - max);
  gsap.set(drawer.value, { y });
  gsap.set(float.value, { y, autoAlpha: floatAlpha(y) });
}

function endGesture() {
  if (gesture?.mode === "sheet" && drawer.value) {
    const velocity = InertiaPlugin.getVelocity(drawer.value, "y");
    InertiaPlugin.untrack(drawer.value, "y");

    // Like UIKit, project where the flick would come to rest and pick the nearest detent
    const y = Number(gsap.getProperty(drawer.value, "y"));
    const target = closestPosition(y + velocity * 0.2);
    settle(target);
    if (reducedMotion.value === "reduce") gsap.set(sheets(), { y: positionY(target) });
    else
      animate(() =>
        gsap.to(sheets(), {
          inertia: { y: { velocity, end: positionY(target) }, duration: { min: 0.35, max: 0.8 } },
          overwrite: true,
        }),
      );
    fadeFloat(target);

    // A mouse drag ends with a click on whatever is under the pointer: swallow it
    // (a moved touch never produces one, so only for the mouse)
    if (gesture.isMouse && gesture.moved) {
      drawer.value.addEventListener(
        "click",
        (event) => {
          // Both: stop the link's handlers and the browser following its href
          event.stopPropagation();
          event.preventDefault();
        },
        { capture: true, once: true },
      );
    }
  }
  gesture = null;
}

useEventListener(
  drawer,
  "touchstart",
  (e: TouchEvent) => startGesture(e.touches[0]!.clientX, e.touches[0]!.clientY, e.target, false),
  { passive: true },
);
// Not passive: preventDefault stops the content from scrolling while the sheet moves
useEventListener(
  drawer,
  "touchmove",
  (e: TouchEvent) => moveGesture(e.touches[0]!.clientX, e.touches[0]!.clientY, e),
  { passive: false },
);
useEventListener(drawer, ["touchend", "touchcancel"], endGesture);

useEventListener(drawer, "pointerdown", (e: PointerEvent) => {
  if (e.pointerType !== "mouse" || e.button !== 0 || lgAndGreater.value) return;
  // Stop links from being dragged natively (that cancels the gesture), but keep inputs focusable
  if (!(e.target instanceof Element && e.target.closest("input, textarea, select"))) {
    e.preventDefault();
    // preventDefault also stops the press from focusing what was pressed: focus it as the
    // browser would, so a dialog it opens (photo viewer) gives the focus back to it on closing
    if (e.target instanceof Element)
      e.target.closest<HTMLElement>("a[href], button, [tabindex]")?.focus({ preventScroll: true });
  }
  startGesture(e.clientX, e.clientY, e.target, true);
});
useEventListener(window, "pointermove", (e: PointerEvent) => {
  if (e.pointerType === "mouse") moveGesture(e.clientX, e.clientY, e);
});
useEventListener(window, ["pointerup", "pointercancel"], (e: PointerEvent) => {
  if (e.pointerType === "mouse") endGesture();
});

function setupForScreen(animateIn: boolean) {
  if (lgAndGreater.value) {
    // Desktop: a fixed side panel, no transform at all (it also breaks nested blur in Firefox)
    gesture = null;
    gsap.killTweensOf(sheets());
    gsap.set(sheets(), { clearProps: "transform,opacity,visibility" });
    updateMapPadding(0);
    return;
  }

  settle("bottom");
  gsap.set(float.value, { autoAlpha: 1 });
  if (animateIn && reducedMotion.value !== "reduce") {
    animate(() =>
      gsap.fromTo(
        sheets(),
        { y: window.innerHeight },
        { y: positionY("bottom"), duration: 0.8, ease: "expo.out" },
      ),
    );
  } else {
    gsap.set(sheets(), { y: positionY("bottom") });
  }
}

watch(lgAndGreater, async () => {
  // Wait for the drawer to switch layout before measuring it
  await nextTick();
  setupForScreen(false);
});

useEventListener(window, "resize", () => {
  if (lgAndGreater.value) {
    updateMapPadding(0);
    return;
  }
  // Detents are fractions of the screen height: re-place the drawer
  const position = drawerState.value.position;
  gsap.set(sheets(), { y: positionY(position) });
  gsap.set(float.value, { autoAlpha: position === "top" ? 0 : 1 });
  settle(position);
});

// The page itself never scrolls (iOS would scroll it under the sheet): only the drawer does
function lockPageScroll(locked: boolean) {
  Object.assign(document.body.style, {
    overflow: locked ? "hidden" : "",
    position: locked ? "fixed" : "",
    width: locked ? "100%" : "",
  });
}

onMounted(() => {
  animations = gsap.context(() => {}, drawer.value ?? undefined);
  lockPageScroll(true);
  setupForScreen(true);
});

onUnmounted(() => {
  animations?.revert();
  if (drawer.value) InertiaPlugin.untrack(drawer.value, "y");
  lockPageScroll(false);
});

onActivated(() => lockPageScroll(true));
onDeactivated(() => lockPageScroll(false));
</script>

<template>
  <div
    ref="drawer"
    class="absolute z-2 flex flex-col rounded-2xl shadow-[0_6px_24px_rgb(49_37_40/0.16)] backdrop-blur-2xl select-none"
    :class="
      lgAndGreater
        ? // The side panel covers a third of the map, often the sea: more opaque, so its sand
          // doesn't turn the sea's grey-blue
          'inset-4 w-1/3 bg-panel/92'
        : '-bottom-12 h-full w-full bg-panel/75'
    "
    :style="{ '--drawer-header-h': `${headerHeight}px` }"
  >
    <!-- Each page's DrawerHeader (handle, title or search) is teleported here: over the scroll
         area, not inside it, so the content can be clipped to the rounded corners without
         clipping the header (Firefox drops the backdrop-filter of anything inside rounded,
         clipped overflow: https://bugzilla.mozilla.org/show_bug.cgi?id=1782876). The scroll
         areas leave --drawer-header-h free at the top, and content scrolls up under the header -->
    <div id="drawer-header" class="absolute inset-x-0 top-0 z-10"></div>
    <div
      ref="drawerContent"
      data-drawer-scroll
      class="scrollbar-hidden relative min-h-0 flex-1 overscroll-contain rounded-[inherit] focus-visible:-outline-offset-2"
      :class="isHome ? '' : 'overflow-y-scroll pt-(--drawer-header-h)'"
      :tabindex="isHome ? undefined : 0"
    >
      <slot></slot>
    </div>
  </div>
  <!-- Mobile: a strip whose bottom edge is the drawer's top edge (the drawer's box starts 3rem
       down: -bottom-12, full height); the buttons in it grow upwards. Only they take clicks -->
  <div
    id="drawer-float"
    ref="float"
    class="pointer-events-none absolute inset-x-0 top-0 z-2 h-12 lg:hidden"
  ></div>
</template>
