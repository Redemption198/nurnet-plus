// Data types shared by the app and the data worker (auto-imported from shared/types)

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
  // The description in the UI's language, machine translated (nurnet-descriptions.<lang>.json)
  translatedDescription?: string;
  // The web addresses that were in the description, taken out of the text (nurnet-dumper); a
  // label where the address alone wouldn't say what it is (a thesis and its pages)
  links?: { url: string; label?: string }[];
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
  i: number; // index into the items
  height: number; // metres of tower visible, 0-15, the mean of both directions
  distance: number; // metres
  elevation?: number; // metres above sea level
}

export type LoadStatus = "loading" | "loaded" | "error";

// The site open in the drawer: its index fields right away, its details and (nuraghi only) the
// sites visible from it once loaded
export interface CurrentSite extends NurnetPOI, Partial<Omit<NurnetDetails, "photos">> {
  photos: string[];
  detailsStatus: LoadStatus;
  visible: VisibleSite[];
  // "none" for sites without line-of-sight data (everything but nuraghi)
  visibleStatus: LoadStatus | "none";
}

// The drawer's resting heights on mobile (on desktop it's a fixed side panel)
export type DrawerPosition = "top" | "middle" | "bottom";
