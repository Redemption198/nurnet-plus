<script setup lang="ts">
// The site's video: a YouTube id or a Facebook video URL. Their players set cookies and receive
// the visitor's IP address, so nothing is loaded from them until the visitor asks for it. The
// choice holds for that service until the app is closed (kept in memory only, see InfoSheet)
const site = useCurrentSite();
const loaded = useVideoConsent();

const provider = computed(() =>
  site.value?.youtube?.includes("facebook.com") ? ("facebook" as const) : ("youtube" as const),
);
const providerName = computed(() => (provider.value === "facebook" ? "Facebook" : "YouTube"));

const src = computed(() => {
  const video = site.value?.youtube ?? "";
  return provider.value === "facebook"
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video)}&show_text=false&t=0`
    : `https://www.youtube-nocookie.com/embed/${video}`;
});

// YouTube's player also loads from other Google servers
const owner = computed(() => (provider.value === "facebook" ? "Facebook" : "YouTube (Google)"));

// Asked for here: play straight away. Already allowed earlier: show the player, don't play
const autoplay = ref(false);
const playerSrc = computed(() => {
  if (!autoplay.value) return src.value;
  return `${src.value}${src.value.includes("?") ? "&" : "?"}autoplay=1`;
});

// The button goes away: keyboard focus moves on to the player that replaces it
const player = ref<HTMLIFrameElement | null>(null);
async function load() {
  autoplay.value = true;
  loaded.value[provider.value] = true;
  await nextTick();
  player.value?.focus();
}
</script>

<template>
  <section v-if="site?.youtube" class="flex flex-col gap-y-3" aria-labelledby="site-video">
    <h3 id="site-video" class="text-base font-semibold text-basalt">Video</h3>
    <iframe
      v-if="loaded[provider]"
      ref="player"
      :title="`Video: ${site.name}`"
      :src="playerSrc"
      class="aspect-video w-full rounded-2xl border-none bg-well"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
    <div
      v-else
      class="flex aspect-video w-full flex-col items-center justify-center gap-y-3 rounded-2xl bg-well/70 px-6 text-center"
    >
      <button
        type="button"
        class="flex min-h-11 cursor-pointer items-center gap-x-2 rounded-full bg-white/80 px-5 font-semibold text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)] transition hover:bg-white press"
        @click="load"
      >
        <UIcon name="i-lucide-play" class="size-4.5 text-terracotta" aria-hidden="true" />
        Carica il video da {{ providerName }}
      </button>
      <p class="max-w-[34ch] text-xs text-pretty text-muted">
        {{ owner }} riceverà il tuo indirizzo IP e potrebbe usare dei cookie.
      </p>
    </div>
  </section>
</template>
