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

const currentPOI = useCurrentPOI();

const searchInput = ref("");
const searchInputDebounce = refDebounced(searchInput, 500);

// Searching runs in the data worker; it returns indices into mapData
const { search } = useNurnetData();
const results = shallowRef(props.mapData);
let latestSearch = 0;

watch(searchInputDebounce, async (query) => {
  const searchId = ++latestSearch;
  const matches = query
    ? (await search(query)).map((index) => props.mapData[index])
    : props.mapData;
  // Ignore responses that arrive after a newer search was started
  if (searchId === latestSearch) results.value = matches;
});

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
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search"
        class="w-full rounded-2xl bg-white/80 px-3 py-2 text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none"
      />
    </DrawerHeader>

    <IconNurnetPlus v-if="!results.length" class="mx-auto mt-[30%] h-32 w-32 fill-slate-400/30" />

    <div v-else v-bind="wrapperProps" class="px-4">
      <div v-for="result in list" :key="result.index" class="h-17 pb-2">
        <NuxtLink
          class="flex h-full items-center rounded-2xl bg-slate-200/75 p-2 text-slate-700 shadow-sm backdrop-blur-sm"
          to="/poi"
          @click="
            currentPOI = {
              values_: {
                ...result.data,
                geometry: {
                  flatCoordinates: result.data.coordinates,
                },
              },
            }
          "
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
