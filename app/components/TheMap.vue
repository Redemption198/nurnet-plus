<script setup lang="ts">
import {
  LngLat,
  MapLibreMap,
  Point as ScreenPoint,
  setWorkerUrl,
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type LngLatLike,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre looks for its worker next to its own module, which bundling moves: point to it
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);

const props = defineProps<{ pois: NurnetPOI[] }>();

const route = useRoute();

const site = useCurrentSite();
const { openPOI } = useNurnetData();
const drawerState = useDrawerState();
const mapPadding = useMapPadding();
const categoryFilter = useCategoryFilter();
const mapFitBounds = useMapFitBounds();
const searchMatches = useSearchMatches();
const mapView = useMapView();
const highlighted = useHighlightedVisible();
const hovered = useHoveredSite();

const map = ref<HTMLElement | null>(null);
// shallowRef: MapLibre's map must not be wrapped in a deep reactive proxy
const mlMap = shallowRef<MapLibreMap>();
const is3D = ref(false);
const mapUnavailable = ref(false);

// Free sources, no API keys: OpenFreeMap vector tiles and the AWS Terrain Tiles dataset
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const TERRAIN_TILES = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";
const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain Tiles</a>';

// Recolour the basemap toward Sardinia: limestone ground, a muted sea, macchia greens.
// Layer ids are from OpenFreeMap's "liberty" style; missing ones are skipped
type PaintProperty = Parameters<MapLibreMap["setPaintProperty"]>[1];
const BASEMAP_COLORS: Record<string, [PaintProperty, string]> = {
  background: ["background-color", "#f1e9dc"],
  water: ["fill-color", "#9ec5d6"],
  park: ["fill-color", "#d6dfbf"],
  landcover_wood: ["fill-color", "hsla(90, 28%, 60%, 0.55)"],
  landcover_grass: ["fill-color", "#d3dbb4"],
  landcover_sand: ["fill-color", "#f2e3c4"],
};

function warmBasemap(ml: MapLibreMap) {
  for (const [layer, [property, color]] of Object.entries(BASEMAP_COLORS)) {
    if (ml.getLayer(layer)) ml.setPaintProperty(layer, property, color);
  }
}

function addTerrain(ml: MapLibreMap) {
  // One source for the 3D terrain and the hillshading. MapLibre suggests separate ones, but a
  // hillshade source of its own drew grey lines along tile edges (its tiles' borders weren't
  // matched to their neighbours)
  ml.addSource("terrain", {
    type: "raster-dem",
    tiles: [TERRAIN_TILES],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 14,
    attribution: TERRAIN_ATTRIBUTION,
  });

  // Hillshading goes under the first label layer so text stays on top
  const firstSymbolLayer = ml.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  ml.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "terrain",
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
const selectedId = () => (route.path === "/" ? "" : (site.value?.content_id ?? ""));
function selectedFilter(): FilterSpecification {
  return ["==", ["get", "content_id"], selectedId()];
}

// The layer only exists once the style has loaded; addPois applies the filter itself
function applySelection() {
  if (!mlMap.value?.getLayer("poi-selected")) return;
  mlMap.value.setFilter("poi-selected", selectedFilter());
  mlMap.value.setFilter("poi-hover", hoverFilter());
  applyFocus();
}

// Markers of the category chosen in the drawer (all when none). to-string turns a missing
// category into "", which counts as "Sconosciuto"
function categoryLayerFilter(): FilterSpecification | null {
  if (!categoryFilter.value) return null;
  const ids = new Set(
    props.pois
      .filter((poi) => categoryOf(poi.category_id).name === categoryFilter.value)
      .map((poi) => poi.category_id ?? ""),
  );
  return ["in", ["to-string", ["get", "category_id"]], ["literal", [...ids]]];
}

// The basemap's own regular font for our labels (OpenFreeMap serves the glyphs for it)
function labelFont(ml: MapLibreMap): string[] {
  const font = ml
    .getStyle()
    .layers.map((layer) => (layer.layout as Record<string, unknown> | undefined)?.["text-font"])
    .find(
      (value): value is string[] =>
        Array.isArray(value) &&
        value.every((part) => typeof part === "string") &&
        /Regular/.test(String(value[0])),
    );
  return font ?? ["Noto Sans Regular"];
}

// Names under the markers once zoomed in; a name only shows where it fits
const LABEL_ZOOM = 12.5;
function labelLayout(ml: MapLibreMap, fromZoom: number) {
  return {
    "text-field": ["step", ["zoom"], "", fromZoom, ["get", "name"]] as ExpressionSpecification,
    "text-font": labelFont(ml),
    "text-size": 12,
    "text-anchor": "top" as const,
    "text-offset": [0, 0.3] as [number, number],
    "text-max-width": 9,
    "text-optional": true,
  };
}
const LABEL_PAINT = {
  "text-color": "#312528",
  "text-halo-color": "rgba(255, 255, 255, 0.9)",
  "text-halo-width": 1.5,
};

function addPois(ml: MapLibreMap) {
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
    ...(categoryFilter.value && { filter: categoryLayerFilter()! }),
    layout: {
      "icon-image": markerForCategory,
      "icon-anchor": "bottom",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 13, 0.75, 16, 0.9],
      // Where markers overlap, the landmarks win (see applyFocus)
      "symbol-sort-key": markerPriority,
      // Overlapping icons are hidden while zoomed out and come back when zooming in
      "icon-padding": 0,
      ...labelLayout(ml, LABEL_ZOOM),
    },
    paint: LABEL_PAINT,
  });

  // The selected POI: a pin with its tip on the site, always visible, with its name a bit earlier
  ml.addLayer({
    id: "poi-selected",
    type: "symbol",
    source: "pois",
    filter: selectedFilter(),
    layout: {
      "icon-image": pinForCategory,
      "icon-anchor": "bottom",
      // The image has room for the shadow below the tip
      "icon-offset": [0, SHADOW_ROOM],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      ...labelLayout(ml, 11),
      "text-size": 13,
    },
    paint: LABEL_PAINT,
  });

  // The site hovered or focused in the list: drawn again bigger and lifted, always visible (even
  // where markers overlap), with its name
  ml.addLayer({
    id: "poi-hover",
    type: "symbol",
    source: "pois",
    filter: hoverFilter(),
    layout: {
      "icon-image": hoverMarkerForCategory,
      "icon-anchor": "bottom",
      "icon-offset": [0, SHADOW_ROOM],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      ...labelLayout(ml, 0),
      "text-size": 13,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { ...LABEL_PAINT, "text-halo-width": 2 },
  });
}

// Never the open site: its pin is already there (it stays hovered after the click that opened
// it, until the mouse moves)
function hoverFilter(): FilterSpecification {
  return [
    "all",
    ["==", ["get", "i"], hovered.value ?? -1],
    ["!=", ["get", "content_id"], selectedId()],
  ];
}

// Lines of sight from the open nuraghe to the sites it can see (none on the list): in mid-air
// between the tops of the towers (sightLinesLayer), plus a dot on the ground at each end, as the
// markers there may be hidden where they overlap
const TOWER_HEIGHT = 15; // metres, as in CRS4's model
const sightLines = createSightLinesLayer("sight-lines");

function visibleSites() {
  const visible = route.path === "/" ? [] : (site.value?.visible ?? []);
  return visible.filter((entry) => props.pois[entry.i]);
}
// The visibility levels the open nuraghe's lines have, in their usual order, for the legend
const shownLevels = computed(() => {
  const levels = new Set((site.value?.visible ?? []).map((entry) => visibilityLevel(entry.height)));
  return VISIBILITY_LEVELS.filter((_, i) => levels.has(i));
});
const showsNetwork = computed(() => route.path !== "/" && (site.value?.visible.length ?? 0) > 0);

function visibilityEnds(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: visibleSites().map((entry) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: props.pois[entry.i]!.coordinates },
      properties: {
        i: entry.i,
        name: props.pois[entry.i]!.name,
        color: VISIBILITY_LEVELS[visibilityLevel(entry.height)]!.color,
      },
    })),
  };
}

// Ground height as drawn (with the terrain's exaggeration): the terrain where its tiles are
// loaded, else the site's elevation, else `fallback` (a nearby height: 0 would bury the tower).
// queryTerrainElevation gives 0, not null, where the terrain hasn't loaded yet: a 0 for a site
// known to be higher up is taken as "not loaded"
function groundAt(
  ml: MapLibreMap,
  coordinates: [number, number],
  elevation: number | undefined,
  fallback = 0,
) {
  const exaggeration = ml.getTerrain()?.exaggeration ?? 1;
  const known = elevation != null ? elevation * exaggeration : null;
  const terrain = ml.queryTerrainElevation(coordinates);
  const unloaded = terrain == null || (terrain === 0 && (known ?? fallback) > 5);
  return unloaded ? (known ?? fallback) : terrain;
}

// Which markers stay at full strength, by priority: the open nuraghe's network, then the search
// results. The rest fade and lose their names, and the ones in focus win where names collide
const FADED_OPACITY = 0.3;
function applyFocus() {
  const ml = mlMap.value;
  if (!ml?.getLayer("pois")) return;
  const network = visibleSites().map((entry) => entry.i);
  const focus = network.length ? network : route.path === "/" ? searchMatches.value : null;
  const inFocus: ExpressionSpecification = ["in", ["get", "i"], ["literal", focus ?? []]];
  // The zoom step must be the outermost expression
  const name: ExpressionSpecification = focus
    ? ["case", inFocus, ["get", "name"], ""]
    : ["get", "name"];
  // The open site is drawn as a pin (poi-selected): its disc would peek out behind the tip
  const isOpen: ExpressionSpecification = ["==", ["get", "content_id"], selectedId()];
  ml.setPaintProperty("pois", "icon-opacity", [
    "case",
    isOpen,
    0,
    ...(focus ? [inFocus, 1, FADED_OPACITY] : [1]),
  ] as ExpressionSpecification);
  ml.setLayoutProperty("pois", "text-field", ["step", ["zoom"], "", LABEL_ZOOM, name]);
  // Then by category: markerPriority is below 100
  ml.setLayoutProperty(
    "pois",
    "symbol-sort-key",
    focus ? ["+", markerPriority, ["case", inFocus, 0, 100]] : markerPriority,
  );
}

let stopWatchingResolution: (() => void) | undefined;

// Framing places ("Mostra sulla mappa"): room around them for the markers and their names, on
// top of the map's own padding (drawer, controls, brand button), and how close it may get
const FIT_PADDING = { top: 48, bottom: 40, left: 64, right: 56 };
const FIT_MAX_ZOOM = 14;
// The places the map last framed, until the visitor moves the camera themselves: switching
// between 2D and 3D frames them again
let framedPoints: [number, number][] | null = null;

// fitBounds frames places as if the map were flat: tilted, the near side is drawn bigger and the
// far side smaller, and places on high ground are drawn higher, so some end up under the drawer
// or off screen. This starts from its flat camera and corrects it on a copy of the map's camera,
// where the places are projected as drawn (tilt and terrain), until they fill the free area
// The map's camera (its "transform", in MapLibre 6 inside the internal `_camera`; its type isn't
// exported, so this is the part used here). Without it, framing falls back to fitBounds
interface CameraCopy {
  center: LngLat;
  zoom: number;
  setCenter(center: LngLat): void;
  setZoom(zoom: number): void;
  setPitch(pitch: number): void;
  setBearing(bearing: number): void;
  locationToScreenPoint(place: LngLat, terrain?: MapLibreMap["terrain"]): ScreenPoint;
  screenPointToLocation(point: ScreenPoint): LngLat;
}

// The bounds of a set of places
const boundsOf = (points: [number, number][]): [[number, number], [number, number]] => [
  [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))],
  [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))],
];

// `pitch` and `bearing`: frame them for a tilt the map is about to take (the 3D button)
function cameraForTilted(
  ml: MapLibreMap,
  points: [number, number][],
  pitch = ml.getPitch(),
  bearing = ml.getBearing(),
) {
  const flat = ml.cameraForBounds(boundsOf(points), {
    padding: FIT_PADDING,
    maxZoom: FIT_MAX_ZOOM,
    bearing,
  });
  if (!flat?.center || flat.zoom == null) return null;

  const transform = (ml as unknown as { _camera?: { transform?: { clone(): CameraCopy } } })._camera
    ?.transform;
  if (!transform) return null;
  const camera = transform.clone();
  camera.setPitch(pitch);
  camera.setBearing(bearing);
  camera.setCenter(LngLat.convert(flat.center));
  camera.setZoom(flat.zoom);
  const { top = 0, right = 0, bottom = 0, left = 0 } = ml.getPadding();
  const { width, height } = ml.getContainer().getBoundingClientRect();
  // The free area, where the places must end up
  const area = {
    left: left + FIT_PADDING.left,
    right: width - right - FIT_PADDING.right,
    top: top + FIT_PADDING.top,
    bottom: height - bottom - FIT_PADDING.bottom,
  };
  if (area.right <= area.left || area.bottom <= area.top) return null;
  const places = points.map((point) => LngLat.convert(point));

  for (let step = 0; step < 8; step++) {
    const drawn = places.map((place) =>
      camera.locationToScreenPoint(place, ml.terrain ?? undefined),
    );
    const xs = drawn.map((p) => p.x);
    const ys = drawn.map((p) => p.y);
    const box = {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
    // Move what is drawn in the middle of the places to the middle of the free area
    const shift = new ScreenPoint(
      (box.left + box.right) / 2 - (area.left + area.right) / 2,
      (box.top + box.bottom) / 2 - (area.top + area.bottom) / 2,
    );
    const middle = camera.locationToScreenPoint(camera.center);
    camera.setCenter(camera.screenPointToLocation(middle.add(shift)));
    // And zoom so they fill it (a single place, or places on a line, only by the other side)
    const scales = [
      (area.right - area.left) / Math.max(box.right - box.left, 1),
      (area.bottom - area.top) / Math.max(box.bottom - box.top, 1),
    ];
    const zoom = Math.min(camera.zoom + Math.log2(Math.min(...scales)), FIT_MAX_ZOOM);
    const done = Math.abs(zoom - camera.zoom) < 0.01 && shift.mag() < 1;
    camera.setZoom(zoom);
    if (done) break;
  }
  return { center: camera.center, zoom: camera.zoom };
}

// The ground heights used in the last update, to redraw when the terrain loads and changes them
let usedGrounds: number[] = [];

function updateSightLines() {
  const ml = mlMap.value;
  if (!ml) return;
  (ml.getSource("visibility") as GeoJSONSource | undefined)?.setData(visibilityEnds());
  applyFocus();

  const poi = site.value;
  const sites = visibleSites();
  const tower = TOWER_HEIGHT * (ml.getTerrain()?.exaggeration ?? 1);
  usedGrounds = [];
  const towerAt = (
    coordinates: [number, number],
    elevation: number | undefined,
    fallback?: number,
  ) => {
    const ground = groundAt(ml, coordinates, elevation, fallback);
    usedGrounds.push(ground);
    return { at: coordinates, ground, top: ground + tower };
  };
  if (!poi || !sites.length) return sightLines.setData([], []);

  const origin = towerAt(poi.coordinates, poi.elevation);
  const towers = [origin];
  const lines = sites.map((entry) => {
    // Sites in sight are usually at a similar height: the origin's ground stands in for unknowns
    const end = towerAt(props.pois[entry.i]!.coordinates, entry.elevation, origin.ground);
    towers.push(end);
    return {
      from: [...origin.at, origin.top] as [number, number, number],
      to: [...end.at, end.top] as [number, number, number],
      level: visibilityLevel(entry.height),
      id: entry.i,
    };
  });
  sightLines.setData(lines, towers);
}

function applyHighlight() {
  const id = highlighted.value ?? -1;
  sightLines.setHighlight(highlighted.value);
  const filter: FilterSpecification = ["==", ["get", "i"], id];
  for (const layer of ["visibility-highlight", "visibility-highlight-label"])
    if (mlMap.value?.getLayer(layer)) mlMap.value.setFilter(layer, filter);
}

function addSightLines(ml: MapLibreMap) {
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
  // The site highlighted in the list: a bigger dot and its name, above everything
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
      // Only until the markers show their own names
      "text-field": ["step", ["zoom"], ["get", "name"], LABEL_ZOOM, ""],
      "text-font": labelFont(ml),
      "text-size": 13,
      "text-anchor": "bottom",
      "text-offset": [0, -0.9],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { ...LABEL_PAINT, "text-halo-width": 2 },
  });

  // Whenever the map has finished loading (terrain tiles included, e.g. after a zoom or the switch
  // to 3D), redo the heights if the terrain now gives different ones. Only then: an update
  // repaints, which would otherwise end in "idle" again
  ml.on("idle", () => {
    const poi = site.value;
    if (!poi || !usedGrounds.length) return;
    const sites = visibleSites();
    const origin = groundAt(ml, poi.coordinates, poi.elevation);
    const grounds = [
      origin,
      ...sites.map((entry) =>
        groundAt(ml, props.pois[entry.i]!.coordinates, entry.elevation, origin),
      ),
    ];
    if (grounds.some((ground, i) => Math.abs(ground - (usedGrounds[i] ?? Infinity)) > 1))
      updateSightLines();
  });
}

// The visitor's position: a dot on the map, and the map flies there
const locating = ref(false);
const locationError = ref<string | null>(null);
const LOCATION_ERRORS: Record<number, string> = {
  1: "Permesso di posizione negato: attivalo nelle impostazioni del browser.",
  2: "Posizione non disponibile al momento.",
  3: "La posizione non è arrivata in tempo. Riprova.",
};

// The zoom buttons: a camera change of the visitor's, like a pinch
function zoomBy(step: number) {
  framedPoints = null;
  if (step > 0) mlMap.value?.zoomIn();
  else mlMap.value?.zoomOut();
}

function showMyLocation() {
  framedPoints = null;
  const ml = mlMap.value;
  if (!ml || !("geolocation" in navigator)) return;
  locating.value = true;
  locationError.value = null;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      locating.value = false;
      const here: [number, number] = [coords.longitude, coords.latitude];
      const data: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: here }, properties: {} },
        ],
      };
      const source = ml.getSource("me") as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        ml.addSource("me", { type: "geojson", data });
        ml.addLayer({
          id: "me",
          type: "circle",
          source: "me",
          paint: {
            "circle-radius": 8,
            "circle-color": "#2563eb",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 3,
            "circle-pitch-alignment": "map",
          },
        });
      }
      drawerState.value.request = "bottom";
      ml.flyTo({ center: here, zoom: Math.max(ml.getZoom(), 12), duration: 1200, essential: true });
    },
    (error) => {
      locating.value = false;
      locationError.value = LOCATION_ERRORS[error.code] ?? "Posizione non disponibile.";
      setTimeout(() => (locationError.value = null), 6000);
    },
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
  );
}

// What covers the map besides the drawer: the controls on the right, and on phones the brand
// button at the top left (a 44px button 16px from the edges). Camera moves frame things in what
// is left, so nothing lands under them
const isDesktop = useMediaQuery("(min-width: 1024px)");
const OVERLAY_RIGHT = 16 + 48 + 8;
const OVERLAY_TOP_MOBILE = 16 + 44 + 8;
// The sight-lines legend at the bottom right (desktop): always kept clear, so the camera doesn't
// jump when lines appear
const OVERLAY_BOTTOM_DESKTOP = 8 + 32 + 16;

function toMapPadding([top, right, bottom, left]: number[]) {
  return {
    top: top! + (isDesktop.value ? 0 : OVERLAY_TOP_MOBILE),
    right: right! + OVERLAY_RIGHT,
    bottom: bottom! + (isDesktop.value ? OVERLAY_BOTTOM_DESKTOP : 0),
    left: left!,
  };
}

// A nuraghe that sees others opens on its network (as "Mostra sulla mappa"), once its lines of
// sight have loaded (they come with the site's details, usually within moments); any other site
// opens close up on itself
const fitPoints = useFitPoints();
async function showOpenedSite() {
  const id = site.value?.content_id;
  if (site.value?.visibleStatus === "loading") {
    await new Promise<void>((resolve) => {
      const done = () => {
        stop();
        clearTimeout(timer);
        resolve();
      };
      const stop = watch(
        () => site.value?.visibleStatus,
        (status) => status !== "loading" && done(),
      );
      const timer = setTimeout(done, 2500);
    });
  }
  // Another site was opened meanwhile: that one takes over
  if (!site.value || site.value.content_id !== id) return;
  const network = visibleSites();
  if (network.length) {
    fitPoints(
      [site.value.coordinates, ...network.map((entry) => props.pois[entry.i]!.coordinates)],
      false,
    );
  } else {
    focusSelectedPOI();
  }
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

  const network = new Set(visibleSites().map((entry) => entry.i));
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

// Close enough to see the site and its neighbours (and their names), not so close that the
// visitor loses where on the island they are
function focusSelectedPOI() {
  framedPoints = null;
  const coordinates = site.value?.coordinates;
  if (!coordinates || !mlMap.value) return;

  mlMap.value.flyTo({
    center: coordinates as LngLatLike,
    zoom: Math.max(mlMap.value.getZoom(), 12.5),
    // Keep the visitor's own tilt; only a flat map stays flat
    pitch: is3D.value ? Math.max(mlMap.value.getPitch(), 45) : 0,
    padding: toMapPadding(mapPadding.value),
    duration: 1400,
    essential: true,
  });
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
  const bearing = tilt ? ml.getBearing() : 0;
  // A network the map framed, untouched since: frame it again for the new tilt
  const camera =
    framedPoints && visibleSites().length
      ? tilt
        ? cameraForTilted(ml, framedPoints, pitch, bearing)
        : ml.cameraForBounds(boundsOf(framedPoints), {
            padding: FIT_PADDING,
            maxZoom: FIT_MAX_ZOOM,
            bearing,
          })
      : null;
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
    () => site.value?.content_id,
    async () => {
      applySelection();

      // Raise the drawer to the middle on mobile (ignored on desktop), then show the POI in the
      // area left visible, once the drawer has reported its new size
      drawerState.value.request = "middle";
      await nextTick();
      showOpenedSite();
    },
  );

  watch(() => route.path, applySelection);

  // The lines follow the open nuraghe once its line-of-sight data arrives, and go on the list
  watch(
    [() => site.value?.visible, () => site.value?.elevation, () => route.path],
    updateSightLines,
  );
  watch(highlighted, applyHighlight);
  watch(hovered, () => {
    if (mlMap.value?.getLayer("poi-hover")) mlMap.value.setFilter("poi-hover", hoverFilter());
  });
  watch(searchMatches, applyFocus);

  // "Mostra sulla mappa" and friends: frame the requested area in the part the drawer leaves visible
  watch(mapFitBounds, async (request) => {
    if (!request || !mlMap.value) return;
    mapFitBounds.value = null;
    // Lower the drawer (mobile) if asked; it reports the new padding as it starts moving
    if (request.lowerDrawer) drawerState.value.request = "bottom";
    await nextTick();
    const ml = mlMap.value;
    // The drawer's latest size: the map applies it only once it stops moving, and on a site
    // opened from its URL it may not have yet
    ml.setPadding(toMapPadding(mapPadding.value));
    framedPoints = request.points;
    const camera = ml.getPitch() > TILTED ? cameraForTilted(ml, request.points) : null;
    if (camera) ml.easeTo({ ...camera, duration: 1200, essential: true });
    else
      ml.fitBounds(request.bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        duration: 1200,
        essential: true,
      });
  });

  watch(categoryFilter, () => {
    if (mlMap.value?.getLayer("pois")) mlMap.value.setFilter("pois", categoryLayerFilter());
  });

  let ml: MapLibreMap;
  try {
    ml = new MapLibreMap({
      container: map.value!,
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
    await addMarkerImages(ml);
    stopWatchingResolution = watchMarkerResolution(ml);
    warmBasemap(ml);
    addTerrain(ml);
    addPois(ml);
    addSightLines(ml);
    updateSightLines(); // also applies the markers' focus
    publishView(ml);

    // A site opened from its URL before the map was ready: raise the drawer and show it
    if (route.path !== "/" && site.value) {
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
    if (event.originalEvent) framedPoints = null;
    if (event.originalEvent && drawerState.value.position !== "bottom") {
      drawerState.value.request = "bottom";
    }
  });
});

onUnmounted(() => {
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
    La mappa non è disponibile su questo dispositivo (WebGL non supportato), ma puoi cercare e
    consultare i siti dalla lista.
  </p>

  <!-- The space beside the buttons (as wide as the location error, when shown) must leave
       clicks and drags to the map, so only the items themselves take them -->
  <div
    v-if="!mapUnavailable"
    class="pointer-events-none absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-1 flex flex-col items-end gap-y-2 *:pointer-events-auto"
  >
    <div
      class="flex flex-col items-center overflow-hidden rounded-2xl bg-panel/80 shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
    >
      <MapControlsButton aria-label="Ingrandisci" @click.prevent="zoomBy(1)">
        <IconPlus class="size-6" />
      </MapControlsButton>

      <MapControlsButton aria-label="Riduci" @click.prevent="zoomBy(-1)">
        <IconMinus class="size-6" />
      </MapControlsButton>

      <MapControlsButton
        class="text-sm font-bold"
        :class="is3D ? 'bg-basalt !text-white hover:!bg-basalt' : ''"
        aria-label="Vista 3D con il rilievo"
        :aria-pressed="is3D"
        @click.prevent="toggle3D()"
      >
        3D
      </MapControlsButton>

      <MapControlsButton
        aria-label="Mostra la mia posizione"
        :disabled="locating"
        @click.prevent="showMyLocation()"
      >
        <UIcon
          :name="locating ? 'i-lucide-loader-circle' : 'i-lucide-locate-fixed'"
          class="size-5.5"
          :class="{ 'animate-spin': locating }"
        />
      </MapControlsButton>
    </div>

    <p
      v-if="locationError"
      role="alert"
      class="max-w-56 rounded-2xl bg-panel/90 px-3 py-2 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
    >
      {{ locationError }}
    </p>

    <!-- How to read the lines while a nuraghe's network is on the map (desktop: on phones the map
         area is small, and the list's bars use the same colours) -->
  </div>

  <!-- The key to the lines of sight (desktop; on mobile the rows in the drawer say it): a strip
       at the bottom right, the near side of a tilted map where framed sites rarely end up, kept
       clear by the camera (OVERLAY_BOTTOM_DESKTOP). Only the levels the open nuraghe's lines have,
       and clicks go through it to the lines and markers -->
  <ul
    v-if="showsNetwork && !mapUnavailable"
    aria-label="Legenda delle linee di vista"
    class="pointer-events-none absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-1 hidden h-8 items-center gap-x-3 rounded-full bg-panel/80 px-3 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl lg:flex"
  >
    <li v-for="level in shownLevels" :key="level.label" class="flex items-center gap-x-1.5">
      <svg class="h-2 w-5 shrink-0" viewBox="0 0 20 8" aria-hidden="true">
        <line
          x1="2"
          y1="4"
          x2="18"
          y2="4"
          :stroke="level.color"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="level.dashed ? '4 3' : undefined"
        />
      </svg>
      {{ level.label }}
    </li>
  </ul>
</template>
