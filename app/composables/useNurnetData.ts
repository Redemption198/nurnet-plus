import DataWorker from "~/workers/data-worker.ts?worker";
import type { WorkerReply, WorkerRequest } from "~/workers/data-worker.ts";

// Only nuraghi have line-of-sight data
export const isNuraghe = (category: string | null) => /^1[0-3]$/.test(category ?? "");

// One worker for the whole app: it loads the data once and answers searches and details.
// Browser-only (started in useNurnetData on the client), so this module state is never shared
// between server renders
let worker: Worker | undefined;
let urls: [index: string, details: string, visibility: string] | undefined;
let lastRequestId = 0;
const pending = new Map<number, (value: unknown) => void>();
const items = shallowRef<NurnetPOI[] | null>(null);
const error = ref<string | null>(null);

function post(message: WorkerRequest) {
  worker?.postMessage(message);
}

function startWorker([indexUrl, detailsUrl, visibilityUrl]: NonNullable<typeof urls>) {
  worker = new DataWorker();
  worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
    if (data.type === "data") {
      items.value = data.items;
      // The details (photos, descriptions: ~1 MB) aren't needed until a site is opened: fetch
      // them once the browser is idle, so they don't compete with the map's first tiles
      const loadDetails = () => post({ type: "load-details" });
      if ("requestIdleCallback" in window) requestIdleCallback(loadDetails, { timeout: 4000 });
      else setTimeout(loadDetails, 2000);
    } else if (data.type === "error") {
      error.value = data.message;
      console.error("NurNet data worker:", data.message);
    } else if (data.type === "details-error") {
      console.error("NurNet data worker:", data.message);
    } else {
      pending.get(data.requestId)?.(data.result);
      pending.delete(data.requestId);
    }
  };
  post({ type: "load", indexUrl, detailsUrl, visibilityUrl });
}

// A request message without its id (Omit on each member of the union, not on the union)
type Question = WorkerRequest extends infer R
  ? R extends { requestId: number }
    ? Omit<R, "requestId">
    : never
  : never;

function request<T>(message: Question) {
  return new Promise<T>((resolve) => {
    const requestId = ++lastRequestId;
    pending.set(requestId, resolve as (value: unknown) => void);
    post({ ...message, requestId } as WorkerRequest);
  });
}

export function useNurnetData() {
  const config = useRuntimeConfig();
  const router = useRouter();
  const site = useCurrentSite();

  if (import.meta.client && !worker) {
    const url = (file: string) => new URL(`${config.app.baseURL}${file}`, location.href).href;
    urls = [url("nurnet-index.json"), url("nurnet-details.json"), url("nurnet-visibility.json")];
    startWorker(urls);
  }

  // Resolves with the indices (into `items`) of the matching POIs, best match first
  function search(query: string) {
    return request<number[]>({ type: "search", query });
  }

  // Resolves once the details file has loaded; null if it couldn't be loaded
  function getDetails(id: string) {
    return request<NurnetDetails | null>({ type: "details", id });
  }

  // The sites visible from a nuraghe, nearest first; null if the data couldn't be loaded
  function getVisible(id: string) {
    return request<VisibleSite[] | null>({ type: "visible", id });
  }

  // Merges `fields` into the open site, unless the user has moved on to another one meanwhile
  function update(id: string, fields: Partial<CurrentSite>) {
    if (site.value?.content_id === id) site.value = { ...site.value, ...fields };
  }

  async function loadVisible(poi: NurnetPOI) {
    const visible = await getVisible(poi.content_id);
    update(poi.content_id, { visible: visible ?? [], visibleStatus: visible ? "loaded" : "error" });
  }

  async function loadDetails(poi: NurnetPOI) {
    const details = await getDetails(poi.content_id);
    update(poi.content_id, {
      ...details,
      photos: details?.photos ?? [],
      detailsStatus: details ? "loaded" : "error",
    });
  }

  // Opens a POI right away with what the index has; its details are filled in when available.
  // `navigate: false` when the route is already the POI's (opened from its URL)
  function openPOI(poi: NurnetPOI, { navigate = true } = {}) {
    site.value = {
      ...poi,
      photos: [],
      detailsStatus: "loading",
      visible: [],
      visibleStatus: isNuraghe(poi.category_id) ? "loading" : "none",
    };
    if (navigate) void router.push(`/poi/${poi.content_id}`);
    if (isNuraghe(poi.category_id)) void loadVisible(poi);
    void loadDetails(poi);
  }

  // "Riprova" after a failed load: asks the worker again for what failed
  function retry() {
    const poi = site.value;
    if (!poi) return;
    if (poi.detailsStatus === "error") {
      update(poi.content_id, { detailsStatus: "loading" });
      void loadDetails(poi);
    }
    if (poi.visibleStatus === "error") {
      update(poi.content_id, { visibleStatus: "loading" });
      void loadVisible(poi);
    }
  }

  // Starts over after the index failed to load
  function reload() {
    if (!urls) return;
    error.value = null;
    worker?.terminate();
    startWorker(urls);
  }

  return { items, error, search, getDetails, getVisible, openPOI, retry, reload };
}
