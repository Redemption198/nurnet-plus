<script setup lang="ts">
import gsap from "gsap";

// Data is loaded: play the exit animation, then disappear
const props = defineProps<{ ready: boolean }>();

const visible = ref(true);
const root = ref<HTMLElement | null>(null);
const mark = ref<HTMLElement | null>(null);
const wordmark = ref<HTMLElement | null>(null);

// The splash's animations, reverted (looping intro included) once it's gone
let animations: gsap.Context | undefined;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function hide() {
  animations?.revert();
  visible.value = false;
}

onMounted(() => {
  if (props.ready || reduceMotion()) return;
  animations = gsap.context(() => {
    // The five dots of the logo (a nuraghe seen from above) appear centre first, then around it
    const dots = mark.value!.querySelectorAll("circle");
    gsap
      .timeline()
      .from(dots, {
        scale: 0,
        transformOrigin: "50% 50%",
        duration: 0.5,
        ease: "back.out(2.2)",
        stagger: 0.09,
      })
      .from(wordmark.value, { opacity: 0, y: 10, duration: 0.5, ease: "power3.out" }, "-=0.25")
      .to(dots, {
        scale: 0.82,
        transformOrigin: "50% 50%",
        duration: 0.7,
        ease: "sine.inOut",
        stagger: { each: 0.08, yoyo: true, repeat: -1 },
      });
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
        scale: 1.04,
        duration: 0.45,
        ease: "power2.in",
        onComplete: hide,
      }),
    );
  },
);

onUnmounted(() => animations?.revert());
</script>

<template>
  <div
    v-if="visible"
    ref="root"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-y-5 bg-sand"
    role="status"
    aria-label="Caricamento dei siti"
  >
    <div
      ref="mark"
      class="flex size-24 items-center justify-center rounded-[1.75rem] bg-linear-to-br from-[#fe8702] via-[#d87401] to-[#b26100] shadow-lg"
    >
      <IconNurnetPlus class="size-16 fill-white" aria-hidden="true" />
    </div>
    <p ref="wordmark" class="font-display text-3xl font-semibold tracking-tight text-basalt">
      NurNet+
    </p>
  </div>
</template>
