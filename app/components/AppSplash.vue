<script setup lang="ts">
import gsap from "gsap";

// Data is loaded: play the exit animation, then disappear
const props = defineProps<{ ready: boolean }>();

const visible = ref(true);
const root = ref<HTMLElement | null>(null);
const mark = ref<HTMLElement | null>(null);
const wordmark = ref<HTMLElement | null>(null);

// The splash's animations, reverted (loop included) once it's gone
let animations: gsap.Context | undefined;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function hide() {
  animations?.revert();
  visible.value = false;
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
    const dots = [...mark.value!.querySelectorAll("circle")];
    // The logo is already there, as on the launch screen: only the name arrives
    gsap.from(wordmark.value, { opacity: 0, y: 8, duration: 0.6, ease: "power3.out" });
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
  <!-- Drawn like the PWA launch screens (package.json's generate-pwa-assets): the brand gradient
       and the logo centred, min(36vw, 36vh, 200px) wide, so one follows the other seamlessly -->
  <div
    v-if="visible"
    ref="root"
    class="splash fixed inset-0 z-50 bg-brand"
    role="status"
    aria-label="Caricamento dei siti"
  >
    <div ref="mark" class="logo absolute top-1/2 left-1/2 -translate-1/2">
      <IconNurnetPlus class="size-full fill-white" aria-hidden="true" />
    </div>
    <p
      ref="wordmark"
      class="wordmark absolute inset-x-0 text-center font-display text-3xl font-semibold tracking-tight text-white"
    >
      NurNet+
    </p>
  </div>
</template>

<style scoped>
.splash {
  --logo: min(36vw, 36vh, 200px);
}

.logo {
  width: var(--logo);
  height: var(--logo);
}

/* Below the logo, which stays exactly centred */
.wordmark {
  top: calc(50% + var(--logo) / 2 + 1.25rem);
}
</style>
