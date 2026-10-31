import DataWorker from "~/workers/data-worker.js?worker";

export interface NurnetPOI {
  coordinates: [number, number];
  content_id: string;
  category_id: string | null;
  name: string;
  comune: string;
  localita: string;
  regione: string;
  [key: string]: unknown;
}

// One worker for the whole app: it loads the dataset once and answers searches
let worker: Worker | undefined;
let lastSearchId = 0;
const pendingSearches = new Map<number, (indices: number[]) => void>();
const items = shallowRef<NurnetPOI[] | null>(null);
const error = ref<string | null>(null);

function startWorker(url: string) {
  worker = new DataWorker();
  worker.onmessage = ({ data }) => {
    if (data.type === "data") {
      items.value = data.items;
    } else if (data.type === "search") {
      pendingSearches.get(data.id)?.(data.indices);
      pendingSearches.delete(data.id);
    } else if (data.type === "error") {
      error.value = data.message;
      console.error("NurNet data worker:", data.message);
    }
  };
  worker.postMessage({ type: "load", url });
}

export function useNurnetData() {
  const config = useRuntimeConfig();

  if (import.meta.client && !worker) {
    startWorker(new URL(`${config.app.baseURL}nurnet-data.json`, location.href).href);
  }

  // Resolves with the indices (into `items`) of the matching POIs
  function search(query: string) {
    return new Promise<number[]>((resolve) => {
      const id = ++lastSearchId;
      pendingSearches.set(id, resolve);
      worker?.postMessage({ type: "search", id, query });
    });
  }

  return { items, error, search };
}
