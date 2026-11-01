import MiniSearch from "minisearch";

// Fetching, parsing and searching the data all happen here, off the main thread.
// The index (list, search, map) is loaded first; the details (photos, description...) after it,
// in the background, and handed out one site at a time when a site is opened.
let miniSearch;
let details;
let detailsFailed = false;
const detailsWaiting = [];

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

async function load({ indexUrl, detailsUrl }) {
  try {
    const index = await fetchJson(indexUrl);
    // Rows: content_id, category_id, name, comune, localita, regione, lon, lat
    const items = index.rows.map(
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
  }
};
