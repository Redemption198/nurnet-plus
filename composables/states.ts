export const useCurrentPOI = () =>
  useState<Object>("currentPOI", () => {
    return {};
  });

export const useDrawerState = () =>
  useState<Object>("drawer-state", () => {
    return {
      currentPosition: "",
      setPosition: "",
    };
  });
