<script setup lang="ts">
// The drawer's home: search, category filter, a random site, and the list of sites. Without a
// search the list follows the map (the sites in view, nearest the centre first); with one it shows
// the best matches, and the map fades the rest
const props = defineProps<{ mapData: NurnetPOI[] }>();

const { search, openPOI } = useNurnetData();
// Real links (new tab, copy link, screen readers) whose clicks are handled here: NuxtLink would
// navigate before a @click.prevent could stop it
const router = useRouter();
const siteHref = (id: string) => router.resolve(`/poi/${id}`).href;
const categoryFilter = useCategoryFilter();
const searchMatches = useSearchMatches();
const mapView = useMapView();

const inCategory = (poi: NurnetPOI) =>
  !categoryFilter.value || categoryOf(poi.category_id).name === categoryFilter.value;

// Random site, within the selected category if there is one
function openRandomPOI() {
  const pool = categoryFilter.value ? props.mapData.filter(inCategory) : props.mapData;
  const poi = pool[Math.floor(Math.random() * pool.length)];
  if (poi) openPOI(poi);
}

const query = ref("");
// MiniSearch answers in a few ms, so search as you type
const debouncedQuery = refDebounced(query, 150);
const searching = computed(() => debouncedQuery.value.trim() !== "");

// Searching runs in the data worker; it returns indices into mapData, best match first
const matches = shallowRef<number[]>([]);
let latestSearch = 0;
watch(
  debouncedQuery,
  async (value) => {
    const searchId = ++latestSearch;
    const indices = value.trim() ? await search(value) : [];
    // Ignore responses that arrive after a newer search was started
    if (searchId !== latestSearch) return;
    matches.value = indices;
    searchMatches.value = value.trim() ? indices : null;
  },
  { immediate: true },
);
onUnmounted(() => (searchMatches.value = null));

// Without a search: the sites in the map's view, nearest its centre first
const inView = computed(() => {
  const view = mapView.value;
  if (!view) return props.mapData;
  const [[west, south], [east, north]] = view.bounds;
  const [cx, cy] = view.center;
  const scale = Math.cos((cy * Math.PI) / 180);
  return props.mapData
    .filter(
      ({ coordinates: [lon, lat] }) => lon >= west && lon <= east && lat >= south && lat <= north,
    )
    .map((poi) => ({
      poi,
      d: ((poi.coordinates[0] - cx) * scale) ** 2 + (poi.coordinates[1] - cy) ** 2,
    }))
    .sort((a, b) => a.d - b.d)
    .map(({ poi }) => poi);
});

const results = computed(() =>
  (searching.value ? matches.value.map((i) => props.mapData[i]!) : inView.value).filter(inCategory),
);

// Must match the row height in the template (h-16 = 64px)
const { list, containerProps, wrapperProps } = useVirtualList(results, { itemHeight: 64 });
const { y: listY } = useScroll(containerProps.ref);

// Back to the top of the list when what it lists changes
watch([debouncedQuery, categoryFilter], () => {
  if (containerProps.ref.value) containerProps.ref.value.scrollTop = 0;
});

const countLabel = computed(() => {
  if (!results.value.length)
    return searching.value ? "Nessun sito trovato" : "Nessun sito nella mappa";
  const n = results.value.length.toLocaleString("it-IT");
  const what = results.value.length === 1 ? "sito" : "siti";
  return searching.value ? `${n} ${what} trovati` : `${n} ${what} nella mappa`;
});
</script>

<template>
  <!-- Bottom padding on mobile covers the part of the drawer that sits below the screen -->
  <div
    v-bind="containerProps"
    data-drawer-scroll
    class="drawer-clip scrollbar-hidden h-full overscroll-contain pb-16 lg:pb-4"
  >
    <DrawerHeader :scrolled="listY > 0">
      <BrandButton
        class="mb-3 hidden !bg-transparent !px-0 !shadow-none !backdrop-blur-none lg:flex"
      />

      <div class="flex gap-x-2">
        <div class="relative min-w-0 flex-1">
          <UIcon
            name="i-lucide-search"
            class="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            v-model="query"
            type="search"
            enterkeyhint="search"
            placeholder="Cerca sito o comune…"
            aria-label="Cerca un sito o un comune"
            class="h-11 w-full rounded-full bg-white/85 pr-11 pl-10 text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)] placeholder:text-muted focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:appearance-none"
          />
          <!-- The browser's own clear button doesn't follow the palette: this one does -->
          <button
            v-if="query"
            type="button"
            class="absolute top-0 right-0 flex size-11 items-center justify-center rounded-full text-muted"
            aria-label="Cancella la ricerca"
            @click="query = ''"
          >
            <span class="flex size-6 items-center justify-center rounded-full bg-well">
              <UIcon name="i-lucide-x" class="size-3.5" aria-hidden="true" />
            </span>
          </button>
        </div>
        <button
          type="button"
          class="inline-flex h-11 shrink-0 cursor-pointer items-center gap-x-1.5 rounded-full bg-white/85 pr-4 pl-3 text-sm font-semibold text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)] transition hover:bg-white active:scale-95"
          @click="openRandomPOI"
        >
          <UIcon name="i-lucide-dices" class="size-5 text-subtle" aria-hidden="true" />
          A caso
        </button>
      </div>

      <!-- Category filter: also filters the markers on the map. The scroll container clips
           vertically too: py-1 leaves room for the chips' shadow, the margins keep the spacing -->
      <div
        class="scrollbar-hidden -mx-4 mt-2 -mb-1 flex gap-x-2 overflow-x-auto px-4 py-1"
        role="group"
        aria-label="Filtra per tipo"
      >
        <button
          v-for="category in CATEGORIES"
          :key="category.name"
          type="button"
          class="flex h-11 shrink-0 cursor-pointer items-center gap-x-1.5 rounded-full pr-3.5 pl-2.5 text-sm font-semibold shadow-[0_1px_3px_rgb(49_37_40/0.12)] transition active:scale-95"
          :class="
            categoryFilter === category.name
              ? 'text-white'
              : 'bg-white/85 text-basalt hover:bg-white'
          "
          :style="
            categoryFilter === category.name ? { backgroundColor: category.color } : undefined
          "
          :aria-pressed="categoryFilter === category.name"
          @click="categoryFilter = categoryFilter === category.name ? null : category.name"
        >
          <!-- Same icons as the list: category colour, white on the selected chip -->
          <CategoryIcon
            :category-id="category.ids[0]"
            :color="categoryFilter === category.name ? '#fff' : undefined"
            class="size-4.5 shrink-0"
          />
          {{ category.name }}
        </button>
      </div>

      <p class="mt-3 -mb-1 text-xs font-semibold text-muted" aria-live="polite">
        {{ countLabel }}
      </p>
    </DrawerHeader>

    <!-- Nothing to list: say why, and how to get results back -->
    <div v-if="!results.length" class="flex flex-col items-center gap-y-3 px-8 pt-10 text-center">
      <IconNurnetPlus class="size-14 fill-subtle/40" aria-hidden="true" />
      <p class="font-semibold text-basalt">
        <template v-if="searching">Nessun sito per «{{ debouncedQuery.trim() }}»</template>
        <template v-else>Nessun sito in questa parte della mappa</template>
      </p>
      <p class="max-w-[34ch] text-sm text-pretty text-muted">
        <template v-if="searching">Prova con il nome del comune o con meno lettere.</template>
        <template v-else>Sposta o allontana la mappa per vederne altri.</template>
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <UButton v-if="searching" color="neutral" variant="soft" @click="query = ''">
          Cancella la ricerca
        </UButton>
        <UButton
          v-if="categoryFilter"
          color="neutral"
          variant="soft"
          @click="categoryFilter = null"
        >
          Mostra tutti i tipi
        </UButton>
      </div>
    </div>

    <ul v-else v-bind="wrapperProps" class="px-4" :aria-label="countLabel">
      <li v-for="result in list" :key="result.data.content_id" class="h-16 border-t border-line">
        <a
          class="-mx-2 flex h-full items-center gap-x-3 rounded-xl px-2 text-basalt transition-colors hover:bg-basalt/5"
          :href="siteHref(result.data.content_id)"
          @click.prevent="openPOI(result.data)"
        >
          <CategoryIcon :category-id="result.data.category_id" class="size-7 shrink-0" />
          <div class="min-w-0">
            <p class="truncate text-[0.9375rem] font-semibold">{{ result.data.name }}</p>
            <p class="truncate text-xs text-muted">
              {{
                [result.data.comune, result.data.localita, result.data.regione]
                  .filter(Boolean)
                  .join(" · ")
              }}
            </p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</template>
