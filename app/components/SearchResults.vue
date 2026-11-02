<script setup>
const props = defineProps({
  mapData: {
    type: Array,
    default: () => [],
  },
});
const IconCultoAcqua = resolveComponent("IconCultoAcqua");
const IconDolmen = resolveComponent("IconDolmen");
const IconDomusJanas = resolveComponent("IconDomusJanas");
const IconMenhir = resolveComponent("IconMenhir");
const IconTombaGiganti = resolveComponent("IconTombaGiganti");
const IconVillaggioNuragico = resolveComponent("IconVillaggioNuragico");
const IconNurnetPlus = resolveComponent("IconNurnetPlus");

const { search, openPOI } = useNurnetData();

const categoryFilter = useCategoryFilter();
const inCategory = (poi) =>
  !categoryFilter.value || useCategoryName(Number(poi.category_id)) === categoryFilter.value;

// Random POI, within the selected category if there is one
function openRandomPOI() {
  const pool = categoryFilter.value ? props.mapData.filter(inCategory) : props.mapData;
  const poi = pool[Math.floor(Math.random() * pool.length)];
  if (poi) openPOI(poi);
}

const searchInput = ref("");
// MiniSearch answers in a few ms, so search as you type
const searchInputDebounce = refDebounced(searchInput, 150);

// Searching runs in the data worker; it returns indices into mapData, best match first
const results = shallowRef(props.mapData);
let latestSearch = 0;

watch(
  [searchInputDebounce, categoryFilter],
  async ([query]) => {
    const searchId = ++latestSearch;
    const matches = query.trim()
      ? (await search(query)).map((index) => props.mapData[index])
      : props.mapData;
    // Ignore responses that arrive after a newer search was started
    if (searchId === latestSearch) results.value = matches.filter(inCategory);
  },
  { immediate: true },
);

// Must match the row height in the template (h-17 = 68px)
const { list, containerProps, wrapperProps } = useVirtualList(results, {
  itemHeight: 68,
});

const { y: listY } = useScroll(containerProps.ref);

function getCategoryComponent(category) {
  if (category >= 10 && category <= 13) return IconNurnetPlus;
  if (category === 20 || category === 21) return IconDolmen;
  if (category === 30) return IconDomusJanas;
  if (category === 40 || category === 41) return IconVillaggioNuragico;
  if (category >= 50 && category <= 52) return IconCultoAcqua;
  if (category >= 60 && category <= 63) return IconTombaGiganti;
  if (category >= 70 && category <= 73) return IconMenhir;

  return null;
}
</script>

<template>
  <!-- Bottom padding on mobile covers the part of the drawer that sits below the screen -->
  <div
    v-bind="containerProps"
    data-drawer-scroll
    class="scrollbar-hidden h-full overscroll-contain pb-16 lg:pb-4"
  >
    <DrawerHeader :scrolled="listY > 0">
      <BrandButton class="mb-3 hidden !bg-transparent !shadow-none !backdrop-blur-none lg:flex" />

      <div class="flex gap-x-2">
        <div class="relative min-w-0 flex-1">
          <UIcon
            name="i-lucide-search"
            class="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            v-model="searchInput"
            type="search"
            placeholder="Cerca un sito o un comune…"
            aria-label="Cerca un sito o un comune"
            class="w-full rounded-2xl bg-white/80 py-2 pr-3 pl-9 text-slate-700 shadow-sm placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          />
        </div>
        <button
          type="button"
          class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-white/80 text-basalt shadow-sm transition hover:bg-white focus-visible:ring-2 focus-visible:ring-terracotta/60 focus-visible:outline-none active:scale-95"
          aria-label="Mostra un sito a caso"
          title="Mostra un sito a caso"
          @click="openRandomPOI"
        >
          <UIcon name="i-lucide-dices" class="size-5" />
        </button>
      </div>

      <!-- Category filter: also filters the markers on the map. The scroll container clips
           vertically too: py-1 leaves room for the chips' shadow, the margins keep the spacing -->
      <div
        class="scrollbar-hidden -mx-4 mt-1 -mb-1 flex gap-x-2 overflow-x-auto px-4 py-1"
        role="group"
        aria-label="Filtra per tipo"
      >
        <button
          v-for="category in CATEGORY_FILTERS"
          :key="category.name"
          type="button"
          class="shrink-0 cursor-pointer rounded-full px-3 py-1 text-sm font-semibold shadow-sm transition active:scale-95"
          :class="
            categoryFilter === category.name
              ? [useCategoryColor(category.id), 'text-white']
              : 'bg-white/80 text-slate-700 hover:bg-white'
          "
          :aria-pressed="categoryFilter === category.name"
          @click="categoryFilter = categoryFilter === category.name ? null : category.name"
        >
          {{ category.name }}
        </button>
      </div>
    </DrawerHeader>

    <IconNurnetPlus v-if="!results.length" class="mx-auto mt-[30%] h-32 w-32 fill-slate-400/30" />

    <div v-else v-bind="wrapperProps" class="px-4">
      <div v-for="result in list" :key="result.index" class="h-17 pb-2">
        <NuxtLink
          class="flex h-full items-center rounded-2xl bg-slate-200/75 p-2 text-slate-700 shadow-sm backdrop-blur-sm"
          to="/poi"
          @click.prevent="openPOI(result.data)"
        >
          <div class="flex min-w-0 items-center gap-x-2">
            <component
              :is="getCategoryComponent(Number(result.data.category_id))"
              v-if="getCategoryComponent(Number(result.data.category_id))"
              class="h-8 w-8 shrink-0 fill-slate-500"
            />

            <div class="min-w-0">
              <p class="truncate text-base font-bold">
                {{ result.data.name }}
              </p>

              <div class="flex gap-x-2 overflow-hidden whitespace-nowrap text-sm">
                <p v-if="result.data.comune">
                  {{ result.data.comune }}
                </p>
                <p v-if="result.data.localita">
                  {{ result.data.localita }}
                </p>
                <p v-if="result.data.regione">
                  {{ result.data.regione }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
