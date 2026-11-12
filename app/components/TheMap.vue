<script setup lang="ts">
import { MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre looks for its worker next to its own module, which bundling moves: point to it
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);

const props = defineProps<{ pois: NurnetPOI[] }>();

const route = useRoute();
const isHome = useIsHome();
const { t, locale } = useI18n();

const site = useCurrentSite();
const { openPOI, prefetchDetails } = useNurnetData();
const drawerState = useDrawerState();
const mapPadding = useMapPadding();
const mapView = useMapView();
const highlighted = useHighlightedVisible();
const hovered = useHoveredSite();

const map = useTemplateRef("map");
// shallowRef: MapLibre's map must not be wrapped in a deep reactive proxy. Provided to the
// components inside (useMap)
const mlMap = shallowRef<MapLibreMap>();
provideMap(mlMap);
const is3D = ref(false);
const mapUnavailable = ref(false);
// The basemap couldn't be loaded (no connection): the list still works
const mapOffline = ref(false);

const isDark = useIsDark();
const styleUrl = () => STYLE_URLS[isDark.value ? "dark" : "light"];

// The map's parts: the lines of sight, the sites' markers (in focus: the open nuraghe's network)
// and the camera's framing
const pois = () => props.pois;
const sightLines = useSightLines(mlMap, pois);
const sites = useMapSites(mlMap, pois, () => sightLines.visibleSites().map((entry) => entry.i));
const {
  toMapPadding,
  applyPadding,
  forgetFraming,
  zoomBy,
  showOpenedSite,
  flyToVisitor,
  cameraForTilt,
} = useMapCamera(mlMap, pois, is3D);

let stopWatchingResolution: (() => void) | undefined;
// What the map sets up outside the component's own lifetime (after its "load", in callbacks), to
// undo on unmount: the watchers in `lateEffects`, the listeners and fetches tied to `teardown`
const lateEffects = effectScope();
const teardown = new AbortController();

// The visitor's position (MapControls): a dot on the map, and the map flies there
function showLocation(here: [number, number]) {
  if (!mlMap.value) return;
  showVisitorDot(mlMap.value, here);
  void flyToVisitor(here);
}

// What the mouse is over on the map, reflected in the drawer:
// - a marker: drawn bigger with its name, and its row in the list marked (useHoveredSite)
// - on an open nuraghe, a site it sees or that site's line of sight: the line and the row in
//   "Visibili da qui" (useHighlightedVisible), as hovering the row does
// Only what this set is cleared, so it doesn't fight the drawer's own hovering
let pointedSite = false;
let pointedLine = false;
function pointAt(ml: MapLibreMap, point: { x: number; y: number } | null) {
  if (!ml.getLayer("pois")) return;
  const feature = point
    ? ml.queryRenderedFeatures([point.x, point.y], { layers: ["poi-selected", "pois"] })[0]
    : undefined;
  const i = feature ? Number(feature.properties.i) : null;
  // The open site's own pin already shows its name
  const marker = feature?.layer.id === "poi-selected" ? null : i;
  if (marker !== null) {
    hovered.value = marker;
    pointedSite = true;
  } else if (pointedSite) {
    hovered.value = null;
    pointedSite = false;
  }

  const network = new Set(sightLines.visibleSites().map((entry) => entry.i));
  let line = i !== null && network.has(i) ? i : null;
  if (line === null && point && network.size) line = sightLines.pick(point.x, point.y);
  if (line !== null) {
    highlighted.value = line;
    pointedLine = true;
  } else if (pointedLine) {
    highlighted.value = null;
    pointedLine = false;
  }
  ml.getCanvas().style.cursor = i !== null ? "pointer" : "";
}

// The button follows the map's actual tilt (set by it or by a two-finger drag), and camera moves
// keep whatever tilt the visitor chose
const TILTED = 5; // degrees
function toggle3D() {
  const ml = mlMap.value;
  if (!ml) return;
  const tilt = !is3D.value;
  is3D.value = tilt;
  const pitch = tilt ? 60 : 0;
  // Only the tilt changes: the visitor's rotation stays, both ways (the compass turns north up)
  const bearing = ml.getBearing();
  // A network the map framed, untouched since: frame it again for the new tilt
  const camera = sightLines.visibleSites().length ? cameraForTilt(pitch, bearing) : null;
  ml.easeTo({ ...camera, pitch, bearing, duration: 800 });
}

function publishView(ml: MapLibreMap) {
  const bounds = ml.getBounds();
  const center = ml.getCenter();
  mapView.value = {
    center: [center.lng, center.lat],
    bounds: [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()],
    ],
  };
}

onMounted(() => {
  // Registered first: the drawer still reacts to selections if the map can't be created
  // The id, not the object: the POI's details are merged in later and must not re-trigger this
  watch(
    () => site.value?.content_id,
    async () => {
      forgetFraming();
      sites.applySelection();

      // Raise the drawer to the middle on mobile (ignored on desktop), then show the POI in the
      // area left visible, once the drawer has reported its new size
      drawerState.value.request = "middle";
      await nextTick();
      showOpenedSite();
    },
  );

  watch(
    () => route.path,
    () => {
      if (isHome.value) forgetFraming();
      sites.applySelection();
    },
  );

  // The lines follow the open nuraghe once its line-of-sight data arrives, and go on the list;
  // its network is what the markers keep in focus
  watch([() => site.value?.visible, () => site.value?.elevation, () => route.path], () => {
    sightLines.update();
    sites.applyFocus();
  });

  let ml: MapLibreMap;
  try {
    ml = new MapLibreMap({
      container: map.value!,
      style: styleUrl(),
      // Sardinia, framed in the area the drawer leaves visible
      bounds: [
        [8.1, 38.85],
        [9.85, 41.3],
      ],
      fitBoundsOptions: { padding: toMapPadding(mapPadding.value.map((p) => p + 24)) },
      maxPitch: 75,
      // A longer glide after a fling, closer to iOS maps (MapLibre's default deceleration is 2500)
      dragPan: { linearity: 0.3, maxSpeed: 2000, deceleration: 1800 },
      // Rotating and tilting with the mouse (right button or Control + drag) turn the map around
      // the point grabbed, which stays under the pointer, as panning keeps it (on the terrain too).
      // MapLibre's default turns around the centre, so the grabbed place slid away
      dragRotate: { around: "pointer" },
      // The map credits (OpenFreeMap, OpenMapTiles, OpenStreetMap, Terrain Tiles) are in the
      // "Informazioni" sheet, opened from the NurNet+ (i) button on the map / top of the drawer
      attributionControl: false,
      // The basemap's names in the app's language (localizeLabels), set before the style is used
      transformStyle: localizeLabels,
      globalState: { locale: locale.value },
    });
  } catch (error) {
    // e.g. WebGL is unavailable or disabled
    console.error("Map unavailable:", error);
    mapUnavailable.value = true;
    return;
  }
  mlMap.value = ml;
  // The e2e specs read the map through geowright; dev builds only, nothing of it ships
  if (import.meta.dev)
    ((window as { __geowright_maps?: Record<string, unknown> }).__geowright_maps ??= {}).main = ml;
  // The drawer's padding, which it reported before the map existed (applyPadding)
  applyPadding();
  // The camera is set from the start (bounds above): the list can follow it now, rather than once
  // the basemap's style has come from OpenFreeMap
  publishView(ml);
  // The first view drawn, tiles and all: time for the sites' details (useNurnetData)
  ml.once("idle", prefetchDetails);

  // The basemap's style comes from OpenFreeMap: offline (e.g. the installed app without a
  // connection) it never loads, and the map would stay empty without a word. Errors before "load"
  // are the style's own (tiles are only requested after it), so say so until it does load
  let styleLoaded = false;
  ml.on("error", () => {
    if (!styleLoaded) mapOffline.value = true;
  });
  ml.once("load", () => {
    styleLoaded = true;
    mapOffline.value = false;
  });

  // Everything of ours on top of the basemap's style. The light / dark switch keeps our sources
  // but not our layers, drawn in the theme's colours: they're added again then
  async function addOurLayers() {
    await addMarkerImages(ml);
    warmBasemap(ml, isDark.value);
    addTerrain(ml, isDark.value);
    addContours(ml, isDark.value);
    sites.add(ml);
    sightLines.add(ml);
    sightLines.update();
    // The location dot, kept by the switch, back above them all
    if (ml.getLayer("me")) ml.moveLayer("me");
    // Tilted, the distance is drawn from coarser tiles: MapLibre's default (4 zoom levels on
    // screen) left the land beyond a few kilometres bare, towns as names on blank sand. Fewer
    // levels and more tiles keep its roads and places, at the cost of more tiles when steeply
    // tilted. It applies to the sources there now, so again after the switch
    ml.setSourceTileLodParams(2.5, 6);
  }

  ml.on("load", async () => {
    await addOurLayers();
    stopWatchingResolution = watchMarkerResolution(ml);
    sightLines.watchTerrainHeights(ml);
    publishView(ml);

    // Light / dark switch: the other style is fetched first and only swapped in once it's here.
    // Without a connection (the system turned dark at sunset, out in the field) the map keeps its
    // style instead of going blank, and switches when the connection is back
    let styleShown = styleUrl();
    async function showStyle() {
      const url = styleUrl();
      if (url === styleShown) return;
      try {
        const response = await fetch(url, { signal: teardown.signal });
        if (!response.ok) throw new Error(`${response.status}`);
        const style = await response.json();
        if (url !== styleUrl()) return; // switched back meanwhile
        styleShown = url;
        // Swapped in place (the two styles share their sources: see keepOurSources), our layers go
        // back at once, before the next frame. Should MapLibre rebuild the style instead (a new
        // Style object), they go back once it has loaded
        const putOursBack = () => void addOurLayers();
        const before = ml.style;
        ml.once("style.load", putOursBack);
        ml.setStyle(style, {
          diff: true,
          transformStyle: (previous, next) =>
            keepOurSources(previous, localizeLabels(previous, next)),
        });
        if (ml.style === before) {
          ml.off("style.load", putOursBack);
          putOursBack();
          // The map is drawn onto the terrain through tiles it caches, which don't all follow the
          // swap: part of the map stayed in the old theme until it moved. Once the new style's
          // tiles are in (idle), the terrain is set again, in one go, and draws them all afresh
          ml.once("idle", () => {
            const terrain = ml.getTerrain();
            if (!terrain) return;
            ml.setTerrain(null);
            ml.setTerrain(terrain);
          });
        }
      } catch {
        // Nothing once the map is gone: an aborted signal adds no listener
        window.addEventListener("online", () => void showStyle(), {
          once: true,
          signal: teardown.signal,
        });
      }
    }
    // Registered here, after the component's setup: in a scope of its own, stopped on unmount
    lateEffects.run(() => watch(isDark, () => void showStyle()));
    // The basemap's names follow the app's language (localizeLabels), also if it changed while
    // the map was loading
    const showLocale = () => {
      if (ml.getGlobalState().locale !== locale.value)
        ml.setGlobalStateProperty("locale", locale.value);
    };
    showLocale();
    lateEffects.run(() => watch(locale, showLocale));

    // A site opened from its URL before the map was ready: raise the drawer and show it
    if (!isHome.value && site.value) {
      drawerState.value.request = "middle";
      await nextTick();
      showOpenedSite();
    }

    // The mouse over the map points things out in the drawer too (see pointAt)
    let frame = 0;
    ml.on("mousemove", (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => pointAt(ml, event.point));
    });
    ml.getCanvas().addEventListener("mouseleave", () => {
      cancelAnimationFrame(frame);
      pointAt(ml, null);
    });

    ml.on("click", ["poi-selected", "pois"], (event) => {
      const poi = props.pois[Number(event.features?.[0]?.properties.i)];
      if (poi) openPOI(poi);
    });
  });

  ml.on("moveend", () => publishView(ml));
  // Whatever tilted the map (the button, a two-finger drag, a camera move), the button follows
  ml.on("pitchend", () => (is3D.value = ml.getPitch() > TILTED));

  // Collapse the drawer when the user pans or pinches the map, not on programmatic moves
  ml.on("movestart", (event) => {
    // Moved by the visitor (drag, pinch, wheel, keys), not by the app
    if (event.originalEvent) forgetFraming();
    if (event.originalEvent && drawerState.value.position !== "bottom") {
      drawerState.value.request = "bottom";
    }
  });
});

onUnmounted(() => {
  lateEffects.stop();
  teardown.abort();
  stopWatchingResolution?.();
  mlMap.value?.remove();
});
</script>

<template>
  <div ref="map" class="h-screen w-screen"></div>

  <p
    v-if="mapUnavailable"
    class="absolute inset-x-4 top-4 z-1 rounded-2xl bg-panel p-4 text-center text-sm font-semibold text-basalt shadow-sm lg:left-auto lg:w-96"
  >
    {{ t("map.unavailable") }}
  </p>
  <p
    v-else-if="mapOffline"
    role="status"
    class="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 z-1 rounded-2xl bg-panel p-4 lg:right-18 text-center text-sm font-semibold text-basalt shadow-sm max-lg:top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] lg:left-auto lg:w-96"
  >
    {{ t("map.offline") }}
  </p>

  <MapControls
    v-if="!mapUnavailable"
    :is3-d="is3D"
    @zoom="zoomBy"
    @toggle3d="toggle3D"
    @locate="forgetFraming"
    @located="showLocation"
  />
  <SightLinesLegend v-if="!mapUnavailable" />
</template>
