<script setup>
import { useMotionProperties, useSpring } from "@vueuse/motion";
import { useGesture } from "@vueuse/gesture";

const drawer = ref();
const drawerContent = useState("drawer-content", () => null);
const drawerState = useDrawerState();

const { motionProperties } = useMotionProperties(drawer, {
  cursor: "grab",
  x: 0,
  y: 0,
});

const { set } = useSpring(motionProperties, {
  damping: 30,
  stiffness: 250,
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
  if (drawerState.value.setPosition === "SET_DRAWER_ON_TOP_SCREEN")
    setDrawerOnTop();
  else if (drawerState.value.setPosition === "SET_DRAWER_ON_MIDDLE_SCREEN")
    setDrawerOnMiddle();
  else if (drawerState.value.setPosition === "SET_DRAWER_ON_BOTTOM_SCREEN")
    setDrawerOnBottom();

  drawerState.value.setPosition = "";
});

const { y: drawerContentY } = useScroll(drawerContent);

useGesture(
  {
    onDrag: ({ movement: [x, y] }) => {
      set({
        cursor: "grabbing",
        y,
      });
    },
    onDragEnd: ({ swipe, velocity }) => {
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
    class="absolute -bottom-12 z-[2] h-full w-full select-none rounded-t-2xl bg-slate-200/75 shadow-md backdrop-blur-2xl"
    style="box-shadow: 0 0 8px 0 rgb(0 0 0 / 0.15)"
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
