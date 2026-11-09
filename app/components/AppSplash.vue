<script setup lang="ts">
import gsap from "gsap";

// Data is loaded: play the exit animation, then disappear
const props = defineProps<{ ready: boolean }>();

const visible = ref(true);
// The status bar's orange (app.vue) lasts as long as the splash, and goes as it starts to fade
const splashVisible = useSplashVisible();
const root = useTemplateRef("root");
const mark = useTemplateRef("mark");

// The splash's animations, reverted (loop included) once it's gone
let animations: gsap.Context | undefined;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function hide() {
  animations?.revert();
  visible.value = false;
  splashVisible.value = false;
}

// The logo (a nuraghe seen from above: a central tower and four around it), in its 64-unit
// viewBox. Breathing in, the central tower swells by BREATH and pushes the four outwards, each
// growing by the same factor, so the gaps between them stay the same: the same on both axes
const CENTER = 32;
const BREATH = 1.12;

function breathe(dots: SVGCircleElement[]) {
  const [middle, ...towers] = dots;
  const middleRadius = Number(middle!.getAttribute("r"));
  const timeline = gsap.timeline({
    repeat: -1,
    yoyo: true,
    defaults: { duration: 1.3, ease: "sine.inOut" },
  });
  timeline.to(middle!, { attr: { r: middleRadius * BREATH } }, 0);
  for (const tower of towers) {
    const radius = Number(tower.getAttribute("r"));
    const dx = Number(tower.getAttribute("cx")) - CENTER;
    const dy = Number(tower.getAttribute("cy")) - CENTER;
    const distance = Math.hypot(dx, dy);
    // Pushed out by how much both circles grow
    const pushed = distance + (middleRadius + radius) * (BREATH - 1);
    timeline.to(
      tower,
      {
        attr: {
          r: radius * BREATH,
          cx: CENTER + (dx / distance) * pushed,
          cy: CENTER + (dy / distance) * pushed,
        },
      },
      0,
    );
  }
}

onMounted(() => {
  // Already loaded (e.g. the page mounted again): the watcher below won't fire, so go now
  if (props.ready) return hide();
  animations = gsap.context(() => {
    // The logo is already there, as on the launch screen, and only the logo: the name is in the
    // app once it opens
    const dots = [...mark.value!.querySelectorAll("circle")];
    if (reduceMotion()) {
      // No movement: the logo glows softly instead
      gsap.to(dots, { opacity: 0.7, duration: 1.4, ease: "sine.inOut", repeat: -1, yoyo: true });
    } else {
      breathe(dots);
    }
  }, root.value ?? undefined);
});

watch(
  () => props.ready,
  (ready) => {
    if (!ready || !visible.value) return;
    if (!animations) return hide();
    splashVisible.value = false;
    animations.add(() =>
      gsap.to(root.value, {
        opacity: 0,
        scale: reduceMotion() ? 1 : 1.04,
        duration: 0.4,
        ease: "power2.in",
        onComplete: hide,
      }),
    );
  },
);

onUnmounted(() => animations?.revert());
</script>

<template>
  <!-- Drawn like the iOS launch screens (scripts/pwa-assets): the brand gradient over the whole
       screen and the logo centred on it, min(36%, 36%, 200px) of its width and height, so one
       follows the other seamlessly. On an iPhone's home screen the page starts below the status
       bar: the splash reaches up behind it by its height (--status-bar, app.vue), so the gradient
       and the logo stay where the launch screen drew them -->
  <div
    v-if="visible"
    ref="root"
    class="splash fixed inset-x-0 bottom-0 z-50 bg-brand"
    role="status"
    :aria-label="$t('app.loadingSites')"
  >
    <div ref="mark" class="logo absolute top-1/2 left-1/2 -translate-1/2">
      <IconNurnetPlus class="size-full fill-white" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.splash {
  top: calc(-1 * var(--status-bar, 0px));
  /* The logo's size from the splash's own box: the whole screen, status bar included */
  container-type: size;
}

.logo {
  width: min(36cqw, 36cqh, 200px);
  height: min(36cqw, 36cqh, 200px);
}
</style>
