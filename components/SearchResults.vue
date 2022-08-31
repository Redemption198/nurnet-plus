<script setup>
import { useFuse } from "@vueuse/integrations/useFuse";

const props = defineProps({
  mapData: {
    type: Object,
    default: () => {},
  },
});

const currentPOI = useCurrentPOI();

function getCategoryName(category) {
  if (category >= 10 && category <= 13) return "Nuraghe";
  if (category === 20 || category === 21) return "Dolmen";
  if (category === 30) return "Domus de janas";
  if (category === 40 || category === 41) return "Villaggi";
  if (category >= 50 && category <= 52) return "Culto dell'acqua";
  if (category >= 60 && category <= 63) return "Tombe dei giganti";
  if (category >= 70 && category <= 73) return "Menhir";
  if (category === 110 || category === 101) return "Unicum e Grotte Tafoni";
  return "Sconosciuto";
}

const searchInput = ref("");
const searchInputDebounce = refDebounced(searchInput, 500);

const { results } = useFuse(searchInputDebounce, props.mapData.features, {
  fuseOptions: {
    keys: [
      "properties.comune",
      "properties.name",
      "properties.localita",
      "properties.regione",
    ],
  },
});

const { list, containerProps, wrapperProps } = useVirtualList(results, {
  itemHeight: 96,
});
</script>

<template>
  <div class="m-4 flex flex-col gap-y-4">
    <input
      v-model="searchInput"
      type="text"
      placeholder="Search"
      class="rounded-lg px-2 py-2 focus:outline-none"
    />

    <div v-bind="containerProps" class="h-screen">
      <div v-bind="wrapperProps" class="flex flex-col gap-y-2">
        <NuxtLink
          v-for="result in list"
          :key="result.index"
          class="rounded-lg bg-slate-200/75 p-2 text-slate-800 backdrop-blur"
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
          <p class="text-lg font-bold">
            {{ result.data.item.properties.name }}
          </p>

          <p>
            {{ getCategoryName(result.data.item.properties.category) }}
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
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
