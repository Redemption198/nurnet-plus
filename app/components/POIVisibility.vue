<script setup lang="ts">
// "Visibili da qui": the nuraghi visible from the open one, nearest first, linked to their lines
// on the map, both ways (pointing at a site or a line on the map marks the row). With a mouse,
// hovering a row highlights its line and a click opens the site; on
// touch screens (no hover) the first tap highlights the line and frames it, "Apri" opens the site
const site = useCurrentSite();
const { items, openPOI, retry } = useNurnetData();
// Real links (new tab, copy link, screen readers) whose clicks are handled here: NuxtLink would
// navigate before a @click.prevent could stop it
const router = useRouter();
const siteHref = (id: string) => router.resolve(`/poi/${id}`).href;
const fitPoints = useFitPoints();
const highlighted = useHighlightedVisible();
const canHover = useMediaQuery("(hover: hover)");
const isDark = useIsDark();

// Nearest first; long lists (up to ~90) start short
const SHORT_LIST = 6;
const showAll = ref(false);
watch(
  () => site.value?.content_id,
  () => {
    showAll.value = false;
    highlighted.value = null;
  },
);
onUnmounted(() => (highlighted.value = null));

const visible = computed(() =>
  (site.value?.visible ?? []).flatMap((entry) => {
    const poi = items.value?.[entry.i];
    return poi ? [{ ...entry, poi, level: VISIBILITY_LEVELS[visibilityLevel(entry.height)]! }] : [];
  }),
);
const shown = computed(() => (showAll.value ? visible.value : visible.value.slice(0, SHORT_LIST)));
// Pointing at a site or its line on the map marks its row: show the whole list if it's further down
watch(highlighted, (i) => {
  if (i !== null && !shown.value.some((entry) => entry.i === i)) showAll.value = true;
});

// The open nuraghe and all the sites it can see, framed on the map
function showOnMap() {
  if (!site.value) return;
  fitPoints([site.value.coordinates, ...visible.value.map((entry) => entry.poi.coordinates)], true);
}

type Entry = (typeof visible.value)[number];

function onRowClick(entry: Entry) {
  if (canHover.value || highlighted.value === entry.i) {
    openPOI(entry.poi);
    return;
  }
  // Touch: show this line first, keeping the list where it is
  highlighted.value = entry.i;
  if (site.value) fitPoints([site.value.coordinates, entry.poi.coordinates], false);
}

const onPointer = (event: PointerEvent, value: number | null) => {
  if (event.pointerType === "mouse") highlighted.value = value;
};

// Keyboard focus highlights too; a tap also focuses the row, but that's handled by the click
let focusHighlight = false;
function onFocus(event: FocusEvent, value: number) {
  if (!(event.target as HTMLElement).matches(":focus-visible")) return;
  focusHighlight = true;
  highlighted.value = value;
}
function onBlur() {
  if (!focusHighlight) return;
  focusHighlight = false;
  highlighted.value = null;
}
</script>

<template>
  <section
    v-if="site && site.visibleStatus !== 'none'"
    class="flex flex-col gap-y-1 px-4"
    aria-labelledby="poi-visibility"
  >
    <div class="flex items-center justify-between gap-x-2">
      <h3 id="poi-visibility" class="text-base font-semibold text-basalt">
        Visibili da qui<span v-if="visible.length" class="font-normal text-muted">
          · {{ visible.length }}</span
        >
      </h3>
      <button
        v-if="visible.length"
        type="button"
        class="-mr-2 inline-flex min-h-11 items-center gap-x-1.5 rounded-full px-3 text-sm font-semibold text-terracotta-dark transition hover:bg-terracotta/10 press"
        @click="showOnMap"
      >
        <UIcon name="i-lucide-map" class="size-4" aria-hidden="true" />
        Mostra sulla mappa
      </button>
    </div>

    <div
      v-if="site.visibleStatus === 'loading'"
      class="flex flex-col"
      role="status"
      aria-label="Caricamento dei siti visibili"
    >
      <div v-for="n in 3" :key="n" class="flex items-center gap-x-3 border-t border-line py-3">
        <div class="size-6 animate-pulse rounded-full bg-well" />
        <div class="h-4 flex-1 animate-pulse rounded-full bg-well" />
      </div>
    </div>

    <div
      v-else-if="site.visibleStatus === 'error'"
      class="flex items-center gap-x-3 text-sm text-muted"
    >
      <p class="flex-1">Le linee di vista non si sono caricate.</p>
      <UButton color="neutral" variant="soft" icon="i-lucide-rotate-cw" @click="retry">
        Riprova
      </UButton>
    </div>

    <p v-else-if="!visible.length" class="text-sm text-muted">
      Secondo il modello del terreno, da qui non si vede nessun altro nuraghe.
    </p>

    <template v-else>
      <p v-if="!canHover" class="text-xs text-muted">
        Tocca un nuraghe per vederne la linea sulla mappa.
      </p>
      <ul class="flex flex-col">
        <li
          v-for="entry in shown"
          :key="entry.i"
          class="flex items-center border-t border-line transition-colors"
          :class="{ 'bg-basalt/5': highlighted === entry.i }"
        >
          <a
            :href="siteHref(entry.poi.content_id)"
            class="-mx-2 flex min-h-14 min-w-0 flex-1 items-center gap-x-3 rounded-xl px-2 py-2 text-basalt"
            :aria-current="highlighted === entry.i ? 'true' : undefined"
            @click.prevent="onRowClick(entry)"
            @pointerenter="onPointer($event, entry.i)"
            @pointerleave="onPointer($event, null)"
            @focus="onFocus($event, entry.i)"
            @blur="onBlur"
          >
            <CategoryIcon :category-id="entry.poi.category_id" class="size-6 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-[0.9375rem] font-semibold">{{ entry.poi.name }}</p>
              <p class="truncate text-xs text-muted">
                {{ formatDistance(entry.distance)
                }}<template v-if="entry.poi.comune"> · {{ entry.poi.comune }}</template>
              </p>
            </div>
            <div
              class="flex w-24 shrink-0 flex-col items-end gap-y-1"
              :title="`${entry.height.toLocaleString('it-IT', { maximumFractionDigits: 1 })} m su 15`"
            >
              <span class="text-xs font-semibold text-muted">{{ entry.level.label }}</span>
              <span class="h-1.5 w-full overflow-hidden rounded-full bg-well" aria-hidden="true">
                <span
                  class="block h-full rounded-full"
                  :style="{
                    width: `${(entry.height / 15) * 100}%`,
                    backgroundColor: isDark ? entry.level.darkColor : entry.level.color,
                  }"
                />
              </span>
            </div>
          </a>
          <a
            v-if="!canHover && highlighted === entry.i"
            :href="siteHref(entry.poi.content_id)"
            class="ml-2 inline-flex min-h-11 items-center gap-x-0.5 rounded-full bg-terracotta px-3 text-sm font-semibold text-white"
            @click.prevent="openPOI(entry.poi)"
          >
            Apri<UIcon name="i-lucide-chevron-right" class="size-4" aria-hidden="true" />
          </a>
        </li>
      </ul>

      <button
        v-if="visible.length > SHORT_LIST"
        type="button"
        class="inline-flex min-h-11 items-center gap-x-1 self-start text-sm font-semibold text-terracotta-dark"
        :aria-expanded="showAll"
        @click="showAll = !showAll"
      >
        {{ showAll ? "Mostra meno" : `Mostra tutti (${visible.length})` }}
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 transition-transform"
          :class="{ 'rotate-180': showAll }"
          aria-hidden="true"
        />
      </button>

      <p class="max-w-[60ch] text-xs text-pretty text-muted">
        Linee di vista calcolate da CRS4 per NurNet sul modello del terreno: quanto si vede delle
        torri (alte 15 m nel modello) l'una dall'altra.
      </p>
    </template>
  </section>
</template>
