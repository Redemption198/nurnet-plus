<script setup>
import gsap from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { breakpointsTailwind } from "@vueuse/core";

if (import.meta.client) gsap.registerPlugin(InertiaPlugin);

const drawer = ref();
const drawerContent = useState("drawer-content", () => null);
const drawerState = useDrawerState();

const breakpoints = useBreakpoints(breakpointsTailwind);
const lgAndGreater = breakpoints.greaterOrEqual("lg");

const mapPadding = useMapPadding();

// Resting positions (detents) on mobile, as the drawer's y offset
const POSITIONS = ["DRAWER_ON_TOP_SCREEN", "DRAWER_ON_MIDDLE_SCREEN", "DRAWER_ON_BOTTOM_SCREEN"];

function positionY(position) {
  const screenSection = window.innerHeight / 3;
  if (position === "DRAWER_ON_TOP_SCREEN") return screenSection * 0.01;
  if (position === "DRAWER_ON_MIDDLE_SCREEN") return screenSection;
  return screenSection * 2;
}

function closestPosition(y) {
  return POSITIONS.reduce((best, position) =>
    Math.abs(positionY(position) - y) < Math.abs(positionY(best) - y) ? position : best,
  );
}

// Tell the map which part of the screen the drawer covers, so it centers in what is left
function updateMapPadding(targetY) {
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
function settle(position) {
  drawerState.value.currentPosition = position;
  if (position !== "DRAWER_ON_TOP_SCREEN") updateMapPadding(positionY(position));
}

function moveTo(position) {
  settle(position);
  gsap.to(drawer.value, {
    y: positionY(position),
    duration: 0.6,
    ease: "expo.out",
    overwrite: true,
  });
}

watch(drawerState.value, () => {
  const target = drawerState.value.setPosition.replace("SET_", "");
  drawerState.value.setPosition = "";
  if (!lgAndGreater.value && POSITIONS.includes(target)) moveTo(target);
});

// iOS-style sheet gestures (mobile only):
// - the header (handle + title/search) always drags the sheet
// - on the content, scrolling takes priority: the sheet only moves when the content can't
//   scroll any further that way (pulling down at its top, or nothing to scroll)
// - the release velocity picks the detent, and the sheet carries on at that speed
let gesture = null;

// Resistance past the first/last detent, the same curve UIScrollView uses for its bounce
function rubberBand(overshoot) {
  const dimension = window.innerHeight;
  return (1 - 1 / ((overshoot * 0.55) / dimension + 1)) * dimension;
}

// Can a scroll container under the finger move its content for a drag of dy?
// (dy < 0: finger moves up, content scrolls down)
function canScroll(target, dy) {
  for (let el = target.closest("[data-drawer-scroll]"); el;) {
    if (dy < 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) {
      return true;
    }
    el = el.parentElement?.closest("[data-drawer-scroll]");
  }
  return false;
}

function gestureMode(dy) {
  if (gesture.target.closest("[data-drawer-drag]")) return "sheet";
  return canScroll(gesture.target, dy) ? "scroll" : "sheet";
}

function startGesture(clientY, target, isMouse) {
  if (lgAndGreater.value) return;
  gesture = { startY: clientY, startDrawerY: 0, target, isMouse, mode: null, moved: false };
}

function moveGesture(clientY, event) {
  if (!gesture) return;
  const dy = clientY - gesture.startY;

  // Decide within the first few pixels: the browser starts scrolling natively soon after,
  // and from then on it can't be stopped. The small threshold avoids misreading jitter.
  if (!gesture.mode) {
    if (Math.abs(dy) < 3) return;
    gesture.mode = gestureMode(dy);
    if (gesture.mode === "sheet") {
      // Catch the sheet mid-animation, like iOS
      gsap.killTweensOf(drawer.value);
      gesture.startDrawerY = gsap.getProperty(drawer.value, "y");
      InertiaPlugin.track(drawer.value, "y");
    }
  }
  if (gesture.mode !== "sheet") return;

  if (event.cancelable) event.preventDefault();
  if (Math.abs(dy) > 6) gesture.moved = true;

  const min = positionY("DRAWER_ON_TOP_SCREEN");
  const max = positionY("DRAWER_ON_BOTTOM_SCREEN");
  let y = gesture.startDrawerY + dy;
  if (y < min) y = min - rubberBand(min - y);
  else if (y > max) y = max + rubberBand(y - max);
  gsap.set(drawer.value, { y });
}

function endGesture() {
  if (gesture?.mode === "sheet") {
    const velocity = InertiaPlugin.getVelocity(drawer.value, "y");
    InertiaPlugin.untrack(drawer.value, "y");

    // Like UIKit, project where the flick would come to rest and pick the nearest detent
    const y = gsap.getProperty(drawer.value, "y");
    const target = closestPosition(y + velocity * 0.2);
    settle(target);
    gsap.to(drawer.value, {
      inertia: { y: { velocity, end: positionY(target) }, duration: { min: 0.35, max: 0.8 } },
      overwrite: true,
    });

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

useEventListener(drawer, "touchstart", (e) => startGesture(e.touches[0].clientY, e.target, false), {
  passive: true,
});
// Not passive: preventDefault stops the content from scrolling while the sheet moves
useEventListener(drawer, "touchmove", (e) => moveGesture(e.touches[0].clientY, e), {
  passive: false,
});
useEventListener(drawer, ["touchend", "touchcancel"], endGesture);

useEventListener(drawer, "pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button !== 0 || lgAndGreater.value) return;
  // Stop links from being dragged natively (that cancels the gesture), but keep inputs focusable
  if (!e.target.closest("input, textarea, select")) e.preventDefault();
  startGesture(e.clientY, e.target, true);
});
useEventListener(window, "pointermove", (e) => {
  if (e.pointerType === "mouse") moveGesture(e.clientY, e);
});
useEventListener(window, ["pointerup", "pointercancel"], (e) => {
  if (e.pointerType === "mouse") endGesture();
});

function setupForScreen(animateIn) {
  if (lgAndGreater.value) {
    // Desktop: a fixed side panel, no transform at all (it also breaks nested blur in Firefox)
    gesture = null;
    gsap.killTweensOf(drawer.value);
    gsap.set(drawer.value, { clearProps: "transform" });
    updateMapPadding(0);
    return;
  }

  settle("DRAWER_ON_BOTTOM_SCREEN");
  if (animateIn) {
    gsap.fromTo(
      drawer.value,
      { y: window.innerHeight },
      { y: positionY("DRAWER_ON_BOTTOM_SCREEN"), duration: 0.8, ease: "expo.out" },
    );
  } else {
    gsap.set(drawer.value, { y: positionY("DRAWER_ON_BOTTOM_SCREEN") });
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
  const position = drawerState.value.currentPosition;
  gsap.set(drawer.value, { y: positionY(position) });
  settle(position);
});

function disableScroll() {
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
}

function enableScroll() {
  document.body.style.position = "";
  document.body.style.overflow = "";
  document.body.style.width = "";
}

onMounted(() => {
  disableScroll();
  setupForScreen(true);
});

onUnmounted(() => {
  enableScroll();
});

onActivated(() => {
  disableScroll();
});

onDeactivated(() => {
  enableScroll();
});
</script>

<template>
  <div
    ref="drawer"
    class="absolute z-2 flex select-none flex-col rounded-2xl bg-slate-200/70 shadow-md backdrop-blur-2xl"
    style="box-shadow: 8px rgb(0 0 0 / 0.15)"
    :class="lgAndGreater ? 'inset-4 w-1/3' : '-bottom-12 h-full w-full'"
  >
    <!-- The handle lives in each page's sticky DrawerHeader so content can scroll under it.
         No overflow-hidden here: with the rounded corners it breaks the header's
         backdrop-filter in Firefox (https://bugzilla.mozilla.org/show_bug.cgi?id=1782876) -->
    <div
      ref="drawerContent"
      data-drawer-scroll
      class="scrollbar-hidden relative min-h-0 flex-1 overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
      :class="$route.path === '/' ? '' : 'overflow-y-scroll'"
      :tabindex="$route.path === '/' ? undefined : 0"
    >
      <slot></slot>
    </div>
  </div>
</template>
