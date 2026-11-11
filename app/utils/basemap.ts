// The basemap under our layers (TheMap): its style, recoloured toward Sardinia, and the terrain;
// what the light / dark switch keeps; the visitor's position on it
import {
  addProtocol,
  type GeoJSONSource,
  type MapLibreMap,
  type TransformStyleFunction,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import mlcontour from "maplibre-contour";
import { BRAND, BRAND_DARK } from "./brand";
import { labelFont } from "./mapLabels";

// Free sources, no API keys: OpenFreeMap vector tiles and the AWS Terrain Tiles dataset
// liberty in light mode (recoloured below), their dark style in dark mode
export const STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const TERRAIN_TILES = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";
const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain Tiles</a>';

// Recolour the basemap toward Sardinia: limestone ground, a muted sea, macchia greens.
// Layer ids are from OpenFreeMap's "liberty" style; missing ones are skipped
type PaintProperty = Parameters<MapLibreMap["setPaintProperty"]>[1];
const BASEMAP_COLORS: Record<string, [PaintProperty, string]> = {
  background: ["background-color", BRAND.sand],
  water: ["fill-color", "#9ec5d6"],
  park: ["fill-color", "#d6dfbf"],
  landcover_wood: ["fill-color", "hsla(90, 28%, 60%, 0.55)"],
  landcover_grass: ["fill-color", "#d3dbb4"],
  landcover_sand: ["fill-color", "#f2e3c4"],
};

// The same for OpenFreeMap's "dark" style, which comes in neutral greys: the ground of the dark
// panels (the sand token, dark), a deep sea that still reads as water (1.6:1 on the ground),
// warm roads in the panels' basalt, and town names in the muted text colour (8:1)
const ROAD = "#5a4a44";
const LABEL_HALO = "rgba(29, 24, 25, 0.85)";
const BASEMAP_DARK: Record<string, Partial<Record<PaintProperty, string>>> = {
  background: { "background-color": BRAND_DARK.sand },
  water: { "fill-color": "#253f52" },
  waterway: { "line-color": "#253f52" },
  water_name: { "text-color": "#7d9bb0", "text-halo-color": "#1d2a33" },
  landcover_ice_shelf: { "fill-color": BRAND_DARK.sand },
  landcover_glacier: { "fill-color": BRAND_DARK.sand },
  landuse_residential: { "fill-color": "#241e1f" },
  landcover_wood: { "fill-color": "#22231a" },
  landuse_park: { "fill-color": "#22231a" },
  building: { "fill-color": "#2a2224", "fill-outline-color": "#332a2c" },
  "aeroway-area": { "fill-color": "#241e1f" },
  "aeroway-runway": { "line-color": "#3a3133" },
  "aeroway-taxiway": { "line-color": "#2e2628" },
  "aeroway-runway-casing": { "line-color": "#3a3133" },
  road_area_pier: { "fill-color": BRAND_DARK.sand },
  road_pier: { "line-color": BRAND_DARK.sand },
  highway_path: { "line-color": "#2e2628" },
  highway_minor: { "line-color": "#352c2d" },
  highway_major_casing: { "line-color": "#2e2628" },
  highway_major_inner: { "line-color": "#4a3d39" },
  highway_major_subtle: { "line-color": "#4a3d39" },
  highway_motorway_casing: { "line-color": "#2e2628" },
  highway_motorway_inner: { "line-color": ROAD },
  highway_motorway_subtle: { "line-color": ROAD },
  railway: { "line-color": "#3a3133" },
  railway_minor: { "line-color": "#3a3133" },
  railway_transit: { "line-color": "#3a3133" },
  railway_dashline: { "line-color": BRAND_DARK.sand },
  railway_minor_dashline: { "line-color": BRAND_DARK.sand },
  railway_transit_dashline: { "line-color": BRAND_DARK.sand },
  highway_name_other: { "text-color": "#9c8f85", "text-halo-color": LABEL_HALO },
  highway_name_motorway: { "text-color": "#9c8f85", "text-halo-color": LABEL_HALO },
  boundary_state: { "line-color": "#4a3f40" },
  "boundary_country_z0-4": { "line-color": "#4a3f40" },
  "boundary_country_z5-": { "line-color": "#4a3f40" },
};
// Every place label (place_town, place_city...): the muted text colour on a dark halo
const PLACE_LABEL = { "text-color": "#bcafa4", "text-halo-color": LABEL_HALO };

export function warmBasemap(ml: MapLibreMap, dark: boolean) {
  if (!dark) {
    for (const [layer, [property, color]] of Object.entries(BASEMAP_COLORS)) {
      if (ml.getLayer(layer)) ml.setPaintProperty(layer, property, color);
    }
    return;
  }
  for (const layer of ml.getStyle().layers) {
    const paint = BASEMAP_DARK[layer.id] ?? (layer.id.startsWith("place_") ? PLACE_LABEL : null);
    // Object.entries widens the keys to string: they are BASEMAP_DARK's paint properties
    for (const [property, color] of Object.entries(paint ?? {}))
      ml.setPaintProperty(layer.id, property as PaintProperty, color);
  }
  // The dark style draws the water first, under the land's fills (opaque parks): moved over
  // them, as in the light style, it can cover the relief and the contour lines drawn under it
  if (ml.getLayer("water") && ml.getLayer("waterway")) ml.moveLayer("water", "waterway");
}

// The elevation tiles, fetched and kept once (maplibre-contour's DemSource, in a worker) for the
// 3D terrain, the hillshading and the contour lines: MapLibre reads them through the protocol it
// registers (sharedDemProtocolUrl), the contour lines are drawn from them
let elevation: InstanceType<typeof mlcontour.DemSource> | undefined;
function elevationTiles() {
  if (!elevation) {
    elevation = new mlcontour.DemSource({
      url: TERRAIN_TILES,
      encoding: "terrarium",
      maxzoom: 14,
      worker: true,
    });
    elevation.setupMaplibre({ addProtocol });
  }
  return elevation;
}

export function addTerrain(ml: MapLibreMap, dark: boolean) {
  // One source for the 3D terrain and the hillshading. MapLibre suggests separate ones, but a
  // hillshade source of its own drew grey lines along tile edges (its tiles' borders weren't
  // matched to their neighbours). Kept by the light / dark switch (keepOurSources), with its
  // loaded tiles, so the relief doesn't flatten for a moment
  if (!ml.getSource("terrain"))
    ml.addSource("terrain", {
      type: "raster-dem",
      tiles: [elevationTiles().sharedDemProtocolUrl],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 14,
      attribution: TERRAIN_ATTRIBUTION,
    });

  // Hillshading goes under the water: the elevation tiles have relief under the sea and lakes too
  // (the seabed lit, a lake's uneven surface shaded), which the water hides. Under the first
  // label layer, so text stays on top, if the style has no water
  const firstSymbolLayer = ml.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  const below = ml.getLayer("water") ? "water" : firstSymbolLayer;
  ml.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "terrain",
      // Lit from four directions (west to north-east), so slopes facing any way read, not only
      // those away from a single north-west light. Shadows in a warm basalt grey, not the default
      // slate, so the relief stays in the palette
      paint: {
        "hillshade-method": "multidirectional",
        "hillshade-illumination-direction": [270, 315, 0, 45],
        "hillshade-illumination-altitude": [30, 30, 30, 30],
        ...(dark
          ? {
              "hillshade-exaggeration": 0.25,
              "hillshade-shadow-color": Array(4).fill("#0e0a0b"),
              "hillshade-highlight-color": Array(4).fill("rgba(241, 233, 220, 0.1)"),
            }
          : {
              "hillshade-exaggeration": 0.2,
              "hillshade-shadow-color": Array(4).fill("#4d413e"),
              "hillshade-highlight-color": Array(4).fill("rgba(255, 252, 245, 0.35)"),
            }),
      },
    },
    below,
  );

  // Exaggerated a bit: Sardinia's relief is gentle and would look flat at 1x
  ml.setTerrain({ source: "terrain", exaggeration: 1.5 });
  // In 3D: a soft Mediterranean sky, and a horizon and haze of warm limestone (the map's sand,
  // lighter), so the distance fades into the palette rather than into a cool grey
  // (in dark mode: a night sky, and a haze of the dark map's own ground)
  ml.setSky({
    "sky-color": dark ? "#14181f" : "#b3d3e0",
    "horizon-color": dark ? "#221c1d" : "#f3ece1",
    "sky-horizon-blend": 0.5,
    "horizon-fog-blend": 0.6,
    "fog-color": dark ? BRAND_DARK.sand : "#efe6d8",
    "fog-ground-blend": 0.4,
  });
}

// Our sources on the basemap, kept through the light / dark switch (see keepOurSources)
const OUR_SOURCES = [
  "contours",
  "terrain",
  "pois",
  "poi-selected",
  "poi-hover",
  "visibility",
  "me",
];

// Contour lines, drawn from the elevation tiles (elevationTiles) from zoom 11, when the map shows a
// valley more than the island: every 100 m there (500 m labelled), closer as it zooms in. Under
// the basemap's names, in its ink, faint: a hint of the slope, not a hiking map
export function addContours(ml: MapLibreMap, dark: boolean) {
  if (!ml.getSource("contours"))
    ml.addSource("contours", {
      type: "vector",
      tiles: [
        elevationTiles().contourProtocolUrl({
          // [minor, major] metres by zoom
          thresholds: { 11: [100, 500], 12: [50, 250], 13: [20, 100], 14: [10, 50] },
          elevationKey: "ele",
          levelKey: "level",
          contourLayer: "contours",
          overzoom: 1,
        }),
      ],
      minzoom: 11,
      maxzoom: 15,
    });

  const color = dark ? BRAND_DARK.basalt : BRAND.basalt;
  const below = ml.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  // The lines under the water: a lake's surface in the elevation tiles isn't flat, and where it
  // lies near a contour's height its ripples drew closed loops all over the lake
  ml.addLayer(
    {
      id: "contours",
      type: "line",
      source: "contours",
      "source-layer": "contours",
      paint: {
        "line-color": color,
        // Major lines (level 1) stronger
        "line-opacity": ["match", ["get", "level"], 1, 0.45, 0.22],
        "line-width": ["match", ["get", "level"], 1, 1, 0.6],
      },
    },
    ml.getLayer("water") ? "water" : below,
  );
  ml.addLayer(
    {
      id: "contour-labels",
      type: "symbol",
      source: "contours",
      "source-layer": "contours",
      filter: [">", ["get", "level"], 0],
      layout: {
        "symbol-placement": "line",
        "text-field": [
          "concat",
          // Grouped as the app's language writes it (1.500 m, 1,500 m)
          ["number-format", ["get", "ele"], { locale: ["global-state", "locale"] }],
          " m",
        ],
        "text-font": labelFont(ml),
        "text-size": 10,
      },
      paint: {
        "text-color": color,
        "text-halo-color": dark ? BRAND_DARK.sand : BRAND.sand,
        "text-halo-width": 1.5,
      },
    },
    below,
  );
}

// The light / dark switch keeps our sources (their data and loaded tiles: the sites, the sight
// lines, the terrain and its 3D) and the location dot, which doesn't change with the theme. The
// two OpenFreeMap styles share their sources, sprite and fonts, so the switch only swaps the
// basemap's layers: no blank frame. Our other layers come back drawn for the new theme
export const keepOurSources: TransformStyleFunction = (previous, next) => ({
  ...next,
  sources: {
    ...next.sources,
    ...Object.fromEntries(
      OUR_SOURCES.flatMap((id) => (previous?.sources[id] ? [[id, previous.sources[id]]] : [])),
    ),
  },
  ...(previous?.terrain && { terrain: previous.terrain }),
  layers: [...next.layers, ...(previous?.layers.filter((layer) => layer.id === "me") ?? [])],
});

// The basemap's names in the app's language. OpenFreeMap's styles write a place's English name
// where it has one (name_en), whatever the language: in Italian the place's own name (name)
// instead. The language is the map's global state "locale" (TheMap), so switching it doesn't
// touch the style, only the labels
const ENGLISH_NAME = JSON.stringify(["coalesce", ["get", "name_en"], ["get", "name"]]);
const LOCALIZED_NAME = [
  "case",
  ["==", ["global-state", "locale"], "en"],
  ["coalesce", ["get", "name_en"], ["get", "name"]],
  ["get", "name"],
];
const localizeName = (value: unknown): unknown =>
  JSON.stringify(value) === ENGLISH_NAME
    ? LOCALIZED_NAME
    : Array.isArray(value)
      ? value.map(localizeName)
      : value;
export const localizeLabels: TransformStyleFunction = (_previous, next) => ({
  ...next,
  layers: next.layers.map((layer) =>
    layer.type === "symbol" && layer.layout?.["text-field"]
      ? {
          ...layer,
          layout: {
            ...layer.layout,
            "text-field": localizeName(
              layer.layout["text-field"],
            ) as (typeof layer.layout)["text-field"],
          },
        }
      : layer,
  ),
});

// The visitor's position: a blue dot, moved there if it's already on the map
export function showVisitorDot(ml: MapLibreMap, here: [number, number]) {
  const data: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: here }, properties: {} }],
  };
  const source = ml.getSource("me") as GeoJSONSource | undefined;
  if (source) return source.setData(data);
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
