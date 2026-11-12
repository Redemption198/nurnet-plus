/// <reference types="node" />
// The built site (.output/public) served as GitHub Pages serves it, for the specs in this folder:
// under /nurnet-plus/, a folder's index.html, /foo from foo.html, and anything else 404.html with
// a 404 status. The dev server answers every address with the app, which hid what a shared link
// gets once deployed. `vpx e2e-built/serve.ts [port]`
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../.output/public/", import.meta.url));
const port = Number(process.argv[2] ?? 4300);
const BASE = "/nurnet-plus/";
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

if (!existsSync(join(root, "200.html"))) {
  console.error("No built site in .output/public: run `vp run generate` first");
  process.exit(1);
}

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (path === "/nurnet-plus") return response.writeHead(301, { location: BASE }).end();
  let file = path.startsWith(BASE) ? join(root, path.slice(BASE.length)) : undefined;
  if (file && existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith("/")) return response.writeHead(301, { location: `${path}/` }).end();
    file = join(file, "index.html");
  }
  if (file && !existsSync(file) && existsSync(`${file}.html`)) file += ".html";
  let status = 200;
  if (!file || !existsSync(file)) {
    status = 404;
    file = join(root, "404.html");
  }
  response.writeHead(status, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "max-age=600",
  });
  response.end(readFileSync(file));
}).listen(port, () => console.log(`Built site on http://localhost:${port}${BASE}`));
