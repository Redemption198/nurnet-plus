<script setup lang="ts">
// Getting to the open site and passing it on: directions in the phone's maps app, a link to it
// (the system's share sheet, or the clipboard), and its coordinates
const site = useCurrentSite();

const coordinates = computed(() => {
  const [lon, lat] = site.value?.coordinates ?? [0, 0];
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
});

// A geo: URI (RFC 5870), which the system hands to the map app the visitor uses, pinned and
// named. Apple's systems don't open geo: links, so there it's Apple Maps
const isApple = import.meta.client && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
const directionsUrl = computed(() => {
  const [lon, lat] = site.value?.coordinates ?? [0, 0];
  const name = encodeURIComponent(site.value?.name ?? "");
  return isApple
    ? `https://maps.apple.com/?daddr=${lat},${lon}`
    : `geo:${lat},${lon}?q=${lat},${lon}(${name})`;
});

const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });

// The link opens the app on this site. The share sheet where there is one (phones), otherwise
// the link is copied
const { share, isSupported: canShare } = useShare();
const {
  copy: copyLink,
  copied: linkCopied,
  isSupported: canCopyLink,
} = useClipboard({ copiedDuring: 2000 });
async function shareSite() {
  const url = location.href;
  if (canShare.value) {
    // Closing the sheet without picking an app rejects: nothing to do
    await share({ title: `${site.value?.name} · NurNet+`, url }).catch(() => {});
  } else {
    await copyLink(url);
  }
}
</script>

<template>
  <div v-if="site" class="flex flex-wrap items-center gap-2">
    <a
      :href="directionsUrl"
      :target="isApple ? '_blank' : undefined"
      rel="noopener"
      class="inline-flex min-h-11 items-center gap-x-2 rounded-full bg-terracotta px-5 font-semibold text-white shadow-[0_2px_6px_rgb(154_62_1/0.3)] transition hover:bg-terracotta-dark press press-subtle"
    >
      <UIcon name="i-lucide-navigation" class="size-4.5" aria-hidden="true" />
      Indicazioni
    </a>
    <button
      v-if="canShare || canCopyLink"
      type="button"
      class="inline-flex min-h-11 items-center gap-x-2 rounded-full px-4 text-sm font-semibold text-basalt transition hover:bg-well press press-subtle"
      @click="shareSite"
    >
      <UIcon
        :name="linkCopied ? 'i-lucide-check' : 'i-lucide-share-2'"
        class="size-4 text-muted"
        aria-hidden="true"
      />
      {{ linkCopied ? "Link copiato" : "Condividi" }}
    </button>
    <button
      v-if="isSupported"
      type="button"
      class="inline-flex min-h-11 items-center gap-x-2 rounded-full px-4 text-sm font-semibold text-basalt tabular-nums transition hover:bg-well press press-subtle"
      :aria-label="`Copia le coordinate: ${coordinates}`"
      @click="copy(coordinates)"
    >
      <UIcon
        :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        class="size-4 text-muted"
        aria-hidden="true"
      />
      <span>{{ copied ? "Coordinate copiate" : coordinates }}</span>
    </button>
    <p v-else class="px-1 text-sm text-muted tabular-nums">{{ coordinates }}</p>
    <span class="sr-only" aria-live="polite">{{
      copied ? "Coordinate copiate" : linkCopied ? "Link copiato" : ""
    }}</span>
  </div>
</template>
