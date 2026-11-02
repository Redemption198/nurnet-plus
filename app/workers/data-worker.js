import MiniSearch from "minisearch";

// Fetching, parsing and searching the data all happen here, off the main thread.
// The index (list, search, map) is loaded first; the details (photos, description...) after it,
// in the background, and handed out one site at a time when a site is opened.
let miniSearch;
let items;
let details;
let detailsFailed = false;
const detailsWaiting = [];
// Line of sight between nuraghi, loaded the first time a nuraghe is opened:
// content_id -> [{ i (index into items), height (metres, 0-15) }]
let visibility;
let visibilityUrl;

// Case, accents and apostrophe variants don't matter: "canne" finds "Cann'e"
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, "")
    .toLowerCase();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function detailsFor(id) {
  if (detailsFailed) return null;
  const site = details.sites[id] ?? {};
  return {
    ...site,
    photos: (site.photos ?? []).map((url) =>
      url.startsWith("http") ? url : details.photoBase + url,
    ),
  };
}

function replyDetails({ requestId, id }) {
  self.postMessage({ type: "details", requestId, details: detailsFor(id) });
}

// Distance in metres between two lon/lat points (equirectangular, fine at this scale)
function distance([lon1, lat1], [lon2, lat2]) {
  const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180)) * 111_320;
  const y = (lat2 - lat1) * 110_540;
  return Math.hypot(x, y);
}

// Pairs are [a, b, direct, inverse] in decimetres. Which way `direct` looks isn't documented, so
// each pair gets one value both ways: the mean of the two, i.e. how much of the towers can be seen
// from each other on average
async function loadVisibility() {
  const file = await fetchJson(visibilityUrl);
  const indexOf = new Map(items.map((item, i) => [item.content_id, i]));
  const byId = new Map();
  const add = (id, i, height) => {
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push({ i, height });
  };
  for (const [a, b, direct, inverse] of file.pairs) {
    const ia = indexOf.get(a);
    const ib = indexOf.get(b);
    if (ia === undefined || ib === undefined) continue;
    const height = (direct + inverse) / 20;
    add(a, ib, height);
    add(b, ia, height);
  }
  return byId;
}

// The sites visible from a site, nearest first; null if the file couldn't be loaded
async function replyVisible({ requestId, id }) {
  try {
    visibility ??= loadVisibility();
    const from = items[items.findIndex((item) => item.content_id === id)];
    const visible = ((await visibility).get(id) ?? [])
      .map(({ i, height }) => ({
        i,
        height,
        distance: Math.round(distance(from.coordinates, items[i].coordinates)),
      }))
      .sort((x, y) => x.distance - y.distance);
    self.postMessage({ type: "visible", requestId, visible });
  } catch (error) {
    visibility = undefined; // try again next time
    console.error("NurNet visibility:", String(error));
    self.postMessage({ type: "visible", requestId, visible: null });
  }
}

async function load({ indexUrl, detailsUrl, visibilityUrl: url }) {
  visibilityUrl = url;
  try {
    const index = await fetchJson(indexUrl);
    // Rows: content_id, category_id, name, comune, localita, regione, lon, lat
    items = index.rows.map(
      ([content_id, category_id, name, comune, localita, regione, lon, lat]) => ({
        content_id,
        category_id,
        name,
        comune,
        localita,
        regione,
        coordinates: [lon, lat],
      }),
    );

    miniSearch = new MiniSearch({
      idField: "i",
      fields: ["name", "comune", "localita", "regione"],
      // Split on spaces and punctuation, keep apostrophes inside words ("Cann'e" -> "canne")
      tokenize: (text) => text.split(/[\s,.;:()/\\-]+/),
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
      items.map((item, i) => ({
        i,
        name: item.name ?? "",
        comune: item.comune ?? "",
        localita: item.localita ?? "",
        regione: item.regione ?? "",
      })),
    );

    self.postMessage({ type: "data", items });
  } catch (error) {
    self.postMessage({ type: "error", message: String(error) });
    return;
  }

  try {
    details = await fetchJson(detailsUrl);
  } catch (error) {
    detailsFailed = true;
    self.postMessage({ type: "details-error", message: String(error) });
  }
  // Answer the sites opened while the details were still loading
  detailsWaiting.splice(0).forEach(replyDetails);
}

self.onmessage = ({ data }) => {
  if (data.type === "load") {
    void load(data); // handles its own errors
  } else if (data.type === "search") {
    const indices = miniSearch ? miniSearch.search(data.query).map((result) => result.id) : [];
    self.postMessage({ type: "search", id: data.id, indices });
  } else if (data.type === "details") {
    if (details || detailsFailed) replyDetails(data);
    else detailsWaiting.push(data);
  } else if (data.type === "visible") {
    // Sites are opened from the list or the map, so the index has loaded
    void replyVisible(data);
  }
};
