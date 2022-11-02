<script setup>
import { useFuse } from "@vueuse/integrations/useFuse";

const props = defineProps({
  mapData: {
    type: Object,
    default: () => {
      return { features: [] };
    },
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

const { results } = useFuse(searchInputDebounce, props.mapData?.features, {
  fuseOptions: {
    keys: [
      "properties.name",
      "properties.comune",
      "properties.localita",
      "properties.regione",
    ],
  },
});

const { list, containerProps, wrapperProps } = useVirtualList(results, {
  itemHeight: 96,
});

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
  <div class="m-4 flex h-full flex-col gap-y-4">
    <input
      v-model="searchInput"
      type="text"
      placeholder="Search"
      class="rounded-lg px-2 py-2 focus:outline-none"
    />

    <IconNurnetPlus
      v-if="!results.length > 0"
      class="mt-[30%] mb-auto h-32 w-32 self-center fill-slate-400/30"
    />

    <div v-else v-bind="containerProps" class="scrollbar-hidden h-screen">
      <div v-bind="wrapperProps" class="flex flex-col gap-y-2">
        <NuxtLink
          v-for="result in list"
          :key="result.index"
          class="rounded-lg bg-slate-200/75 p-2 text-slate-700 shadow-sm backdrop-blur"
          to="/poi"
          @click="
            currentPOI = {
              ...result.data.item,
              values_: {
                ...result.data.item.properties,
                geometry: {
                  flatCoordinates: result.data.item.geometry.coordinates,
                },
              },
            }
          "
        >
          <div class="flex items-center gap-x-2">
            <component
              :is="
                getCategoryComponent(
                  Number(result.data.item.properties.category_id)
                )
              "
              v-if="
                getCategoryComponent(
                  Number(result.data.item.properties.category_id)
                )
              "
              class="h-8 w-8 shrink-0 fill-slate-500"
            />

            <div>
              <p class="text-base font-bold">
                {{ result.data.item.properties.name }}
              </p>

              <div class="flex gap-x-2 text-sm">
                <p v-if="result.data.item.properties.comune">
                  {{ result.data.item.properties.comune }}
                </p>
                <p v-if="result.data.item.properties.localita">
                  {{ result.data.item.properties.localita }}
                </p>
                <p v-if="result.data.item.properties.regione">
                  {{ result.data.item.properties.regione }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
