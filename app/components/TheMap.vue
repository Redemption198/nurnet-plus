<script setup>
import { MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre looks for its worker next to its own module, which bundling moves: point to it
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

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
const mapFitBounds = useMapFitBounds();

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

// The basemap's own regular font for our labels (OpenFreeMap serves the glyphs for it)
function labelFont(ml) {
  const font = ml
    .getStyle()
    .layers.map((layer) => layer.layout?.["text-font"])
    .find(
      (value) =>
        Array.isArray(value) &&
        value.every((part) => typeof part === "string") &&
        /Regular/.test(value[0]),
    );
  return font ?? ["Noto Sans Regular"];
}

// Names under the markers once zoomed in; a name only shows where it fits
function labelLayout(ml, fromZoom) {
  return {
    "text-field": ["step", ["zoom"], "", fromZoom, ["get", "name"]],
    "text-font": labelFont(ml),
    "text-size": 12,
    "text-anchor": "top",
    "text-offset": [0, 0.3],
    "text-max-width": 9,
    "text-optional": true,
  };
}
const LABEL_PAINT = {
  "text-color": "#312528",
  "text-halo-color": "rgba(255, 255, 255, 0.9)",
  "text-halo-width": 1.5,
};

function addPois(ml) {
  ml.addSource("pois", {
    type: "geojson",
    // Only what the map needs; the full POI comes from props.pois via its index
    data: {
      type: "FeatureCollection",
      features: props.pois.map((poi, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: poi.coordinates },
        properties: { i, content_id: poi.content_id, category_id: poi.category_id, name: poi.name },
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
      ...labelLayout(ml, 12.5),
    },
    paint: LABEL_PAINT,
  });

  // The selected POI, drawn again bigger and always visible, with its name a bit earlier
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
      ...labelLayout(ml, 11),
      "text-size": 13,
    },
    paint: LABEL_PAINT,
  });
}

// Lines of sight from the open nuraghe to the sites it can see (none on the list): in mid-air
// between the tops of the towers (sightLinesLayer), plus a dot on the ground at each end, as the
// markers there may be hidden where they overlap
const TOWER_HEIGHT = 15; // metres, as in CRS4's model
const sightLines = createSightLinesLayer("sight-lines");
const highlighted = useHighlightedVisible();

function visibleSites() {
  const visible = route.path === "/" ? [] : (currentPOI.value.values_?.visible ?? []);
  return visible.filter((site) => props.pois[site.i]);
}

function visibilityEnds() {
  return {
    type: "FeatureCollection",
    features: visibleSites().map((site) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: props.pois[site.i].coordinates },
      properties: {
        i: site.i,
        name: props.pois[site.i].name,
        color: VISIBILITY_LEVELS[visibilityLevel(site.height)].color,
      },
    })),
  };
}

// Ground height as drawn: the terrain where its tiles are loaded, else the site's elevation, both
// with the terrain's exaggeration. Returns whether the terrain was used
function groundAt(ml, coordinates, elevation) {
  const terrain = ml.queryTerrainElevation(coordinates);
  if (terrain != null) return { height: terrain, exact: true };
  const exaggeration = ml.getTerrain()?.exaggeration ?? 1;
  return { height: (elevation ?? 0) * exaggeration, exact: false };
}

// Towers placed on the terrain (rather than on their elevation) in the last update
let exactTowers = 0;
let approximateTowers = 0;
function updateSightLines() {
  const ml = mlMap.value;
  if (!ml) return;
  ml.getSource("visibility")?.setData(visibilityEnds());

  const poi = currentPOI.value.values_;
  const sites = visibleSites();
  const tower = TOWER_HEIGHT * (ml.getTerrain()?.exaggeration ?? 1);
  exactTowers = approximateTowers = 0;
  const towerAt = (coordinates, elevation) => {
    const ground = groundAt(ml, coordinates, elevation);
    if (ground.exact) exactTowers++;
    else approximateTowers++;
    return { at: coordinates, ground: ground.height, top: ground.height + tower };
  };
  if (!sites.length) return sightLines.setData([], []);

  const origin = towerAt(poi.coordinates, poi.elevation);
  const towers = [origin];
  const lines = sites.map((site) => {
    const end = towerAt(props.pois[site.i].coordinates, site.elevation);
    towers.push(end);
    return {
      from: [...origin.at, origin.top],
      to: [...end.at, end.top],
      level: visibilityLevel(site.height),
      id: site.i,
    };
  });
  sightLines.setData(lines, towers);
}

function applyHighlight() {
  const id = highlighted.value ?? -1;
  sightLines.setHighlight(highlighted.value);
  const filter = ["==", ["get", "i"], id];
  for (const layer of ["visibility-highlight", "visibility-highlight-label"])
    if (mlMap.value?.getLayer(layer)) mlMap.value.setFilter(layer, filter);
}

function addSightLines(ml) {
  ml.addSource("visibility", { type: "geojson", data: visibilityEnds() });
  // All under the markers
  ml.addLayer(sightLines, "pois");
  ml.addLayer(
    {
      id: "visibility-ends",
      type: "circle",
      source: "visibility",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 14, 4.5],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1.5,
        "circle-pitch-alignment": "map",
      },
    },
    "pois",
  );
  // The site hovered in the list: a bigger dot and its name, above everything
  ml.addLayer({
    id: "visibility-highlight",
    type: "circle",
    source: "visibility",
    filter: ["==", ["get", "i"], -1],
    paint: {
      "circle-radius": 7,
      "circle-color": "#312528",
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2.5,
      "circle-pitch-alignment": "map",
    },
  });
  ml.addLayer({
    id: "visibility-highlight-label",
    type: "symbol",
    source: "visibility",
    filter: ["==", ["get", "i"], -1],
    layout: {
      "text-field": ["get", "name"],
      "text-font": labelFont(ml),
      "text-size": 13,
      "text-anchor": "bottom",
      "text-offset": [0, -0.9],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { ...LABEL_PAINT, "text-halo-width": 2 },
  });

  // Where the terrain wasn't loaded yet, redo the heights once more of it is (only then: an
  // update repaints, which would otherwise end in "idle" again)
  ml.on("idle", () => {
    if (!approximateTowers) return;
    const sites = visibleSites();
    const poi = currentPOI.value.values_;
    const points = [poi?.coordinates, ...sites.map((site) => props.pois[site.i].coordinates)];
    const exactNow = points.filter((p) => p && ml.queryTerrainElevation(p) != null).length;
    if (exactNow > exactTowers) updateSightLines();
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
  // Changing the padding is a camera move: it would cancel the inertia of a pan in progress (the
  // drawer collapses as soon as the user pans), so wait for the map to stop. It is applied without
  // moving what is on screen: the point now in the middle of the new visible area becomes the centre
  watch(mapPadding, () => {
    const ml = mlMap.value;
    if (!ml) return;
    const apply = () => {
      const padding = toMapPadding(mapPadding.value);
      const { width, height } = ml.getContainer().getBoundingClientRect();
      const center = ml.unproject([
        (padding.left + width - padding.right) / 2,
        (padding.top + height - padding.bottom) / 2,
      ]);
      ml.jumpTo({ center, padding });
    };
    if (ml.isMoving()) ml.once("moveend", apply);
    else apply();
  });

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

  // The lines follow the open nuraghe once its line-of-sight data arrives, and go on the list
  watch(
    [
      () => currentPOI.value.values_?.visible,
      () => currentPOI.value.values_?.elevation,
      () => route.path,
    ],
    updateSightLines,
  );
  watch(highlighted, applyHighlight);

  // "Mostra sulla mappa": frame the requested area in the part the drawer leaves visible
  watch(mapFitBounds, async (bounds) => {
    if (!bounds || !mlMap.value) return;
    mapFitBounds.value = null;
    // Lower the drawer (mobile); it reports the new padding as it starts moving
    drawerState.value.setPosition = "SET_DRAWER_ON_BOTTOM_SCREEN";
    await nextTick();
    mlMap.value.fitBounds(bounds, {
      // On top of the map's own padding (the drawer's area), which fitBounds adds itself
      padding: 48,
      maxZoom: 14,
      duration: 1200,
      essential: true,
    });
  });

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
      // A longer glide after a fling, closer to iOS maps (MapLibre's default deceleration is 2500)
      dragPan: { linearity: 0.3, maxSpeed: 2000, deceleration: 1800 },
      // The map credits (OpenFreeMap, OpenMapTiles, OpenStreetMap, Terrain Tiles) are in the
      // "Informazioni" sheet, opened from the NurNet+ (i) button on the map / top of the drawer
      attributionControl: false,
    });
  } catch (error) {
    // e.g. WebGL is unavailable or disabled
    console.error("Map unavailable:", error);
    mapUnavailable.value = true;
    return;
  }
  mlMap.value = ml;

  ml.on("load", async () => {
    await addIcons(ml);
    warmBasemap(ml);
    addTerrain(ml);
    addPois(ml);
    addSightLines(ml);

    // A site opened from its URL before the map was ready
    if (route.path !== "/" && currentPOI.value.values_) focusSelectedPOI();

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
