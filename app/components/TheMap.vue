<script setup>
import { MapLibreMap, AttributionControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre looks for its worker next to its own module, which bundling moves: point to it
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { breakpointsTailwind } from "@vueuse/core";

setWorkerUrl(workerUrl);

const props = defineProps({
  pois: {
    type: Array,
    default: () => [],
  },
});

const route = useRoute();
const config = useRuntimeConfig();

const currentPOI = useCurrentPOI();
const { openPOI } = useNurnetData();
const drawerState = useDrawerState();
const mapPadding = useMapPadding();
const categoryFilter = useCategoryFilter();
const lgAndGreater = useBreakpoints(breakpointsTailwind).greaterOrEqual("lg");

const map = ref();
// shallowRef: MapLibre's map must not be wrapped in a deep reactive proxy
const mlMap = shallowRef();
const is3D = ref(false);
const mapUnavailable = ref(false);

// Free sources, no API keys: OpenFreeMap vector tiles and the AWS Terrain Tiles dataset
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const TERRAIN_TILES = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";
const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain Tiles</a>';

// icons-tileset.png is one row of 64px tiles, in this order
const ICONS = ["dolmen", "domus", "tomba", "menhir", "villaggio", "acqua", "nuraghe", "unknown"];

// category_id -> icon name ("unknown" for anything else)
const iconForCategory = [
  "match",
  ["get", "category_id"],
  ["70", "71", "72", "73"],
  "menhir",
  "30",
  "domus",
  ["60", "61", "62", "63"],
  "tomba",
  ["20", "21"],
  "dolmen",
  ["40", "41"],
  "villaggio",
  ["50", "51", "52"],
  "acqua",
  ["10", "11", "12", "13"],
  "nuraghe",
  "unknown",
];

async function addIcons(ml) {
  const image = new Image();
  image.src = `${config.app.baseURL}icons-tileset.png`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  ICONS.forEach((name, i) => {
    context.clearRect(0, 0, 64, 64);
    context.drawImage(image, i * 64, 0, 64, 64, 0, 0, 64, 64);
    // pixelRatio 2: the 64px tiles are drawn at 32 css px, so they stay sharp on retina
    ml.addImage(name, context.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
  });
}

// Recolour the basemap toward Sardinia: limestone ground, a muted sea, macchia greens.
// Layer ids are from OpenFreeMap's "liberty" style; missing ones are skipped
const BASEMAP_COLORS = {
  background: ["background-color", "#f1e9dc"],
  water: ["fill-color", "#9ec5d6"],
  park: ["fill-color", "#d6dfbf"],
  landcover_wood: ["fill-color", "hsla(90, 28%, 60%, 0.55)"],
  landcover_grass: ["fill-color", "#d3dbb4"],
  landcover_sand: ["fill-color", "#f2e3c4"],
};

function warmBasemap(ml) {
  for (const [layer, [property, color]] of Object.entries(BASEMAP_COLORS)) {
    if (ml.getLayer(layer)) ml.setPaintProperty(layer, property, color);
  }
}

function addTerrain(ml) {
  // Separate sources for terrain and hillshade, as MapLibre recommends
  for (const id of ["terrain", "hillshade"]) {
    ml.addSource(id, {
      type: "raster-dem",
      tiles: [TERRAIN_TILES],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 14,
      attribution: TERRAIN_ATTRIBUTION,
    });
  }

  // Hillshading goes under the first label layer so text stays on top
  const firstSymbolLayer = ml.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  ml.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "hillshade",
      paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#47515f" },
    },
    firstSymbolLayer,
  );

  // Exaggerated a bit: Sardinia's relief is gentle and would look flat at 1x
  ml.setTerrain({ source: "terrain", exaggeration: 1.5 });
  ml.setSky({
    "sky-color": "#a8d4f5",
    "horizon-color": "#e2e8f0",
    "sky-horizon-blend": 0.5,
    "horizon-fog-blend": 0.6,
    "fog-color": "#e2e8f0",
    "fog-ground-blend": 0.4,
  });
}

// The selected POI's layer shows only the POI open in the drawer (none on the list)
function selectedFilter() {
  const id = route.path === "/" ? "" : (currentPOI.value.values_?.content_id ?? "");
  return ["==", ["get", "content_id"], id];
}

// The layer only exists once the style has loaded; addPois applies the filter itself
function applySelection() {
  if (mlMap.value?.getLayer("poi-selected"))
    mlMap.value.setFilter("poi-selected", selectedFilter());
}

// Markers of the category chosen in the drawer (all when none): match the category_id values
// that belong to it. to-string turns a missing category into "", which counts as "Sconosciuto"
function categoryLayerFilter() {
  if (!categoryFilter.value) return null;
  const ids = new Set(
    props.pois
      .filter((poi) => useCategoryName(Number(poi.category_id)) === categoryFilter.value)
      .map((poi) => poi.category_id ?? ""),
  );
  return ["in", ["to-string", ["get", "category_id"]], ["literal", [...ids]]];
}

function addPois(ml) {
  ml.addSource("pois", {
    type: "geojson",
    // Only what the map needs; the full POI comes from props.pois via its index
    data: {
      type: "FeatureCollection",
      features: props.pois.map((poi, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: poi.coordinates },
        properties: { i, content_id: poi.content_id, category_id: poi.category_id },
      })),
    },
  });

  ml.addLayer({
    id: "pois",
    type: "symbol",
    source: "pois",
    // addLayer rejects `filter: null` (setFilter accepts it), so only pass one when set
    ...(categoryFilter.value && { filter: categoryLayerFilter() }),
    layout: {
      "icon-image": iconForCategory,
      "icon-anchor": "bottom",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 13, 0.75, 16, 0.9],
      // Overlapping icons are hidden while zoomed out and come back when zooming in
      "icon-padding": 0,
    },
  });

  // The selected POI, drawn again bigger and always visible
  ml.addLayer({
    id: "poi-selected",
    type: "symbol",
    source: "pois",
    filter: selectedFilter(),
    layout: {
      "icon-image": iconForCategory,
      "icon-anchor": "bottom",
      "icon-size": 1.3,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
}

function toMapPadding([top, right, bottom, left]) {
  return { top, right, bottom, left };
}

function focusSelectedPOI() {
  const coordinates = currentPOI.value.values_?.geometry?.flatCoordinates;
  if (!coordinates || !mlMap.value) return;

  mlMap.value.flyTo({
    center: [coordinates[0], coordinates[1]],
    zoom: Math.max(mlMap.value.getZoom(), 13.5),
    pitch: is3D.value ? 60 : 0,
    padding: toMapPadding(mapPadding.value),
    duration: 1400,
    essential: true,
  });
}

function toggle3D() {
  is3D.value = !is3D.value;
  mlMap.value.easeTo({
    pitch: is3D.value ? 60 : 0,
    bearing: is3D.value ? mlMap.value.getBearing() : 0,
    duration: 800,
  });
}

onMounted(() => {
  // Registered first: the drawer still reacts to selections if the map can't be created
  watch(mapPadding, (padding) => mlMap.value?.setPadding(toMapPadding(padding)));

  // The id, not the object: the POI's details are merged in later and must not re-trigger this
  watch(
    () => currentPOI.value.values_?.content_id,
    async () => {
      applySelection();

      // Raise the drawer to the middle on mobile (ignored on desktop), then center the POI
      // in the area left visible, once the drawer has reported its new size
      drawerState.value.setPosition = "SET_DRAWER_ON_MIDDLE_SCREEN";
      await nextTick();
      focusSelectedPOI();
    },
  );

  watch(() => route.path, applySelection);

  watch(categoryFilter, () => {
    if (mlMap.value?.getLayer("pois")) mlMap.value.setFilter("pois", categoryLayerFilter());
  });

  let ml;
  try {
    ml = new MapLibreMap({
      container: map.value,
      style: STYLE_URL,
      // Sardinia, framed in the area the drawer leaves visible
      bounds: [
        [8.1, 38.85],
        [9.85, 41.3],
      ],
      fitBoundsOptions: { padding: toMapPadding(mapPadding.value.map((p) => p + 24)) },
      maxPitch: 75,
      attributionControl: false,
    });
  } catch (error) {
    // e.g. WebGL is unavailable or disabled
    console.error("Map unavailable:", error);
    mapUnavailable.value = true;
    return;
  }
  mlMap.value = ml;

  // Attribution is required by the tile providers: keep it where the drawer doesn't cover it.
  // On mobile it starts collapsed to the (i) button, so it doesn't cover the top of the map
  ml.addControl(
    new AttributionControl({ compact: true }),
    lgAndGreater.value ? "bottom-right" : "top-left",
  );
  if (!lgAndGreater.value) {
    ml.once("load", () => {
      map.value
        .querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
    });
  }

  ml.on("load", async () => {
    await addIcons(ml);
    warmBasemap(ml);
    addTerrain(ml);
    addPois(ml);

    for (const layer of ["pois", "poi-selected"]) {
      ml.on("mouseenter", layer, () => (ml.getCanvas().style.cursor = "pointer"));
      ml.on("mouseleave", layer, () => (ml.getCanvas().style.cursor = ""));
    }

    ml.on("click", ["poi-selected", "pois"], (event) => {
      openPOI(props.pois[event.features[0].properties.i]);
    });
  });

  // Collapse the drawer when the user pans or pinches the map, not on programmatic moves
  ml.on("movestart", (event) => {
    if (event.originalEvent && drawerState.value.currentPosition !== "DRAWER_ON_BOTTOM_SCREEN") {
      drawerState.value.setPosition = "SET_DRAWER_ON_BOTTOM_SCREEN";
    }
  });
});

onUnmounted(() => mlMap.value?.remove());
</script>

<template>
  <div ref="map" class="h-screen w-screen"></div>

  <p
    v-if="mapUnavailable"
    class="absolute inset-x-4 top-4 z-1 rounded-2xl bg-slate-100 p-4 text-center text-sm font-semibold text-slate-700 shadow-sm lg:left-auto lg:w-96"
  >
    La mappa non è disponibile su questo dispositivo (WebGL non supportato), ma puoi cercare e
    consultare i siti dalla lista.
  </p>

  <div
    v-if="!mapUnavailable"
    class="absolute top-0 right-0 z-1 m-4 flex flex-col items-center overflow-hidden rounded-2xl bg-slate-200/75 shadow-md backdrop-blur-2xl"
  >
    <MapControlsButton class="p-3" aria-label="Ingrandisci" @click.prevent="mlMap.zoomIn()">
      <IconPlus class="h-6 w-6" />
    </MapControlsButton>

    <MapControlsButton class="p-3" aria-label="Riduci" @click.prevent="mlMap.zoomOut()">
      <IconMinus class="h-6 w-6" />
    </MapControlsButton>

    <MapControlsButton
      class="h-12 w-12 text-sm font-bold text-slate-600"
      :aria-label="is3D ? 'Vista 2D' : 'Vista 3D'"
      :aria-pressed="is3D"
      @click.prevent="toggle3D()"
    >
      {{ is3D ? "2D" : "3D" }}
    </MapControlsButton>
  </div>
</template>

<style>
/* Mobile: the attribution button sits under the NurNet+ logo pill */
@media (width < 64rem) {
  .maplibregl-ctrl-top-left {
    top: 3.75rem;
  }
}
</style>
