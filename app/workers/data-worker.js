import Fuse from "fuse.js";

// Fetching, parsing and searching the ~4MB dataset all happen here, off the main thread
let fuse;

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

      fuse = new Fuse(items, { keys: ["name", "comune", "localita", "regione"] });
      self.postMessage({ type: "data", items });
    } catch (error) {
      self.postMessage({ type: "error", message: String(error) });
    }
  } else if (data.type === "search") {
    const indices = fuse ? fuse.search(data.query).map((result) => result.refIndex) : [];
    self.postMessage({ type: "search", id: data.id, indices });
  }
};
