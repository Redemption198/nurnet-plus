import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  MapLibreMap,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { MaybeRefOrGetter, ShallowRef } from "vue";

// Which markers stay at full strength, by priority: the open nuraghe's network, then the search
// results. The rest fade and lose their names, and the ones in focus win where names collide
const FADED_OPACITY = 0.3;
const FADED_OPACITY_DARK = 0.15;

// The sites on TheMap: a marker each, of the chosen category, faded out of focus; the open site
// as a pin, the hovered one drawn bigger with its name. `network`: the indices of the sites the
// open nuraghe sees (useSightLines)
export function useMapSites(
  map: ShallowRef<MapLibreMap | undefined>,
  pois: MaybeRefOrGetter<NurnetPOI[]>,
  network: () => number[],
) {
  const site = useCurrentSite();
  const isHome = useIsHome();
  const isDark = useIsDark();
  const categoryFilter = useCategoryFilter();
  const searchMatches = useSearchMatches();
  const hovered = useHoveredSite();

  // The POI open in the drawer (none on the list)
  const selectedId = () => (isHome.value ? "" : (site.value?.content_id ?? ""));
  const selectedIndex = () => {
    const id = selectedId();
    return id ? toValue(pois).findIndex((poi) => poi.content_id === id) : -1;
  };

  // The open and the hovered sites are drawn from sources of their own, one feature each (none
  // when there's no such site): updating one redraws that marker alone, not the sites' layer
  function siteFeature(i: number | null): FeatureCollection<Point> {
    const poi = i === null ? undefined : toValue(pois)[i];
    return {
      type: "FeatureCollection",
      features: poi
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: poi.coordinates },
              properties: {
                i,
                content_id: poi.content_id,
                category_id: poi.category_id,
                name: poi.name,
              },
            },
          ]
        : [],
    };
  }
  const selectedFeature = () => {
    const i = selectedIndex();
    return siteFeature(i >= 0 ? i : null);
  };
  // Never the open site: its pin is already there (it stays hovered after the click that opened
  // it, until the mouse moves)
  const hoveredFeature = () => {
    const i = hovered.value;
    return siteFeature(i !== null && toValue(pois)[i]?.content_id !== selectedId() ? i : null);
  };

  // The open site's own marker is hidden under its pin, where its disc would peek out behind the
  // tip: a feature state, set without rebuilding the sites' layer
  let openMarker: number | null = null;
  function markOpen(ml: MapLibreMap) {
    const i = selectedIndex();
    if (openMarker !== null)
      ml.setFeatureState({ source: "pois", id: openMarker }, { open: false });
    openMarker = i >= 0 ? i : null;
    if (openMarker !== null) ml.setFeatureState({ source: "pois", id: openMarker }, { open: true });
  }

  // The layers only exist once the style has loaded; add() shows the selection itself
  function applySelection() {
    const ml = map.value;
    if (!ml?.getLayer("poi-selected")) return;
    void (ml.getSource("poi-selected") as GeoJSONSource).setData(selectedFeature());
    void (ml.getSource("poi-hover") as GeoJSONSource).setData(hoveredFeature());
    markOpen(ml);
    applyFocus();
  }

  // Markers of the category chosen in the drawer (all when none). to-string turns a missing
  // category into "", which counts as "Sconosciuto"
  function categoryLayerFilter(): FilterSpecification | null {
    if (!categoryFilter.value) return null;
    const ids = new Set(
      toValue(pois)
        .filter((poi) => categoryOf(poi.category_id).name === categoryFilter.value)
        .map((poi) => poi.category_id ?? ""),
    );
    return ["in", ["to-string", ["get", "category_id"]], ["literal", [...ids]]];
  }

  function applyFocus() {
    const ml = map.value;
    if (!ml?.getLayer("pois")) return;
    // MapLibre ignores a value that hasn't changed
    const { opacity, textField, sortKey } = focusStyle();
    ml.setPaintProperty("pois", "icon-opacity", opacity);
    ml.setLayoutProperty("pois", "text-field", textField);
    ml.setLayoutProperty("pois", "symbol-sort-key", sortKey);
  }

  // The markers' opacity, names and order for the current focus (see applyFocus)
  function focusStyle() {
    const sites = network();
    const focus = sites.length ? sites : isHome.value ? searchMatches.value : null;
    const inFocus: ExpressionSpecification = ["in", ["get", "i"], ["literal", focus ?? []]];
    // The zoom step must be the outermost expression
    const name: ExpressionSpecification = focus
      ? ["case", inFocus, ["get", "name"], ""]
      : ["get", "name"];
    // The open site is drawn as a pin (poi-selected): its own marker is hidden (markOpen)
    const isOpen: ExpressionSpecification = ["boolean", ["feature-state", "open"], false];
    const faded = isDark.value ? FADED_OPACITY_DARK : FADED_OPACITY;
    const opacity: ExpressionSpecification = focus
      ? ["case", isOpen, 0, inFocus, 1, faded]
      : ["case", isOpen, 0, 1];
    return {
      opacity,
      textField: ["step", ["zoom"], "", LABEL_ZOOM, name] as ExpressionSpecification,
      // Then by category: markerPriority is below 100
      sortKey: focus
        ? (["+", markerPriority, ["case", inFocus, 0, 100]] as ExpressionSpecification)
        : markerPriority,
    };
  }

  function add(ml: MapLibreMap) {
    // Already there after the light / dark switch, which keeps it (keepOurSources)
    if (!ml.getSource("pois"))
      ml.addSource("pois", {
        type: "geojson",
        // Each feature's id is its index, for the feature state (markOpen)
        promoteId: "i",
        // Only what the map needs; the full POI comes from `pois` via its index
        data: {
          type: "FeatureCollection",
          features: toValue(pois).map((poi, i) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: poi.coordinates },
            properties: {
              i,
              content_id: poi.content_id,
              category_id: poi.category_id,
              name: poi.name,
            },
          })),
        },
      });

    if (!ml.getSource("poi-selected"))
      ml.addSource("poi-selected", { type: "geojson", data: selectedFeature() });
    if (!ml.getSource("poi-hover"))
      ml.addSource("poi-hover", { type: "geojson", data: hoveredFeature() });

    // Drawn for the current focus from the start, as applyFocus sets it later (focusStyle)
    const focus = focusStyle();
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
        // Where markers overlap, the landmarks win (see focusStyle)
        "symbol-sort-key": focus.sortKey,
        // Overlapping icons are hidden while zoomed out and come back when zooming in
        "icon-padding": 0,
        ...labelLayout(ml, LABEL_ZOOM),
        "text-field": focus.textField,
      },
      paint: { ...labelPaint(isDark.value), "icon-opacity": focus.opacity },
    });
    markOpen(ml);

    // The selected POI: a pin with its tip on the site, always visible, with its name a bit earlier
    ml.addLayer({
      id: "poi-selected",
      type: "symbol",
      source: "poi-selected",
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
      paint: labelPaint(isDark.value),
    });

    // The site hovered or focused in the list: drawn again bigger and lifted, always visible (even
    // where markers overlap), with its name
    ml.addLayer({
      id: "poi-hover",
      type: "symbol",
      source: "poi-hover",
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
      paint: { ...labelPaint(isDark.value), "text-halo-width": 2 },
    });
  }

  watch(hovered, () => {
    void (map.value?.getSource("poi-hover") as GeoJSONSource | undefined)?.setData(
      hoveredFeature(),
    );
  });
  watch(searchMatches, applyFocus);
  watch(categoryFilter, () => {
    if (map.value?.getLayer("pois")) map.value.setFilter("pois", categoryLayerFilter());
  });

  return { add, applySelection, applyFocus };
}
