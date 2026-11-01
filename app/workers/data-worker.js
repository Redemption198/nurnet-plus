import MiniSearch from "minisearch";

// Fetching, parsing and searching the ~4MB dataset all happen here, off the main thread
let miniSearch;

// Case, accents and apostrophe variants don't matter: "canne" finds "Cann'e"
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, "")
    .toLowerCase();
}

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try {
      const response = await fetch(data.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const geojson = await response.json();

      // Keep only what the app uses, so less data is copied back to the main thread
      const items = geojson.features.map((feature) => ({
        coordinates: feature.geometry.coordinates,
        ...feature.properties,
      }));

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
    }
  } else if (data.type === "search") {
    const indices = miniSearch ? miniSearch.search(data.query).map((result) => result.id) : [];
    self.postMessage({ type: "search", id: data.id, indices });
  }
};
