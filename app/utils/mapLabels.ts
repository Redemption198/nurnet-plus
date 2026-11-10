// The names our layers write on the map (the sites', the sight lines' ends): in the basemap's own
// font, basalt on a white halo, light on a dark one in dark mode
import type { ExpressionSpecification, MapLibreMap } from "maplibre-gl";
import { BRAND, BRAND_DARK } from "./brand";

// Names under the markers once zoomed in
export const LABEL_ZOOM = 12.5;

// The basemap's own regular font for our labels (OpenFreeMap serves the glyphs for it)
export function labelFont(ml: MapLibreMap): string[] {
  const font = ml
    .getStyle()
    .layers.map((layer) => (layer.layout as Record<string, unknown> | undefined)?.["text-font"])
    .find(
      (value): value is string[] =>
        Array.isArray(value) &&
        value.every((part) => typeof part === "string") &&
        /Regular/.test(String(value[0])),
    );
  return font ?? ["Noto Sans Regular"];
}

// Names under the markers from `fromZoom` on; a name only shows where it fits
export function labelLayout(ml: MapLibreMap, fromZoom: number) {
  return {
    "text-field": ["step", ["zoom"], "", fromZoom, ["get", "name"]] as ExpressionSpecification,
    "text-font": labelFont(ml),
    "text-size": 12,
    "text-anchor": "top" as const,
    "text-offset": [0, 0.3] as [number, number],
    "text-max-width": 9,
    "text-optional": true,
  };
}

export function labelPaint(dark: boolean) {
  return {
    "text-color": dark ? BRAND_DARK.basalt : BRAND.basalt,
    "text-halo-color": dark ? "rgba(29, 24, 25, 0.9)" : "rgba(255, 255, 255, 0.9)",
    "text-halo-width": 1.5,
  };
}
