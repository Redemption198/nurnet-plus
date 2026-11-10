import type { LngLatLike, MapLibreMap } from "maplibre-gl";
import type { MaybeRefOrGetter, Ref, ShallowRef } from "vue";

// What covers the map besides the drawer: the controls on the right, and on phones the brand
// button at the top left (a 44px button 16px from the edges). Camera moves frame things in what
// is left, so nothing lands under them
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

// Framing places ("Mostra sulla mappa"): room around them for the markers and their names, on
// top of the map's own padding (drawer, controls, brand button), and how close it may get
// (above the places: room for the open site's pin, the tallest marker, with its shadow)
const FIT_PADDING = { top: PIN_HEIGHT + SHADOW_ROOM + 4, bottom: 40, left: 64, right: 56 };
const FIT_MAX_ZOOM = 14;

// TheMap's camera moves: framing places or one place in the area the drawer and the controls
// leave visible, and keeping them framed there as the drawer moves, until the visitor moves the
// map themselves
export function useMapCamera(
  map: ShallowRef<MapLibreMap | undefined>,
  pois: MaybeRefOrGetter<NurnetPOI[]>,
  is3D: Ref<boolean>,
) {
  const site = useCurrentSite();
  const drawerState = useDrawerState();
  const mapPadding = useMapPadding();
  const mapFitBounds = useMapFitBounds();
  const fitPoints = useFitPoints();
  const isDesktop = useIsDesktop();

  function toMapPadding([top, right, bottom, left]: number[]) {
    return {
      top: top! + (isDesktop.value ? 0 : OVERLAY_TOP_MOBILE),
      right: right! + (isDesktop.value ? OVERLAY_RIGHT : 0),
      bottom: bottom! + (isDesktop.value ? OVERLAY_BOTTOM_DESKTOP : OVERLAY_BOTTOM_MOBILE),
      left: left!,
    };
  }

  // On phones the map's padding already keeps full-width bands for buttons that only sit in the
  // corners (the logo at the top left, the floating buttons above the drawer), which the side
  // margins above keep places clear of: there, the room above and below overlaps those bands
  // instead of adding to them, so a network gets the height between the logo and the drawer
  function fitPadding() {
    if (isDesktop.value) return FIT_PADDING;
    return {
      ...FIT_PADDING,
      top: Math.max(0, FIT_PADDING.top - OVERLAY_TOP_MOBILE),
      bottom: Math.max(0, FIT_PADDING.bottom - OVERLAY_BOTTOM_MOBILE),
    };
  }

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

  // The zoom buttons: a camera change of the visitor's, like a pinch
  function zoomBy(step: number) {
    forgetFraming();
    if (step > 0) map.value?.zoomIn();
    else map.value?.zoomOut();
  }

  // Close enough to see the site and its neighbours (and their names), not so close that the
  // visitor loses where on the island they are
  function focusSelectedPOI() {
    forgetFraming();
    const coordinates = site.value?.coordinates;
    const ml = map.value;
    if (!coordinates || !ml) return;
    framedCenter = coordinates;
    ml.flyTo({
      center: coordinates as LngLatLike,
      zoom: Math.max(ml.getZoom(), 12.5),
      // Keep the visitor's own tilt; only a flat map stays flat
      pitch: is3D.value ? Math.max(ml.getPitch(), 45) : 0,
      padding: toMapPadding(mapPadding.value),
      duration: 1400,
      essential: true,
    });
  }

  // A nuraghe that sees others opens on its network (as "Mostra sulla mappa"), once its lines of
  // sight have loaded (they come with the site's details, usually within moments); any other site
  // opens close up on itself
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
    // From the site itself, not the sight lines' visibleSites(): opened from the list, the route
    // may still be "/" here (openPOI opens the site before the navigation ends), and that would
    // hide the network
    const network = site.value.visible.filter((entry) => toValue(pois)[entry.i]);
    if (network.length) {
      fitPoints(
        [site.value.coordinates, ...network.map((entry) => toValue(pois)[entry.i]!.coordinates)],
        false,
      );
    } else {
      focusSelectedPOI();
    }
  }

  // The visitor's position: lower the drawer (mobile), and fly there in the area it leaves,
  // buttons on it included: the drawer reports its new size at once, the map would only take it
  // up after the flight (see the mapPadding watcher)
  async function flyToVisitor(here: [number, number]) {
    const ml = map.value;
    if (!ml) return;
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
  }

  // Switching between 2D and 3D: a network the map framed, untouched since, framed again for the
  // new tilt (null otherwise)
  function cameraForTilt(pitch: number, bearing: number) {
    const ml = map.value;
    if (!ml || !framedPoints) return null;
    return cameraForPlaces(ml, framedPoints, fitPadding(), FIT_MAX_ZOOM, pitch, bearing);
  }

  // Changing the padding is a camera move: it would cancel the inertia of a pan in progress (the
  // drawer collapses as soon as the user pans), so wait for the map to stop. It is applied without
  // moving what is on screen: the point now in the middle of the new visible area becomes the
  // centre. Then, if the map still shows what it framed (the visitor hasn't moved it since), that
  // is framed again in the new visible area, alongside the drawer: a network framed above the
  // drawer in the middle spreads out over the map when the drawer goes down, and the reverse
  watch(mapPadding, () => {
    const ml = map.value;
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

  // "Mostra sulla mappa" and friends: frame the requested area in the part the drawer leaves visible
  watch(mapFitBounds, async (request) => {
    if (!request || !map.value) return;
    mapFitBounds.value = null;
    // Lower the drawer (mobile) if asked; it reports the new padding as it starts moving
    if (request.lowerDrawer) drawerState.value.request = "bottom";
    await nextTick();
    const ml = map.value;
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
    settleFraming(ml);
  });

  // After a camera move to the framed places: tilted, the terrain where the camera arrives may
  // load only then (and its relief grows with the tilt), raising the places on high ground. Once
  // the map is idle, frame them again if they moved (unless the visitor took over)
  function settleFraming(ml: MapLibreMap) {
    const points = framedPoints;
    if (!points) return;
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
  }

  return {
    toMapPadding,
    forgetFraming,
    zoomBy,
    showOpenedSite,
    flyToVisitor,
    cameraForTilt,
    settleFraming,
  };
}
