// The data worker's pure logic: parsing the data files, search normalisation, line of sight.
// Kept apart from the worker's messaging so it can be tested directly

// A value per site, of a field whose values repeat: the values once, and each site's index
interface Values<T> {
  values: T[];
  of: number[];
}

// One array per field, in site order (nurnet-dumper's index-file.ts): the ids as the
// differences between them (sorted), without their prefix; the coordinates in
// hundred-thousandths of a degree
export interface IndexFile {
  idPrefix: string;
  ids: number[];
  category: Values<string | null>;
  name: string[];
  comune: Values<string>;
  localita: Values<string>;
  regione: Values<string>;
  lon: number[];
  lat: number[];
}

export interface DetailsFile {
  photoBase: string;
  sites: Record<string, Partial<NurnetDetails>>;
}

// One language's descriptions, machine translated (nurnet-dumper): content_id -> text. Only the
// sites whose translation passed the checks; the rest keep their Italian description
export interface DescriptionsFile {
  generated: string;
  descriptions: Record<string, string>;
}

export interface VisibilityFile {
  // a, b (content_ids), direct, inverse (metres of tower visible, in decimetres)
  pairs: [string, string, number, number][];
}

export function parseIndex(index: IndexFile): NurnetPOI[] {
  const value = <T>(field: Values<T>, i: number) => field.values[field.of[i]!]!;
  let id = 0;
  return index.ids.map((difference, i) => {
    id += difference;
    return {
      content_id: `${index.idPrefix}${id}`,
      category_id: value(index.category, i),
      name: index.name[i]!,
      comune: value(index.comune, i),
      localita: value(index.localita, i),
      regione: value(index.regione, i),
      coordinates: [index.lon[i]! / 1e5, index.lat[i]! / 1e5],
    };
  });
}

// Case, accents and apostrophe variants don't matter: "canne" finds "Cann'e"
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, "")
    .toLowerCase();
}

// Split on spaces and punctuation, keep apostrophes inside words ("Cann'e" -> "canne")
export const tokenize = (text: string) => text.split(/[\s,.;:()/\\-]+/);

// A site's details with full photo URLs (the file stores them relative to photoBase)
export function detailsFor(file: DetailsFile, id: string): NurnetDetails {
  const site = file.sites[id] ?? {};
  return {
    ...site,
    photos: (site.photos ?? []).map((url) => (url.startsWith("http") ? url : file.photoBase + url)),
  };
}

// Distance in metres between two lon/lat points (equirectangular, fine at this scale)
export function distance([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180)) * 111_320;
  const y = (lat2 - lat1) * 110_540;
  return Math.hypot(x, y);
}

// content_id -> the sites it can see, as { i (index into items), height (metres, 0-15) }.
// Which way `direct` looks isn't documented, so each pair gets one value both ways: the mean of
// the two, i.e. how much of the towers can be seen from each other on average. Pairs with a site
// that isn't in the items are skipped
export function buildVisibility(file: VisibilityFile, items: NurnetPOI[]) {
  const indexOf = new Map(items.map((item, i) => [item.content_id, i]));
  const byId = new Map<string, { i: number; height: number }[]>();
  const add = (id: string, i: number, height: number) => {
    const list = byId.get(id);
    if (list) list.push({ i, height });
    else byId.set(id, [{ i, height }]);
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

// The sites visible from `id`, nearest first
export function visibleFrom(
  id: string,
  network: ReturnType<typeof buildVisibility>,
  items: NurnetPOI[],
  elevationOf: (id: string) => number | undefined,
): VisibleSite[] {
  const from = items.find((item) => item.content_id === id);
  if (!from) return [];
  return (network.get(id) ?? [])
    .map(({ i, height }) => ({
      i,
      height,
      distance: Math.round(distance(from.coordinates, items[i]!.coordinates)),
      // Metres above sea level (geo.nurnet.net), for the lines in 3D; missing for a few sites
      elevation: elevationOf(items[i]!.content_id),
    }))
    .sort((x, y) => x.distance - y.distance);
}
