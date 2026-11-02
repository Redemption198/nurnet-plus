import MiniSearch from "minisearch";
import {
  buildVisibility,
  detailsFor,
  normalize,
  parseIndex,
  tokenize,
  visibleFrom,
  type DetailsFile,
  type IndexFile,
  type VisibilityFile,
} from "./nurnet-data";

// Fetching, parsing and searching the data all happen here, off the main thread.
// The index (list, search, map) is loaded first; the details (photos, description...) when the app
// asks (once idle, or when a site is opened); the line of sight the first time a nuraghe is opened

export type WorkerRequest =
  | { type: "load"; indexUrl: string; detailsUrl: string; visibilityUrl: string }
  | { type: "load-details" }
  | { type: "search"; requestId: number; query: string }
  | { type: "details"; requestId: number; id: string }
  | { type: "visible"; requestId: number; id: string };

export type WorkerReply =
  | { type: "data"; items: NurnetPOI[] }
  | { type: "error"; message: string }
  | { type: "details-error"; message: string }
  | { type: "search"; requestId: number; result: number[] }
  | { type: "details"; requestId: number; result: NurnetDetails | null }
  | { type: "visible"; requestId: number; result: VisibleSite[] | null };

let miniSearch: MiniSearch<{ i: number }> | undefined;
let items: NurnetPOI[] = [];
let urls: { details: string; visibility: string } | undefined;
// Each is fetched once; a failed load is forgotten so the next request tries again
let details: Promise<DetailsFile> | undefined;
let detailsLoaded: DetailsFile | undefined;
let visibility: Promise<ReturnType<typeof buildVisibility>> | undefined;

const reply = (message: WorkerReply) => self.postMessage(message);

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function loadDetails() {
  details ??= fetchJson<DetailsFile>(urls!.details).then(
    (file) => (detailsLoaded = file),
    (error: unknown) => {
      details = undefined;
      reply({ type: "details-error", message: String(error) });
      throw error;
    },
  );
  return details;
}

function loadVisibility() {
  visibility ??= fetchJson<VisibilityFile>(urls!.visibility)
    .then((file) => buildVisibility(file, items))
    .catch((error: unknown) => {
      visibility = undefined;
      throw error;
    });
  return visibility;
}

async function load({
  indexUrl,
  detailsUrl,
  visibilityUrl,
}: Extract<WorkerRequest, { type: "load" }>) {
  urls = { details: detailsUrl, visibility: visibilityUrl };
  try {
    items = parseIndex(await fetchJson<IndexFile>(indexUrl));
    miniSearch = new MiniSearch({
      idField: "i",
      fields: ["name", "comune", "localita", "regione"],
      tokenize,
      processTerm: (term) => normalize(term) || null,
      searchOptions: {
        // As-you-type: the last word can be partial, and small typos are forgiven
        prefix: true,
        fuzzy: 0.2,
        // A match in the name matters most, then the comune
        boost: { name: 3, comune: 1.5 },
        // An exact word anywhere beats a typo or partial match in the name
        // (e.g. "barumini" lists the POIs in Barumini before "Nuraghe Ladumini")
        weights: { fuzzy: 0.1, prefix: 0.3 },
        combineWith: "AND",
      },
    });
    miniSearch.addAll(
      items.map(({ name, comune, localita, regione }, i) => ({
        i,
        name,
        comune,
        localita,
        regione,
      })),
    );
    reply({ type: "data", items });
  } catch (error) {
    reply({ type: "error", message: String(error) });
  }
}

async function answer(request: Exclude<WorkerRequest, { type: "load" | "load-details" }>) {
  const { requestId } = request;
  if (request.type === "search") {
    const result = miniSearch
      ? miniSearch.search(request.query).map((match) => match.id as number)
      : [];
    reply({ type: "search", requestId, result });
  } else if (request.type === "details") {
    const file = await loadDetails().catch(() => null);
    reply({ type: "details", requestId, result: file && detailsFor(file, request.id) });
  } else {
    try {
      // The elevations (for the lines in 3D) come with the details: wait for them, but answer
      // without them if they fail (the map falls back to the terrain)
      const [network] = await Promise.all([loadVisibility(), loadDetails().catch(() => null)]);
      const elevationOf = (id: string) => detailsLoaded?.sites[id]?.elevation;
      const result = visibleFrom(request.id, network, items, elevationOf);
      reply({ type: "visible", requestId, result });
    } catch (error) {
      console.error("NurNet visibility:", String(error));
      reply({ type: "visible", requestId, result: null });
    }
  }
}

self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === "load") void load(data);
  else if (data.type === "load-details") void loadDetails().catch(() => {});
  else void answer(data);
};
