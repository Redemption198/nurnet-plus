// The map's markers, drawn when the map loads from the same pictograms (the icon components)
// and colours (categories.ts) as the rest of the app, at the screen's resolution:
// - a disc for every site: the category colour, a white ring and a faint dark edge so it stands
//   out from roads and hillshade
// - a bigger, lifted disc for the site hovered in the list
// - a pin for the open site, its tip on the site
import type { ExpressionSpecification, MapLibreMap } from "maplibre-gl";
import dolmen from "../components/icons/IconDolmen.vue?raw";
import domus from "../components/icons/IconDomusJanas.vue?raw";
import tomba from "../components/icons/IconTombaGiganti.vue?raw";
import villaggio from "../components/icons/IconVillaggioNuragico.vue?raw";
import menhir from "../components/icons/IconMenhir.vue?raw";
import acqua from "../components/icons/IconCultoAcqua.vue?raw";
import nuraghe from "../components/icons/IconNurnetPlus.vue?raw";

const COMPONENTS: Record<NonNullable<Category["icon"]>, string> = {
  IconNurnetPlus: nuraghe,
  IconDomusJanas: domus,
  IconTombaGiganti: tomba,
  IconVillaggioNuragico: villaggio,
  IconMenhir: menhir,
  IconCultoAcqua: acqua,
  IconDolmen: dolmen,
};

// The "?" of lucide's circle-help (the list's icon for sites without a pictogram), framed so it
// is as big as the other pictograms
const QUESTION_MARK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 5 16 16" fill="none" stroke="#fff" ' +
  'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';

// A component's <svg> contents, white, as a standalone SVG
function pictogramSvg(component: string) {
  const inner = component.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? "";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    `viewBox="0 0 64 64" width="256" height="256" fill="#fff">${inner}</svg>`
  );
}

async function loadSvg(svg: string) {
  const image = new Image(256, 256);
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}

// Map image names: one per category, by its place in CATEGORIES
const markerName = (index: number) => `marker-${index}`;
const HOVER = "-hover";
const PIN = "-pin";

// category_id -> marker name
export const markerForCategory: ExpressionSpecification = [
  "match",
  ["to-string", ["get", "category_id"]],
  ...CATEGORIES.flatMap((category, index) =>
    category.ids.length ? [category.ids, markerName(index)] : [],
  ),
  markerName(CATEGORIES.length - 1),
] as ExpressionSpecification;

const withSuffix = (suffix: string): ExpressionSpecification => [
  "concat",
  markerForCategory,
  suffix,
];
export const hoverMarkerForCategory = withSuffix(HOVER);
export const pinForCategory = withSuffix(PIN);

// Where markers overlap while zoomed out, which win (lower first): the landmarks first, sites
// of unknown kind last
const PRIORITY = [
  "Nuraghe",
  "Tombe dei giganti",
  "Culto dell'acqua",
  "Villaggi",
  "Domus de janas",
  "Dolmen",
  "Menhir",
  "Unicum e Grotte Tafoni",
  "Sconosciuto",
];
export const markerPriority: ExpressionSpecification = [
  "match",
  ["to-string", ["get", "category_id"]],
  ...CATEGORIES.flatMap((category) =>
    category.ids.length ? [category.ids, PRIORITY.indexOf(category.name)] : [],
  ),
  PRIORITY.length - 1,
] as ExpressionSpecification;

// Sizes in css px. A disc is 32 px at icon-size 1, as the old 64 px tiles at pixelRatio 2
export const MARKER_SIZE = 32;
const HOVER_SCALE = 1.15;
const PIN_RADIUS = 21; // the head, ring included: as wide as the old selected marker (1.3x)
const PIN_TAIL = 13; // from the bottom of the head to the tip
// Room around the hover disc and the pin for their shadow; the layers offset them by this so
// their bottom (the pin's tip) still sits on the site
export const SHADOW_ROOM = 6;

const INK = "49, 37, 40"; // basalt
const RING = 2; // white ring, in disc-size units (32 px)
const GLYPH = 0.84; // pictogram size relative to the disc inside the ring (the icons have their own margin)

function drawGlyph(
  context: CanvasRenderingContext2D,
  glyph: HTMLImageElement,
  x: number,
  y: number,
  radius: number,
) {
  const size = radius * 2 * GLYPH;
  context.drawImage(glyph, x - size / 2, y - size / 2, size, size);
}

// A disc centred at (x, y), `scale` times the base size
function drawDisc(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  glyph: HTMLImageElement,
  shadow: boolean,
) {
  const outer = (MARKER_SIZE / 2) * scale;
  const ring = RING * scale;
  context.save();
  if (shadow) {
    context.shadowColor = `rgba(${INK}, 0.35)`;
    context.shadowBlur = 5;
    context.shadowOffsetY = 1.5;
  }
  context.beginPath();
  context.arc(x, y, outer, 0, Math.PI * 2);
  context.fillStyle = `rgba(${INK}, 0.35)`;
  context.fill();
  context.restore();

  context.beginPath();
  context.arc(x, y, outer - 0.6 * scale, 0, Math.PI * 2);
  context.fillStyle = "#fff";
  context.fill();

  const inner = outer - 0.6 * scale - ring;
  context.beginPath();
  context.arc(x, y, inner, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  drawGlyph(context, glyph, x, y, inner);
}

// A teardrop: a circle of `radius` at (x, y) narrowing to a tip `depth` below its centre
function teardrop(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  depth: number,
) {
  // The sides leave the circle where they are tangent to it
  const spread = Math.acos(radius / depth);
  context.beginPath();
  context.moveTo(x, y + depth);
  context.arc(x, y, radius, Math.PI / 2 + spread, Math.PI / 2 - spread + Math.PI * 2);
  context.closePath();
}

function drawPin(
  context: CanvasRenderingContext2D,
  color: string,
  glyph: HTMLImageElement,
  x: number,
  y: number,
) {
  const depth = PIN_RADIUS + PIN_TAIL;
  context.save();
  context.shadowColor = `rgba(${INK}, 0.4)`;
  context.shadowBlur = 6;
  context.shadowOffsetY = 2;
  teardrop(context, x, y, PIN_RADIUS, depth);
  context.fillStyle = "#fff";
  context.fill();
  context.restore();
  // The faint dark edge, as on the discs
  context.lineWidth = 0.6;
  context.strokeStyle = `rgba(${INK}, 0.35)`;
  context.stroke();

  const inner = PIN_RADIUS - 2.5;
  // Same tip angle, so the white edge is as thick along the sides as around the head
  teardrop(context, x, y, inner, (inner * depth) / PIN_RADIUS);
  context.fillStyle = color;
  context.fill();
  drawGlyph(context, glyph, x, y, inner);
}

// Draws `paint` into a canvas of `width` x `height` css px at `ratio` and adds it to the map
function addDrawn(
  ml: MapLibreMap,
  name: string,
  width: number,
  height: number,
  ratio: number,
  paint: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.scale(ratio, ratio);
  paint(context);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  if (ml.hasImage(name)) ml.removeImage(name);
  ml.addImage(name, image, { pixelRatio: ratio });
}

let glyphs: Promise<HTMLImageElement[]> | undefined;

// Adds (or redraws) every marker image, sharp at the current screen resolution
export async function addMarkerImages(ml: MapLibreMap) {
  glyphs ??= Promise.all(
    CATEGORIES.map((category) =>
      loadSvg(category.icon ? pictogramSvg(COMPONENTS[category.icon]) : QUESTION_MARK),
    ),
  );
  const images = await glyphs;
  // Drawn for the largest base icon-size (0.9 at high zoom), never below 2x so they stay sharp
  // when zooming the page
  const ratio = Math.max(2, window.devicePixelRatio || 1);

  CATEGORIES.forEach((category, index) => {
    const glyph = images[index]!;
    const name = markerName(index);
    addDrawn(ml, name, MARKER_SIZE, MARKER_SIZE, ratio, (context) =>
      drawDisc(context, MARKER_SIZE / 2, MARKER_SIZE / 2, 1, category.color, glyph, false),
    );

    const hover = MARKER_SIZE * HOVER_SCALE + SHADOW_ROOM * 2;
    addDrawn(ml, name + HOVER, hover, hover, ratio, (context) =>
      drawDisc(context, hover / 2, hover / 2, HOVER_SCALE, category.color, glyph, true),
    );

    const width = PIN_RADIUS * 2 + SHADOW_ROOM * 2;
    const height = PIN_RADIUS * 2 + PIN_TAIL + SHADOW_ROOM * 2;
    addDrawn(ml, name + PIN, width, height, ratio, (context) =>
      drawPin(context, category.color, glyph, width / 2, SHADOW_ROOM + PIN_RADIUS),
    );
  });
}

// Redraws the markers when the screen's resolution changes (a window moved to another
// display, the page zoomed). Returns a function that stops watching
export function watchMarkerResolution(ml: MapLibreMap) {
  let query: MediaQueryList | undefined;
  const watch = () => {
    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener("change", onChange, { once: true });
  };
  const onChange = () => {
    void addMarkerImages(ml);
    watch();
  };
  watch();
  return () => query?.removeEventListener("change", onChange);
}
