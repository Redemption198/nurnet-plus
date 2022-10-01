<script setup>
import { useGesture } from "@vueuse/gesture";
import { breakpointsTailwind } from "@vueuse/core";

const drawer = ref();
const drawerContent = useState("drawer-content", () => null);
const drawerState = useDrawerState();

const breakpoints = useBreakpoints(breakpointsTailwind);
const lgAndGreater = breakpoints.greaterOrEqual("lg");

const { motionProperties } = useMotionProperties(drawer, {
  cursor: "grab",
  x: 0,
  y: 0,
});

const { set } = useSpring(motionProperties, {
  damping: 35,
  stiffness: 400,
});

function setDrawerOnTop() {
  const screenSection = window.innerHeight / 3;
  set({ y: screenSection * 0.01, cursor: "grab" });
  drawerState.value.currentPosition = "DRAWER_ON_TOP_SCREEN";
}
function setDrawerOnMiddle() {
  const screenSection = window.innerHeight / 3;
  set({ y: screenSection, cursor: "grab" });
  drawerState.value.currentPosition = "DRAWER_ON_MIDDLE_SCREEN";
}
function setDrawerOnBottom() {
  const screenSection = window.innerHeight / 3;
  set({ y: screenSection * 2, cursor: "grab" });
  drawerState.value.currentPosition = "DRAWER_ON_BOTTOM_SCREEN";
}

watch(drawerState.value, () => {
  if (lgAndGreater.value) {
    drawerState.value.setPosition = "";
    return;
  }
  if (drawerState.value.setPosition === "SET_DRAWER_ON_TOP_SCREEN")
    setDrawerOnTop();
  else if (drawerState.value.setPosition === "SET_DRAWER_ON_MIDDLE_SCREEN")
    setDrawerOnMiddle();
  else if (drawerState.value.setPosition === "SET_DRAWER_ON_BOTTOM_SCREEN")
    setDrawerOnBottom();

  drawerState.value.setPosition = "";
});

watch(lgAndGreater, () => {
  if (lgAndGreater.value) {
    /**
     * When @vueuse/motion will support values other than px, use set() to animate the drawer on window resize
     * https://github.com/vueuse/motion/issues/81
     */
    set({ y: 0, cursor: "pointer" });
  }
});

const { y: drawerContentY } = useScroll(drawerContent);

useGesture(
  {
    onDrag: ({ movement: [x, y], cancel }) => {
      const drawerTop = drawer.value.getBoundingClientRect().top;
      if (
        drawerTop <= 0 ||
        drawerTop >= window.innerHeight ||
        lgAndGreater.value
      ) {
        cancel();
      }
      set({
        cursor: "grabbing",
        y,
      });
    },
    onDragEnd: ({ swipe, velocity }) => {
      // Keep drawer on top on large screens
      if (lgAndGreater.value) {
        setDrawerOnTop();
        return;
      }
      // Swipe Up
      if (swipe[0] === 0 && swipe[1] === -1) {
        if (drawerState.value.currentPosition === "DRAWER_ON_BOTTOM_SCREEN") {
          if (velocity > 1.8) {
            setDrawerOnTop();
            return;
          }
          setDrawerOnMiddle();
          return;
        }
        if (drawerState.value.currentPosition === "DRAWER_ON_MIDDLE_SCREEN") {
          setDrawerOnTop();
          return;
        }
      }

      // Swipe Down
      if (swipe[0] === 0 && swipe[1] === 1 && drawerContentY.value <= 0) {
        if (drawerState.value.currentPosition === "DRAWER_ON_TOP_SCREEN") {
          if (velocity > 1.8) {
            setDrawerOnBottom();
            return;
          }
          setDrawerOnMiddle();
          return;
        }
        if (drawerState.value.currentPosition === "DRAWER_ON_MIDDLE_SCREEN") {
          setDrawerOnBottom();
          return;
        }
      }

      const screenSection = window.innerHeight / 3;
      const top = drawer.value.getBoundingClientRect().top;

      if (top <= screenSection) {
        setDrawerOnTop();
        return;
      }
      if (top >= screenSection && top <= screenSection * 1.8) {
        setDrawerOnMiddle();
        return;
      }
      if (top >= screenSection * 2) {
        setDrawerOnBottom();
        return;
      }

      set({ x: 0, y: 0, cursor: "grab" });
    },
  },
  {
    domTarget: drawer,
    drag: {
      filterTaps: true,
    },
  }
);

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
    class="absolute z-[2] select-none rounded-2xl bg-slate-200/75 shadow-md backdrop-blur-2xl"
    style="box-shadow: 8px rgb(0 0 0 / 0.15)"
    :class="lgAndGreater ? 'inset-4 w-1/3' : '-bottom-12 h-full w-full'"
  >
    <DrawerHandle />

    <div
      ref="drawerContent"
      class="scrollbar-hidden relative h-screen"
      :class="$route.path === '/' ? '' : 'overflow-y-scroll'"
    >
      <slot></slot>
    </div>
  </div>
</template>
