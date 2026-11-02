// The POI open in the drawer: its index fields, plus its details once loaded
// (`detailsStatus`: "loading" | "loaded" | "error"). `values_` mirrors OpenLayers' Feature shape
export const useCurrentPOI = () =>
  // oxlint-disable-next-line typescript/no-explicit-any -- fields come from the data files
  useState<{ values_?: Record<string, any> }>("currentPOI", () => {
    return {};
  });

// The "Informazioni" sheet (about, credits)
export const useInfoOpen = () => useState<boolean>("info-open", () => false);

// Category name (as returned by useCategoryName) shown in the list and on the map, or null for all
export const useCategoryFilter = () => useState<string | null>("category-filter", () => null);

// Screen area covered by the drawer, as [top, right, bottom, left] css pixels for the map view
export const useMapPadding = () =>
  useState<number[]>("map-padding", () => {
    return [0, 0, 0, 0];
  });

export const useDrawerState = () =>
  useState<object>("drawer-state", () => {
    return {
      currentPosition: "",
      setPosition: "",
    };
  });

// Set to [[west, south], [east, north]] to frame that area on the map (the map resets it to null)
export const useMapFitBounds = () =>
  useState<[[number, number], [number, number]] | null>("map-fit-bounds", () => null);

// The visible site (index into the items) hovered or focused in "Visibili da qui", for the map
export const useHighlightedVisible = () =>
  useState<number | null>("highlighted-visible", () => null);
