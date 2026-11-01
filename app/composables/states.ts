export const useCurrentPOI = () =>
  useState<object>("currentPOI", () => {
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
