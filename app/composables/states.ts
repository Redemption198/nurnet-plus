export const useCurrentPOI = () =>
  useState<object>("currentPOI", () => {
    return {};
  });

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
