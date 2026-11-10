// fitBounds frames places as if the map were flat: tilted, the near side is drawn bigger and the
// far side smaller, and places on high ground are drawn higher (even untilted, the camera's
// perspective pushes them outwards), so some end up under the drawer or off screen.
// cameraForPlaces starts from its flat camera and corrects it on a copy of the map's camera,
// where the places are projected as drawn (tilt and terrain), until they fill the free area
import { LngLat, Point as ScreenPoint, type MapLibreMap } from "maplibre-gl";

// The map's camera (its "transform", in MapLibre 6 inside the internal `_camera`; its type isn't
// exported, so this is the part used here). Without it, framing falls back to fitBounds
interface CameraCopy {
  center: LngLat;
  zoom: number;
  setCenter(center: LngLat): void;
  setZoom(zoom: number): void;
  setPitch(pitch: number): void;
  setBearing(bearing: number): void;
  locationToScreenPoint(place: LngLat, terrain?: MapLibreMap["terrain"]): ScreenPoint;
  screenPointToLocation(point: ScreenPoint): LngLat;
}

export interface FitPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// The bounds of a set of places
const boundsOf = (points: [number, number][]): [[number, number], [number, number]] => [
  [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))],
  [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))],
];

// `fit`: room around the places, on top of the map's own padding. `pitch` and `bearing`: frame
// them for a tilt the map is about to take (the 3D button). Null when it can't be worked out
export function cameraForPlaces(
  ml: MapLibreMap,
  points: [number, number][],
  fit: FitPadding,
  maxZoom: number,
  pitch = ml.getPitch(),
  bearing = ml.getBearing(),
) {
  const flat = ml.cameraForBounds(boundsOf(points), { padding: fit, maxZoom, bearing });
  if (!flat?.center || flat.zoom == null) return null;

  const transform = (ml as unknown as { _camera?: { transform?: { clone(): CameraCopy } } })._camera
    ?.transform;
  if (!transform) return null;
  const camera = transform.clone();
  camera.setPitch(pitch);
  camera.setBearing(bearing);
  camera.setCenter(LngLat.convert(flat.center));
  camera.setZoom(flat.zoom);
  const { top = 0, right = 0, bottom = 0, left = 0 } = ml.getPadding();
  const { width, height } = ml.getContainer().getBoundingClientRect();
  // The free area, where the places must end up
  const area = {
    left: left + fit.left,
    right: width - right - fit.right,
    top: top + fit.top,
    bottom: height - bottom - fit.bottom,
  };
  if (area.right <= area.left || area.bottom <= area.top) return null;
  const places = points.map((point) => LngLat.convert(point));

  for (let step = 0; step < 8; step++) {
    const drawn = places.map((place) =>
      camera.locationToScreenPoint(place, ml.terrain ?? undefined),
    );
    const xs = drawn.map((p) => p.x);
    const ys = drawn.map((p) => p.y);
    const box = {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
    // Move what is drawn in the middle of the places to the middle of the free area
    const shift = new ScreenPoint(
      (box.left + box.right) / 2 - (area.left + area.right) / 2,
      (box.top + box.bottom) / 2 - (area.top + area.bottom) / 2,
    );
    const middle = camera.locationToScreenPoint(camera.center);
    camera.setCenter(camera.screenPointToLocation(middle.add(shift)));
    // And zoom so they fill it (a single place, or places on a line, only by the other side)
    const scales = [
      (area.right - area.left) / Math.max(box.right - box.left, 1),
      (area.bottom - area.top) / Math.max(box.bottom - box.top, 1),
    ];
    const zoom = Math.min(camera.zoom + Math.log2(Math.min(...scales)), maxZoom);
    const done = Math.abs(zoom - camera.zoom) < 0.01 && shift.mag() < 1;
    camera.setZoom(zoom);
    if (done) break;
  }
  return { center: camera.center, zoom: camera.zoom };
}
