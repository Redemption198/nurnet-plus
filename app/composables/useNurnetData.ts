import DataWorker from "~/workers/data-worker.js?worker";

// From the index: what the list, search and map need
export interface NurnetPOI {
  coordinates: [number, number];
  content_id: string;
  category_id: string | null;
  name: string;
  comune: string;
  localita: string;
  regione: string;
}

// From the details file, loaded in the background
export interface NurnetDetails {
  description?: string;
  source?: string;
  youtube?: string;
  stato?: string;
  verified?: boolean;
  date?: string;
  photos: string[];
  // From the NurNet Geoportale (geo.nurnet.net), for most sites
  elevation?: number;
  typology?: string;
  period?: string;
  lithology?: string;
  landUse?: string;
  riverDistance?: number;
  springDistance?: number;
  coastDistance?: number;
}

// A site visible from the open one (line of sight between nuraghi, from CRS4)
export interface VisibleSite {
  i: number; // index into `items`
  height: number; // metres of tower visible, 0-15, the mean of both directions
  distance: number; // metres
  elevation?: number; // metres above sea level
}

// Only nuraghi have line-of-sight data
export const isNuraghe = (category: string | null) => /^1[0-3]$/.test(category ?? "");

// One worker for the whole app: it loads the data once and answers searches and details
let worker: Worker | undefined;
let lastRequestId = 0;
const pending = new Map<number, (value: never) => void>();
const items = shallowRef<NurnetPOI[] | null>(null);
const error = ref<string | null>(null);

function startWorker(indexUrl: string, detailsUrl: string, visibilityUrl: string) {
  worker = new DataWorker();
  worker.onmessage = ({ data }) => {
    if (data.type === "data") {
      items.value = data.items;
    } else if (data.type === "search") {
      pending.get(data.id)?.(data.indices as never);
      pending.delete(data.id);
    } else if (data.type === "details") {
      pending.get(data.requestId)?.(data.details as never);
      pending.delete(data.requestId);
    } else if (data.type === "visible") {
      pending.get(data.requestId)?.(data.visible as never);
      pending.delete(data.requestId);
    } else if (data.type === "error" || data.type === "details-error") {
      if (data.type === "error") error.value = data.message;
      console.error("NurNet data worker:", data.message);
    }
  };
  worker.postMessage({ type: "load", indexUrl, detailsUrl, visibilityUrl });
}

function request<T>(message: Record<string, unknown>, idKey: string) {
  return new Promise<T>((resolve) => {
    const id = ++lastRequestId;
    pending.set(id, resolve as (value: never) => void);
    worker?.postMessage({ ...message, [idKey]: id });
  });
}

export function useNurnetData() {
  const config = useRuntimeConfig();
  const router = useRouter();
  const currentPOI = useCurrentPOI();

  if (import.meta.client && !worker) {
    const url = (file: string) => new URL(`${config.app.baseURL}${file}`, location.href).href;
    startWorker(
      url("nurnet-index.json"),
      url("nurnet-details.json"),
      url("nurnet-visibility.json"),
    );
  }

  // Resolves with the indices (into `items`) of the matching POIs, best match first
  function search(query: string) {
    return request<number[]>({ type: "search", query }, "id");
  }

  // Resolves once the details file has loaded; null if it couldn't be loaded
  function getDetails(id: string) {
    return request<NurnetDetails | null>({ type: "details", id }, "requestId");
  }

  // The sites visible from a nuraghe, nearest first; null if the data couldn't be loaded
  function getVisible(id: string) {
    return request<VisibleSite[] | null>({ type: "visible", id }, "requestId");
  }

  // Opens a POI right away with what the index has; its details are filled in when available
  // `navigate: false` when the route is already the POI's (opened from its URL)
  async function openPOI(poi: NurnetPOI, { navigate = true } = {}) {
    currentPOI.value = {
      values_: {
        ...poi,
        geometry: { flatCoordinates: poi.coordinates },
        detailsStatus: "loading",
        visibleStatus: isNuraghe(poi.category_id) ? "loading" : "none",
      },
    };
    if (navigate) void router.push(`/poi/${poi.content_id}`);

    if (isNuraghe(poi.category_id)) {
      void getVisible(poi.content_id).then((visible) => {
        if (currentPOI.value.values_?.content_id !== poi.content_id) return;
        currentPOI.value = {
          values_: {
            ...currentPOI.value.values_,
            visible: visible ?? [],
            visibleStatus: visible ? "loaded" : "error",
          },
        };
      });
    }

    const details = await getDetails(poi.content_id);
    // The user may have moved on to another POI meanwhile
    if (currentPOI.value.values_?.content_id !== poi.content_id) return;
    currentPOI.value = {
      values_: {
        ...currentPOI.value.values_,
        ...details,
        photos: details?.photos ?? [],
        detailsStatus: details ? "loaded" : "error",
      },
    };
  }

  return { items, error, search, getDetails, getVisible, openPOI };
}
