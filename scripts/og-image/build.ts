/// <reference types="node" />
// The link-preview image (public/og-image.jpg, 1200×630): "NurNet" with the logo as its plus, and
// Sardinia drawn by the sites themselves, one dot per site of public/nurnet-index.json, over a
// faint coastline. Run after a data refresh: `vp run og-image`
//
// sardinia.json: the island's coastline from Natural Earth 1:10m (public domain), via world-atlas.
// fraunces-600-latin.woff2: the app's display face (SIL Open Font License)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseIndex, type IndexFile } from "../../app/workers/nurnet-data.ts";

const here = new URL(".", import.meta.url);
const root = new URL("../../", import.meta.url);
const read = (path: string, base = root) => readFileSync(new URL(path, base), "utf8");

const sites = parseIndex(JSON.parse(read("public/nurnet-index.json")) as IndexFile);
const coast = JSON.parse(read("sardinia.json", here)) as [number, number][];

const W = 1200;
const H = 630;

// The logo's five circles, from the app's own SVG
const logo = read("app/assets/nurnet-plus.svg");
const circles = [
  ...logo.matchAll(/<circle[^>]*?cx="([\d.]+)"[^>]*?cy="([\d.]+)"[^>]*?r="([\d.]+)"/gs),
]
  .map(([, cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`)
  .join("");

// Equirectangular, longitude scaled by cos(40°): the island's true proportions at its latitude.
// It sits inside the centre square, so the square crops of chat apps keep it whole
const k = Math.cos((40 * Math.PI) / 180);
const lons = [...coast.map((p) => p[0]), ...sites.map((site) => site.coordinates[0])];
const lats = [...coast.map((p) => p[1]), ...sites.map((site) => site.coordinates[1])];
const [minLon, maxLat] = [Math.min(...lons), Math.max(...lats)];
const pad = 48;
const scale = (H - 2 * pad) / (maxLat - Math.min(...lats));
const islandWidth = (Math.max(...lons) - minLon) * k * scale;
const left = 760 - islandWidth / 2;
const x = (lon: number) => (left + (lon - minLon) * k * scale).toFixed(1);
const y = (lat: number) => (pad + (maxLat - lat) * scale).toFixed(1);

const outline = `M${coast.map(([lon, lat]) => `${x(lon)} ${y(lat)}`).join("L")}Z`;
const dots = sites
  .map(({ coordinates: [lon, lat] }) => `<circle cx="${x(lon)}" cy="${y(lat)}" r="2"/>`)
  .join("");

const font = new URL("fraunces-600-latin.woff2", here).href;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Fraunces; src: url(${font}) format("woff2"); font-weight: 600; }
* { margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  position: relative;
  background: linear-gradient(to right bottom, #e86d10, #c44f01, #a84401);
  color: #fff;
  font-family: Fraunces, serif;
  font-weight: 600;
  -webkit-font-smoothing: antialiased;
}
.copy { position: absolute; left: 80px; top: 50%; transform: translateY(-50%); }
.name { font-size: 112px; line-height: 1; letter-spacing: -0.02em; white-space: nowrap; }
/* The logo is the plus: as tall as the capitals, centred on them */
.plus { width: 0.7em; height: 0.7em; margin-left: 0.04em; vertical-align: 0; fill: #fff; }
.tag { margin-top: 32px; font-size: 41px; line-height: 1.2; letter-spacing: -0.01em; }
.island { position: absolute; inset: 0; }
</style>
<svg class="island" width="${W}" height="${H}" aria-hidden="true">
  <path d="${outline}" fill="#fff" fill-opacity="0.14"/>
  <g fill="#fff" fill-opacity="0.78">${dots}</g>
</svg>
<div class="copy">
  <p class="name">NurNet<svg class="plus" viewBox="0 0 64 64" aria-hidden="true">${circles}</svg></p>
  <p class="tag">Esplora i siti della<br>Sardegna nuragica</p>
</div>`;

const work = mkdtempSync(join(tmpdir(), "og-image-"));
try {
  const page = join(work, "og-image.html");
  const png = join(work, "og-image.png");
  writeFileSync(page, html);
  execFileSync(
    "vp",
    ["dlx", "playwright@1.64.0", "screenshot", "--viewport-size=1200,630", `file://${page}`, png],
    { stdio: "inherit" },
  );
  // JPEG: WhatsApp skips preview images much over 300 KB
  const out = new URL("public/og-image.jpg", root).pathname;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-q:v", "3", out]);
  console.log(`${sites.length} sites → ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
