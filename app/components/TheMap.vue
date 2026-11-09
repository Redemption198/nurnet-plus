<script setup lang="ts">
import {
  MapLibreMap,
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
const isHome = useIsHome();
const { t } = useI18n();

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

const map = useTemplateRef("map");
// shallowRef: MapLibre's map must not be wrapped in a deep reactive proxy
const mlMap = shallowRef<MapLibreMap>();
const is3D = ref(false);
const mapUnavailable = ref(false);
// The basemap couldn't be loaded (no connection): the list still works
const mapOffline = ref(false);

const isDark = useIsDark();
const styleUrl = () => STYLE_URLS[isDark.value ? "dark" : "light"];

// The selected POI's layer shows only the POI open in the drawer (none on the list)
const selectedId = () => (isHome.value ? "" : (site.value?.content_id ?? ""));
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
// Basalt on a white halo; in dark mode, light text on a dark halo
function labelPaint() {
  return {
    "text-color": isDark.value ? BRAND_DARK.basalt : BRAND.basalt,
    "text-halo-color": isDark.value ? "rgba(29, 24, 25, 0.9)" : "rgba(255, 255, 255, 0.9)",
    "text-halo-width": 1.5,
  };
}

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
    paint: labelPaint(),
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
    paint: labelPaint(),
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
    paint: { ...labelPaint(), "text-halo-width": 2 },
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
  const visible = isHome.value ? [] : (site.value?.visible ?? []);
  return visible.filter((entry) => props.pois[entry.i]);
}
// The visibility levels the open nuraghe's lines have, in their usual order, for the legend
const shownLevels = computed(() => {
  const levels = new Set((site.value?.visible ?? []).map((entry) => visibilityLevel(entry.height)));
  return VISIBILITY_LEVELS.filter((_, i) => levels.has(i));
});

// What the legend shows. While the next nuraghe's lines load (its list is empty until then), it
// keeps the last levels, so going from one nuraghe to another changes the strip instead of
// blinking it out and back in
const legendLevels = shallowRef<(typeof VISIBILITY_LEVELS)[number][]>([]);
watchEffect(() => {
  if (isHome.value) legendLevels.value = [];
  else if (site.value?.visibleStatus !== "loading") legendLevels.value = shownLevels.value;
});
// The strip eases to the width of its items, so a level arriving or leaving resizes it smoothly
const legendItems = useTemplateRef("legendItems");
const { width: legendItemsWidth } = useElementSize(legendItems, undefined, { box: "border-box" });

const levelColor = (level: (typeof VISIBILITY_LEVELS)[number]) =>
  isDark.value ? level.darkColor : level.color;

function visibilityEnds(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: visibleSites().map((entry) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: props.pois[entry.i]!.coordinates },
      properties: {
        i: entry.i,
        name: props.pois[entry.i]!.name,
        color: levelColor(VISIBILITY_LEVELS[visibilityLevel(entry.height)]!),
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
const FADED_OPACITY_DARK = 0.15;
function applyFocus() {
  const ml = mlMap.value;
  if (!ml?.getLayer("pois")) return;
  const network = visibleSites().map((entry) => entry.i);
  const focus = network.length ? network : isHome.value ? searchMatches.value : null;
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
    ...(focus ? [inFocus, 1, isDark.value ? FADED_OPACITY_DARK : FADED_OPACITY] : [1]),
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
// What the map sets up outside the component's own lifetime (after its "load", in callbacks), to
// undo on unmount: the watchers in `lateEffects`, the listeners and fetches tied to `teardown`
const lateEffects = effectScope();
const teardown = new AbortController();

// Framing places ("Mostra sulla mappa"): room around them for the markers and their names, on
// top of the map's own padding (drawer, controls, brand button), and how close it may get
// (above the places: room for the open site's pin, the tallest marker, with its shadow)
const FIT_PADDING = { top: PIN_HEIGHT + SHADOW_ROOM + 4, bottom: 40, left: 64, right: 56 };
// On phones the map's padding already keeps full-width bands for buttons that only sit in the
// corners (the logo at the top left, the floating buttons above the drawer), which the side margins
// above keep places clear of: there, the room above and below overlaps those bands instead of
// adding to them, so a network gets the height between the logo and the drawer
function fitPadding() {
  if (isDesktop.value) return FIT_PADDING;
  return {
    ...FIT_PADDING,
    top: Math.max(0, FIT_PADDING.top - OVERLAY_TOP_MOBILE),
    bottom: Math.max(0, FIT_PADDING.bottom - OVERLAY_BOTTOM_MOBILE),
  };
}
const FIT_MAX_ZOOM = 14;
// The places the map last framed, until the visitor moves the camera themselves: switching
// between 2D and 3D frames them again, and so does the drawer moving (mobile)
let framedPoints: [number, number][] | null = null;
// Or the one place it last centred on (a site without a network, the visitor's position), kept
// centred in what the drawer leaves visible as it moves
let framedCenter: [number, number] | null = null;
function forgetFraming() {
  framedPoints = null;
  framedCenter = null;
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
      "circle-color": isDark.value ? BRAND_DARK.basalt : BRAND.basalt,
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
    paint: { ...labelPaint(), "text-halo-width": 2 },
  });
}

function watchTerrainHeights(ml: MapLibreMap) {
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
let locationErrorTimer: ReturnType<typeof setTimeout> | undefined;
// By GeolocationPositionError code
const LOCATION_ERRORS: Record<number, string> = {
  1: "map.locationDenied",
  2: "map.locationUnavailable",
  3: "map.locationTimeout",
};

// The zoom buttons: a camera change of the visitor's, like a pinch
function zoomBy(step: number) {
  forgetFraming();
  if (step > 0) mlMap.value?.zoomIn();
  else mlMap.value?.zoomOut();
}

function showMyLocation() {
  forgetFraming();
  const ml = mlMap.value;
  if (!ml || !("geolocation" in navigator)) return;
  locating.value = true;
  locationError.value = null;
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
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
      // Lower the drawer (mobile), and fly to the visitor in the area it leaves, buttons on it
      // included: the drawer reports its new size at once, the map would only take it up after
      // the flight (see the mapPadding watcher)
      drawerState.value.request = "bottom";
      await nextTick();
      forgetFraming();
      framedCenter = here;
      ml.flyTo({
        center: here,
        zoom: Math.max(ml.getZoom(), 12),
        padding: toMapPadding(mapPadding.value),
        duration: 1200,
        essential: true,
      });
    },
    (error) => {
      locating.value = false;
      locationError.value = t(LOCATION_ERRORS[error.code] ?? "map.locationFailed");
      // A new error gets its full time on screen
      clearTimeout(locationErrorTimer);
      locationErrorTimer = setTimeout(() => (locationError.value = null), 6000);
    },
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
  );
}

// What covers the map besides the drawer: the controls on the right, and on phones the brand
// button at the top left (a 44px button 16px from the edges). Camera moves frame things in what
// is left, so nothing lands under them
const isDesktop = useIsDesktop();

// The compass: its needle follows the map's rotation (bearing, degrees clockwise from north).
// A click (or Enter) turns north back up; dragging it sideways, or the arrow keys on it, rotate
// the map, the one way to rotate that a mouse shows (the map's own are a right-click or Ctrl
// drag, or Shift with the arrow keys). Always there on desktop; on phones, where two fingers
// rotate, only once the map is rotated, as in the phones' own maps
const bearing = ref(0);
const isMac = useIsMac();
// The hidden ways to rotate, in the compass's tooltip, in the Mac's words there
const compassTip = computed(() => t(isMac.value ? "map.compassTipMac" : "map.compassTip"));
const showsCompass = computed(() => isDesktop.value || Math.abs(bearing.value) > 0.5);
let compassDrag: { x: number; bearing: number; moved: boolean } | null = null;
let compassDragged = false;
function onCompassDown(event: PointerEvent) {
  if (!mlMap.value || event.button !== 0) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  compassDrag = { x: event.clientX, bearing: mlMap.value.getBearing(), moved: false };
}
function onCompassMove(event: PointerEvent) {
  if (!compassDrag) return;
  const dx = event.clientX - compassDrag.x;
  if (Math.abs(dx) > 3) compassDrag.moved = true;
  // Like turning a dial: to the right, the map turns clockwise
  if (compassDrag.moved) mlMap.value?.setBearing(compassDrag.bearing - dx * 0.6);
}
function onCompassUp() {
  compassDragged = compassDrag?.moved ?? false;
  compassDrag = null;
}
function onCompassClick() {
  // The click that ends a drag isn't a request for north
  if (compassDragged) return void (compassDragged = false);
  mlMap.value?.easeTo({ bearing: 0, duration: 500 });
}
// Safari on the Mac: a two-finger twist on the trackpad rotates the map, as in Apple's Maps.
// Safari reports it as gesture events (the rotation since the gesture began, in degrees) that
// MapLibre doesn't listen to; other browsers on the Mac don't report the twist at all. On
// iPhone and iPad, Safari sends them for two fingers on the screen too, which MapLibre already
// turns into rotation: those are left to it
type GestureEvent = UIEvent & { rotation: number };
function rotateWithTrackpadTwist(ml: MapLibreMap, container: HTMLElement) {
  let touches = 0;
  const countTouches = (event: TouchEvent) => (touches = event.touches.length);
  for (const type of ["touchstart", "touchend", "touchcancel"] as const)
    container.addEventListener(type, countTouches, { passive: true });

  let startBearing: number | null = null;
  container.addEventListener("gesturestart", (event) => {
    if (touches) return;
    // Otherwise Safari zooms the whole page
    event.preventDefault();
    startBearing = ml.getBearing();
  });
  container.addEventListener("gesturechange", (event) => {
    if (startBearing === null) return;
    event.preventDefault();
    // The map turns with the fingers: a clockwise twist turns it clockwise
    ml.setBearing(startBearing - (event as GestureEvent).rotation);
  });
  container.addEventListener("gestureend", () => (startBearing = null));
}

const rotateBy = (degrees: number) =>
  mlMap.value?.easeTo({ bearing: mlMap.value.getBearing() + degrees, duration: 250 });
const OVERLAY_RIGHT = 16 + 48 + 8; // desktop: the column of buttons
const OVERLAY_TOP_MOBILE = 16 + 44 + 8;
// Mobile: the buttons riding above the drawer (2D and compass at the left, location at the
// right), at the bottom of the free area whatever the drawer's position. Always the same band,
// shown or not, so the camera doesn't jump when the 2D or compass button comes and goes; framing
// adds its own room below (FIT_PADDING), and at the top the map is hidden anyway
const OVERLAY_BOTTOM_MOBILE = 12 + 48;
// The sight-lines legend at the bottom right (desktop): always kept clear, so the camera doesn't
// jump when lines appear
const OVERLAY_BOTTOM_DESKTOP = 8 + 32 + 16;

function toMapPadding([top, right, bottom, left]: number[]) {
  return {
    top: top! + (isDesktop.value ? 0 : OVERLAY_TOP_MOBILE),
    right: right! + (isDesktop.value ? OVERLAY_RIGHT : 0),
    bottom: bottom! + (isDesktop.value ? OVERLAY_BOTTOM_DESKTOP : OVERLAY_BOTTOM_MOBILE),
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
  // From the site itself, not visibleSites(): opened from the list, the route may still be "/"
  // here (openPOI opens the site before the navigation ends), and that would hide the network
  const network = site.value.visible.filter((entry) => props.pois[entry.i]);
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
  forgetFraming();
  const coordinates = site.value?.coordinates;
  if (!coordinates || !mlMap.value) return;
  framedCenter = coordinates;

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
      ? cameraForPlaces(ml, framedPoints, fitPadding(), FIT_MAX_ZOOM, pitch, bearing)
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
  // moving what is on screen: the point now in the middle of the new visible area becomes the
  // centre. Then, if the map still shows what it framed (the visitor hasn't moved it since), that is
  // framed again in the new visible area, alongside the drawer: a network framed above the drawer
  // in the middle spreads out over the map when the drawer goes down, and the reverse
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

      const camera = framedPoints
        ? cameraForPlaces(ml, framedPoints, fitPadding(), FIT_MAX_ZOOM)
        : null;
      if (camera) ml.easeTo({ ...camera, duration: 600, essential: true });
      else if (framedCenter) ml.easeTo({ center: framedCenter, duration: 600, essential: true });
    };
    if (ml.isMoving()) ml.once("moveend", apply);
    else apply();
  });

  // The id, not the object: the POI's details are merged in later and must not re-trigger this
  watch(
    () => site.value?.content_id,
    async () => {
      forgetFraming();
      applySelection();

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
      applySelection();
    },
  );

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
    const points = request.points;
    forgetFraming();
    framedPoints = points;
    const camera = cameraForPlaces(ml, points, fitPadding(), FIT_MAX_ZOOM);
    if (camera) ml.easeTo({ ...camera, duration: 1200, essential: true });
    else
      ml.fitBounds(request.bounds, {
        padding: fitPadding(),
        maxZoom: FIT_MAX_ZOOM,
        duration: 1200,
        essential: true,
      });
    // The terrain where the camera arrives may load only now, raising the places on high
    // ground: once it has, frame them again if they moved (unless the visitor took over)
    ml.once("moveend", () =>
      ml.once("idle", () => {
        if (framedPoints !== points) return;
        const settled = cameraForPlaces(ml, points, fitPadding(), FIT_MAX_ZOOM);
        if (!settled) return;
        const shift = ml.project(settled.center).dist(ml.project(ml.getCenter()));
        if (shift > 2 || Math.abs(settled.zoom - ml.getZoom()) > 0.02)
          ml.easeTo({ ...settled, duration: 500, essential: true });
      }),
    );
  });

  watch(categoryFilter, () => {
    if (mlMap.value?.getLayer("pois")) mlMap.value.setFilter("pois", categoryLayerFilter());
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
    });
  } catch (error) {
    // e.g. WebGL is unavailable or disabled
    console.error("Map unavailable:", error);
    mapUnavailable.value = true;
    return;
  }
  mlMap.value = ml;

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

  // Everything of ours on top of the basemap's style. A new style (the light / dark switch) drops
  // it all, so it's added again then
  async function addOurLayers() {
    await addMarkerImages(ml);
    warmBasemap(ml, isDark.value);
    addTerrain(ml, isDark.value);
    addPois(ml);
    sightLines.setDark(isDark.value);
    addSightLines(ml);
    updateSightLines(); // also applies the markers' focus
  }

  ml.on("load", async () => {
    await addOurLayers();
    stopWatchingResolution = watchMarkerResolution(ml);
    watchTerrainHeights(ml);
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
        ml.once("style.load", () => void addOurLayers());
        ml.setStyle(style, { diff: false });
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
  ml.on("rotate", () => (bearing.value = ml.getBearing()));
  rotateWithTrackpadTwist(ml, map.value!);

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
  clearTimeout(locationErrorTimer);
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

  <!-- Desktop: a column at the top right. The space beside the buttons (as wide as the location
       error, when shown) must leave clicks and drags to the map, so only the items take them -->
  <div
    v-if="!mapUnavailable && isDesktop"
    class="pointer-events-none absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-1 flex flex-col items-end gap-y-2 *:pointer-events-auto"
  >
    <div
      class="flex flex-col items-center overflow-hidden rounded-2xl bg-panel/80 shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
    >
      <MapControlsButton :aria-label="t('map.zoomIn')" @click.prevent="zoomBy(1)">
        <UIcon name="i-lucide-plus" class="size-6" aria-hidden="true" />
      </MapControlsButton>

      <MapControlsButton :aria-label="t('map.zoomOut')" @click.prevent="zoomBy(-1)">
        <UIcon name="i-lucide-minus" class="size-6" aria-hidden="true" />
      </MapControlsButton>

      <MapControlsButton
        class="text-sm font-bold"
        :class="is3D ? 'bg-basalt !text-panel hover:!bg-basalt' : '!text-muted'"
        :aria-label="t('map.view3d')"
        :aria-pressed="is3D"
        @click.prevent="toggle3D()"
      >
        3D
      </MapControlsButton>

      <MapControlsButton
        v-if="showsCompass"
        class="touch-none"
        :aria-label="t('map.compassWithKeys')"
        :title="isDesktop ? compassTip : undefined"
        @pointerdown="onCompassDown"
        @pointermove="onCompassMove"
        @pointerup="onCompassUp"
        @pointercancel="onCompassUp"
        @click.prevent="onCompassClick"
        @keydown.left.prevent="rotateBy(15)"
        @keydown.right.prevent="rotateBy(-15)"
      >
        <CompassNeedle :bearing="bearing" />
      </MapControlsButton>

      <MapControlsButton
        :aria-label="t('map.myLocation')"
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
  </div>

  <!-- Mobile: fewer buttons, riding on the drawer's top edge (TheDrawer's #drawer-float), within
       the thumb's reach. Zoom is a pinch. 3D and the compass only show when there is something to
       undo (a tilted or rotated map), at the left: «2D» flattens the map; the location at the right. They follow the
       drawer down and to the middle, and fade away as it opens fully -->
  <Teleport v-if="!mapUnavailable && !isDesktop" defer to="#drawer-float">
    <div class="absolute inset-x-4 bottom-3 flex items-end justify-between gap-x-3">
      <div class="flex gap-x-2">
        <Transition name="float-button">
          <button
            v-if="is3D"
            type="button"
            class="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press bg-panel/85 text-sm font-bold text-basalt backdrop-blur-2xl"
            :aria-label="t('map.view2d')"
            @click="toggle3D()"
          >
            2D
          </button>
        </Transition>
        <Transition name="float-button">
          <button
            v-if="showsCompass"
            type="button"
            class="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press touch-none bg-panel/85 backdrop-blur-2xl"
            :aria-label="t('map.compass')"
            @pointerdown="onCompassDown"
            @pointermove="onCompassMove"
            @pointerup="onCompassUp"
            @pointercancel="onCompassUp"
            @click="onCompassClick"
          >
            <CompassNeedle :bearing="bearing" />
          </button>
        </Transition>
      </div>

      <div class="flex flex-col items-end gap-y-2">
        <p
          v-if="locationError"
          role="alert"
          class="pointer-events-auto max-w-56 rounded-2xl bg-panel/90 px-3 py-2 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl"
        >
          {{ locationError }}
        </p>
        <button
          type="button"
          class="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_16px_rgb(49_37_40/0.14)] transition press bg-panel/85 text-subtle backdrop-blur-2xl"
          :aria-label="t('map.myLocation')"
          :disabled="locating"
          @click="showMyLocation()"
        >
          <UIcon
            :name="locating ? 'i-lucide-loader-circle' : 'i-lucide-locate-fixed'"
            class="size-5.5"
            :class="{ 'animate-spin': locating }"
          />
        </button>
      </div>
    </div>
  </Teleport>

  <!-- The key to the lines of sight (desktop; on mobile the rows in the drawer say it): a strip
       at the bottom right, the near side of a tilted map where framed sites rarely end up, kept
       clear by the camera (OVERLAY_BOTTOM_DESKTOP). Only the levels the open nuraghe's lines have,
       and clicks go through it to the lines and markers -->
  <Transition name="legend">
    <div
      v-if="legendLevels.length && !mapUnavailable"
      class="legend pointer-events-none absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-1 hidden h-8 justify-end overflow-hidden rounded-full bg-panel/80 text-xs font-semibold text-basalt shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl lg:flex"
      :style="legendItemsWidth ? { width: `${legendItemsWidth}px` } : undefined"
    >
      <div ref="legendItems" class="flex w-max shrink-0 px-3">
        <TransitionGroup
          tag="ul"
          name="legend-item"
          :aria-label="t('map.legend')"
          class="relative flex h-8 items-center gap-x-3"
        >
          <li
            v-for="level in legendLevels"
            :key="level.label"
            class="flex items-center gap-x-1.5 whitespace-nowrap"
          >
            <svg class="h-2 w-5 shrink-0" viewBox="0 0 20 8" aria-hidden="true">
              <line
                x1="2"
                y1="4"
                x2="18"
                y2="4"
                :stroke="levelColor(level)"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="level.dashed ? '4 3' : undefined"
              />
            </svg>
            {{ t(`visibilityLevels.${level.key}`) }}
          </li>
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Mobile 3D and compass buttons: they pop in when the map is tilted or rotated, and out when
   it's back flat and north up */
.float-button-enter-active {
  transition:
    opacity 0.2s ease-out,
    scale 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.float-button-leave-active {
  transition:
    opacity 0.15s ease-in,
    scale 0.15s ease-in;
}

.float-button-enter-from,
.float-button-leave-to {
  opacity: 0;
  scale: 0.6;
}

/* The legend strip, like Spotlight: it fades in with a little blur and scale, eases to the width
   of its items, and the items blur in, slide to their places and fade out on their own */
.legend {
  transition: width 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}

.legend-enter-active,
.legend-leave-active {
  transition:
    opacity 0.22s ease-out,
    filter 0.22s ease-out,
    scale 0.22s ease-out;
}

.legend-leave-active {
  transition-duration: 0.16s;
  transition-timing-function: ease-in;
}

.legend-enter-from,
.legend-leave-to {
  opacity: 0;
  filter: blur(4px);
  scale: 0.96;
}

.legend-item-move {
  transition: translate 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}

.legend-item-enter-active {
  transition:
    opacity 0.26s ease-out 0.08s,
    filter 0.26s ease-out 0.08s,
    scale 0.26s ease-out 0.08s;
}

.legend-item-leave-active {
  transition:
    opacity 0.14s ease-in,
    filter 0.14s ease-in;
}

.legend-item-enter-from,
.legend-item-leave-to {
  opacity: 0;
  filter: blur(3px);
  scale: 0.9;
}

/* Reduced motion: fades only, no resizing, sliding or blur */
@media (prefers-reduced-motion: reduce) {
  .legend,
  .legend-item-move {
    transition: none;
  }

  .legend-enter-from,
  .legend-leave-to,
  .legend-item-enter-from,
  .legend-item-leave-to {
    filter: none;
    scale: 1;
  }
}
</style>
