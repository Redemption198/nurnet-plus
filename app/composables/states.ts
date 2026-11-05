// The site open in the drawer, or null on the list
export const useCurrentSite = () => useState<CurrentSite | null>("current-site", () => null);

// Ids of the sites opened lately (however: the list, a link, back/forward, "A caso"), the latest
// first, so "A caso" can avoid them. In memory only, for this visit
export const useRecentSites = () => useState<string[]>("recent-sites", () => []);

// The loading splash (AppSplash) is up: the status bar keeps its orange meanwhile (app.vue)
export const useSplashVisible = () => useState<boolean>("splash-visible", () => true);

// The "Informazioni" sheet (about, credits)
export const useInfoOpen = () => useState<boolean>("info-open", () => false);

// Video services the visitor chose to load videos from (POIVideo), until the app is closed.
// In memory only: nothing about it is stored
export const useVideoConsent = () =>
  useState<{ youtube: boolean; facebook: boolean }>("video-consent", () => ({
    youtube: false,
    facebook: false,
  }));

// Category name (as returned by useCategoryName) shown in the list and on the map, or null for all
export const useCategoryFilter = () => useState<string | null>("category-filter", () => null);

// Screen area covered by the drawer, as [top, right, bottom, left] css pixels for the map view
export const useMapPadding = () =>
  useState<[number, number, number, number]>("map-padding", () => [0, 0, 0, 0]);

// Where the drawer rests (mobile), and a position requested by the rest of the app; the drawer
// moves there and clears the request
export const useDrawerState = () =>
  useState<{ position: DrawerPosition; request: DrawerPosition | null }>("drawer-state", () => ({
    position: "bottom",
    request: null,
  }));

// Set to frame an area ([[west, south], [east, north]]) on the map, which resets it to null.
// `points`: the places in it, framed exactly when the map is tilted. `lowerDrawer`: on mobile,
// lower the drawer first to show more of the map
export const useMapFitBounds = () =>
  useState<{
    bounds: [[number, number], [number, number]];
    points: [number, number][];
    lowerDrawer: boolean;
  } | null>("map-fit-bounds", () => null);

// Returns a function that frames a set of points on the map (call this in setup)
export function useFitPoints() {
  const fit = useMapFitBounds();
  return (points: [number, number][], lowerDrawer: boolean) => {
    const lons = points.map(([lon]) => lon);
    const lats = points.map(([, lat]) => lat);
    fit.value = {
      bounds: [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      points,
      lowerDrawer,
    };
  };
}

// The visible site (index into the items) hovered or focused in "Visibili da qui", for the map
export const useHighlightedVisible = () =>
  useState<number | null>("highlighted-visible", () => null);

// Indices (into the items) of the sites matching the search, null when not searching: the map
// fades the others
export const useSearchMatches = () => useState<number[] | null>("search-matches", () => null);

// What the map shows, updated when it stops moving: for the list of the sites in view
export const useMapView = () =>
  useState<{ center: [number, number]; bounds: [[number, number], [number, number]] } | null>(
    "map-view",
    () => null,
  );

// Height of the drawer's header (css px), which floats over the top of the drawer's scroll area
export const useDrawerHeaderHeight = () => useState<number>("drawer-header-height", () => 0);

// The site (index into the items) hovered or focused in the main list: the map points it out
export const useHoveredSite = () => useState<number | null>("hovered-site", () => null);

// A Mac (or an iPad asking for desktop sites, which says the same): for naming its keys and
// gestures. False on the server, where there is no browser to ask
export const useIsMac = () =>
  computed(() => import.meta.client && /Macintosh|Mac OS X/.test(navigator.userAgent));
