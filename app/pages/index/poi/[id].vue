<script setup lang="ts">
const site = useCurrentSite();
const route = useRoute();
const { items, openPOI, retry } = useNurnetData();

// The URL decides which site is open: a shared link, a reload, back/forward. Sites opened from the
// app are already open by the time the route changes
const toast = useToast();
watch(
  [() => route.params.id, items],
  ([id, list]) => {
    if (!list || site.value?.content_id === id) return;
    // Ids are upper case (NUR3551), but a link may have been lowercased on its way here: open the
    // site anyway, at its own URL
    const wanted = String(id).toUpperCase();
    const poi = list.find((item) => item.content_id.toUpperCase() === wanted);
    if (poi) {
      openPOI(poi, { navigate: false });
      if (poi.content_id !== id) void navigateTo(`/poi/${poi.content_id}`, { replace: true });
      return;
    }
    // A link to a site that isn't in the data (any more): say so, rather than just showing the map
    void navigateTo("/", { replace: true });
    toast.add({
      title: "Sito non trovato",
      description: "Il link non corrisponde a nessun sito della mappa.",
      icon: "i-lucide-map-pin-off",
    });
  },
  { immediate: true },
);

const poi = computed(() => (site.value?.content_id === route.params.id ? site.value : null));
const category = computed(() => categoryOf(poi.value?.category_id));
const status = computed(() => statusOf(poi.value?.stato));

// Tab title and link previews: "Nuraghe Losa · NurNet+" (the site name comes from the title
// template), "Nuraghe complesso ad Abbasanta…"
const place = computed(() => [poi.value?.comune, poi.value?.regione].filter(Boolean).join(", "));
const description = computed(() => {
  if (!poi.value) return undefined;
  const kind = poi.value.typology || category.value.name;
  // "ad Abbasanta", "a Barumini"
  const preposition = /^a/i.test(place.value) ? "ad" : "a";
  return `${kind}${place.value ? ` ${preposition} ${place.value}` : ""}, sulla mappa di NurNet+.`;
});
useSeoMeta({
  title: () => poi.value?.name,
  ogTitle: () => poi.value?.name,
  description,
  ogDescription: description,
});

// Esc closes the site, unless a dialog (photo viewer, info sheet) is open and takes it
onKeyStroke("Escape", (event) => {
  if (event.defaultPrevented || document.querySelector("[role='dialog']")) return;
  void navigateTo("/");
});

const isURL = (value: string | undefined) => !!value && URL.canParse(value);
const sourceHost = computed(() =>
  isURL(poi.value?.source) ? new URL(poi.value!.source!).hostname.replace(/^www\./, "") : null,
);
// The data's dates are days ("2020-04-20"), which Date reads as UTC midnight: shown in UTC too,
// or west of Greenwich they'd read as the day before
const added = computed(() =>
  poi.value?.date
    ? new Date(poi.value.date).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null,
);

const scroller = useDrawerScroller();
const { y: contentY } = useScroll(scroller);
</script>

<template>
  <article v-if="poi" class="flex flex-col pb-64" :aria-labelledby="`site-${poi.content_id}`">
    <DrawerHeader :scrolled="contentY > 0">
      <div class="flex items-start justify-between gap-x-3">
        <h2
          :id="`site-${poi.content_id}`"
          class="pt-1.5 font-display text-2xl leading-tight font-semibold text-balance text-basalt"
        >
          {{ poi.name }}
        </h2>
        <NuxtLink
          class="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-well press"
          to="/"
          aria-label="Chiudi"
        >
          <span class="flex size-9 items-center justify-center rounded-full bg-well/70">
            <UIcon name="i-lucide-x" class="size-5" aria-hidden="true" />
          </span>
        </NuxtLink>
      </div>
    </DrawerHeader>

    <!-- What it is and where, in one line -->
    <div class="-mt-1 flex flex-col gap-y-1.5 px-4 pb-4">
      <p class="flex items-center gap-x-2 text-[0.9375rem] font-semibold text-basalt">
        <CategoryIcon :category-id="poi.category_id" class="size-5 shrink-0" />
        <span>
          {{ poi.typology || category.name
          }}<span v-if="place" class="font-normal text-muted"> · {{ place }}</span>
        </span>
      </p>
      <p
        v-if="status || poi.verified === false || poi.localita"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"
      >
        <span v-if="status" class="flex items-center gap-x-1">
          <UIcon :name="status.icon" class="size-4" aria-hidden="true" />{{ status.label }}
        </span>
        <span v-if="poi.localita" class="flex items-center gap-x-1">
          <UIcon name="i-lucide-map-pin" class="size-4" aria-hidden="true" />{{ poi.localita }}
        </span>
        <span v-if="poi.verified === false" class="flex items-center gap-x-1 text-terracotta-dark">
          <UIcon name="i-lucide-badge-alert" class="size-4" aria-hidden="true" />Non verificato
        </span>
      </p>
    </div>

    <POIPhotoSlider v-if="poi.photos.length" class="pb-4" />
    <!-- The strip's space while the details load, so the page doesn't jump -->
    <div
      v-else-if="poi.detailsStatus === 'loading'"
      class="flex gap-x-3 overflow-hidden px-4 pb-4"
      role="status"
      aria-label="Caricamento di foto e descrizione"
    >
      <div v-for="n in 3" :key="n" class="size-40 shrink-0 animate-pulse rounded-2xl bg-well" />
    </div>

    <SiteActions class="px-4 pb-6" />

    <div
      v-if="poi.detailsStatus === 'error'"
      class="mx-4 mb-6 flex items-center gap-x-3 text-sm text-muted"
    >
      <p class="flex-1">Foto e descrizione non si sono caricate.</p>
      <UButton color="neutral" variant="soft" icon="i-lucide-rotate-cw" @click="retry">
        Riprova
      </UButton>
    </div>

    <section
      v-if="poi.description"
      class="flex flex-col gap-y-3 px-4 pb-6"
      aria-labelledby="site-description"
    >
      <h3 id="site-description" class="text-base font-semibold text-basalt">Descrizione</h3>
      <p
        v-for="(paragraph, i) in poi.description.split('\n\n')"
        :key="i"
        class="max-w-[65ch] text-[0.9375rem] leading-relaxed text-pretty text-basalt/85"
      >
        {{ paragraph }}
      </p>
    </section>

    <POIVideo v-if="poi.youtube" class="px-4 pb-6" />

    <POIVisibility class="pb-6" />

    <POIContext class="pb-6" />

    <!-- Where the information comes from -->
    <footer class="flex flex-col gap-y-2 border-t border-line px-4 pt-4 text-sm text-muted">
      <p v-if="poi.source && !sourceHost">Fonte: {{ poi.source }}</p>
      <div class="flex flex-wrap gap-x-5 gap-y-1">
        <a
          v-if="sourceHost"
          :href="poi.source"
          target="_blank"
          rel="noopener"
          class="inline-flex min-h-11 items-center gap-x-1 font-semibold text-terracotta-dark underline-offset-4 hover:underline"
        >
          Fonte: {{ sourceHost }}<UIcon name="i-lucide-arrow-up-right" class="size-4" />
        </a>
        <a
          v-if="poi.photos.length"
          :href="`https://www.nurnet.net/mediateca/?s=${encodeURIComponent(poi.name)}`"
          target="_blank"
          rel="noopener"
          class="inline-flex min-h-11 items-center gap-x-1 font-semibold text-terracotta-dark underline-offset-4 hover:underline"
        >
          Foto nella Mediateca NurNet<UIcon name="i-lucide-arrow-up-right" class="size-4" />
        </a>
      </div>
      <p v-if="added">Aggiunto a NurNet il {{ added }}</p>
    </footer>
  </article>
</template>
