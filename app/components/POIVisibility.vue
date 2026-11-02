<script setup>
const currentPOI = useCurrentPOI();
const { items, openPOI } = useNurnetData();
const mapFitBounds = useMapFitBounds();

// Nearest first; long lists (up to ~90) start short
const SHORT_LIST = 6;
const showAll = ref(false);
watch(
  () => currentPOI.value.values_?.content_id,
  () => (showAll.value = false),
);

const visible = computed(() =>
  (currentPOI.value.values_?.visible ?? [])
    .map((site) => ({ ...site, poi: items.value?.[site.i] }))
    .filter((site) => site.poi),
);
const shown = computed(() => (showAll.value ? visible.value : visible.value.slice(0, SHORT_LIST)));

// "850 m" up to a kilometre, then "4,2 km"
function formatDistance(metres) {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

const levelOf = (height) => VISIBILITY_LEVELS[visibilityLevel(height)];

// Hovering or focusing a row highlights its line on the map
const highlighted = useHighlightedVisible();
onUnmounted(() => (highlighted.value = null));

// The open nuraghe and all the sites it can see, framed on the map
function showOnMap() {
  const points = [
    currentPOI.value.values_.coordinates,
    ...visible.value.map((site) => site.poi.coordinates),
  ];
  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);
  mapFitBounds.value = [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}
</script>

<template>
  <section
    v-if="currentPOI.values_.visibleStatus && currentPOI.values_.visibleStatus !== 'none'"
    class="mx-4 flex flex-col gap-y-2"
    aria-labelledby="poi-visibility"
  >
    <div class="flex items-center justify-between gap-x-2">
      <h3 id="poi-visibility" class="text-sm font-semibold text-slate-700">
        Visibili da qui<span v-if="visible.length"> ({{ visible.length }})</span>
      </h3>
      <button
        v-if="visible.length"
        type="button"
        class="flex items-center gap-x-1 rounded-full px-2 py-1 text-sm font-semibold text-terracotta-dark transition hover:bg-terracotta/10 active:scale-95"
        @click="showOnMap"
      >
        <UIcon name="i-lucide-map" class="size-4" />
        Mostra sulla mappa
      </button>
    </div>

    <div
      v-if="currentPOI.values_.visibleStatus === 'loading'"
      class="flex animate-pulse flex-col gap-y-2"
      role="status"
      aria-label="Caricamento dei siti visibili"
    >
      <div v-for="n in 3" :key="n" class="h-15 rounded-2xl bg-slate-300/60" />
    </div>

    <p v-else-if="currentPOI.values_.visibleStatus === 'error'" class="text-sm text-slate-600">
      Le linee di vista non sono disponibili al momento. Controlla la connessione e riprova.
    </p>

    <p v-else-if="!visible.length" class="text-sm text-slate-600">
      Nessun altro nuraghe è visibile da qui secondo il modello del terreno.
    </p>

    <template v-else>
      <ul class="flex flex-col gap-y-2">
        <li v-for="site in shown" :key="site.i">
          <NuxtLink
            :to="`/poi/${site.poi.content_id}`"
            class="flex items-center gap-x-2 rounded-2xl bg-white/60 p-2 text-slate-700 shadow-sm transition active:scale-[0.98]"
            @click.prevent="openPOI(site.poi)"
            @pointerenter="highlighted = site.i"
            @pointerleave="highlighted = null"
            @focus="highlighted = site.i"
            @blur="highlighted = null"
          >
            <IconNurnetPlus
              class="size-7 shrink-0"
              :style="{ fill: useCategoryHex(Number(site.poi.category_id)) }"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-basalt">{{ site.poi.name }}</p>
              <p class="truncate text-xs">
                {{ formatDistance(site.distance)
                }}<template v-if="site.poi.comune"> · {{ site.poi.comune }}</template>
              </p>
            </div>
            <div
              class="flex w-24 shrink-0 flex-col items-end gap-y-1"
              :title="`${site.height.toLocaleString('it-IT', { maximumFractionDigits: 1 })} m su 15`"
            >
              <span class="text-xs font-semibold">{{ levelOf(site.height).label }}</span>
              <span
                class="h-1.5 w-full overflow-hidden rounded-full bg-slate-300/70"
                aria-hidden="true"
              >
                <span
                  class="block h-full rounded-full"
                  :style="{
                    width: `${(site.height / 15) * 100}%`,
                    backgroundColor: levelOf(site.height).color,
                  }"
                />
              </span>
            </div>
          </NuxtLink>
        </li>
      </ul>

      <button
        v-if="visible.length > SHORT_LIST"
        type="button"
        class="self-center rounded-full px-3 py-1 text-sm font-semibold text-terracotta-dark transition hover:bg-terracotta/10 active:scale-95"
        :aria-expanded="showAll"
        @click="showAll = !showAll"
      >
        {{ showAll ? "Mostra meno" : `Mostra tutti (${visible.length})` }}
      </button>

      <p class="text-xs text-slate-600">
        Linee di vista calcolate da CRS4 per NurNet sul modello del terreno: quanto si vede delle
        torri (alte 15 m nel modello) l'una dall'altra.
      </p>
    </template>
  </section>
</template>
