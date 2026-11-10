import type { FilterSpecification, GeoJSONSource, MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { MaybeRefOrGetter, ShallowRef } from "vue";

const TOWER_HEIGHT = 15; // metres, as in CRS4's model

// Lines of sight on TheMap, from the open nuraghe to the sites it can see (none on the list): in
// mid-air between the tops of the towers (sightLinesLayer), plus a dot on the ground at each end,
// as the markers there may be hidden where they overlap
export function useSightLines(
  map: ShallowRef<MapLibreMap | undefined>,
  pois: MaybeRefOrGetter<NurnetPOI[]>,
) {
  const site = useCurrentSite();
  const isHome = useIsHome();
  const isDark = useIsDark();
  const highlighted = useHighlightedVisible();
  const layer = createSightLinesLayer("sight-lines");

  // The sites the open nuraghe sees (none on the list)
  function visibleSites() {
    const visible = isHome.value ? [] : (site.value?.visible ?? []);
    return visible.filter((entry) => toValue(pois)[entry.i]);
  }

  function visibilityEnds(): FeatureCollection<Point> {
    return {
      type: "FeatureCollection",
      features: visibleSites().map((entry) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: toValue(pois)[entry.i]!.coordinates },
        properties: {
          i: entry.i,
          name: toValue(pois)[entry.i]!.name,
          color: levelColor(VISIBILITY_LEVELS[visibilityLevel(entry.height)]!, isDark.value),
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

  // The ground heights used in the last update, to redraw when the terrain loads and changes them
  let usedGrounds: number[] = [];

  function update() {
    const ml = map.value;
    if (!ml) return;
    void (ml.getSource("visibility") as GeoJSONSource | undefined)?.setData(visibilityEnds());

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
    if (!poi || !sites.length) return layer.setData([], []);

    const origin = towerAt(poi.coordinates, poi.elevation);
    const towers = [origin];
    const lines = sites.map((entry) => {
      // Sites in sight are usually at a similar height: the origin's ground stands in for unknowns
      const end = towerAt(toValue(pois)[entry.i]!.coordinates, entry.elevation, origin.ground);
      towers.push(end);
      return {
        from: [...origin.at, origin.top] as [number, number, number],
        to: [...end.at, end.top] as [number, number, number],
        level: visibilityLevel(entry.height),
        id: entry.i,
      };
    });
    layer.setData(lines, towers);
  }

  // The site highlighted in the list (or pointed at on the map): its line, dot and name
  function applyHighlight() {
    const id = highlighted.value ?? -1;
    layer.setHighlight(highlighted.value);
    const filter: FilterSpecification = ["==", ["get", "i"], id];
    for (const layerId of ["visibility-highlight", "visibility-highlight-label"])
      if (map.value?.getLayer(layerId)) map.value.setFilter(layerId, filter);
  }
  watch(highlighted, applyHighlight);

  // All under the markers: added after them (useMapSites), in the theme's colours
  function add(ml: MapLibreMap) {
    layer.setDark(isDark.value);
    // Kept by the light / dark switch: update() gives it its data again
    if (!ml.getSource("visibility"))
      ml.addSource("visibility", { type: "geojson", data: visibilityEnds() });
    ml.addLayer(layer, "pois");
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
      paint: { ...labelPaint(isDark.value), "text-halo-width": 2 },
    });
  }

  function watchTerrainHeights(ml: MapLibreMap) {
    // Whenever the map has finished loading (terrain tiles included, e.g. after a zoom or the
    // switch to 3D), redo the heights if the terrain now gives different ones. Only then: an
    // update repaints, which would otherwise end in "idle" again
    ml.on("idle", () => {
      const poi = site.value;
      if (!poi || !usedGrounds.length) return;
      const origin = groundAt(ml, poi.coordinates, poi.elevation);
      const grounds = [
        origin,
        ...visibleSites().map((entry) =>
          groundAt(ml, toValue(pois)[entry.i]!.coordinates, entry.elevation, origin),
        ),
      ];
      if (grounds.some((ground, i) => Math.abs(ground - (usedGrounds[i] ?? Infinity)) > 1))
        update();
    });
  }

  // The site whose line passes nearest a point on the screen (css px), if any
  const pick = (x: number, y: number) => layer.pick(x, y);

  return { visibleSites, update, add, watchTerrainHeights, pick };
}
