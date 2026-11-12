// What a site says of itself on its sheet, in the tab and in link previews, the same in the
// browser (pages/index/poi/[id].vue) and in the pages prerendered for each site (plugins/site-head.server.ts)

type Translate = (key: string, values?: Record<string, string>) => string;
type Term = (field: "typology", value: string) => string;
type Site = Pick<NurnetPOI, "category_id" | "comune" | "regione"> & { typology?: string };

// The census's typology in the UI's language, else the category's name: "Nuraghe complesso"
export const siteKind = (site: Site, t: Translate, term: Term) =>
  site.typology
    ? term("typology", site.typology)
    : t(`categories.${categoryOf(site.category_id).key}`);

// "Abbasanta, Guilcer"
export const sitePlace = (site: Site) => [site.comune, site.regione].filter(Boolean).join(", ");

// "Nuraghe complesso ad Abbasanta, Guilcer, sulla mappa di NurNet+."
export function siteDescription(site: Site, t: Translate, term: Term) {
  const kind = siteKind(site, t, term);
  const place = sitePlace(site);
  if (!place) return t("site.meta", { kind });
  // "ad Abbasanta", "a Barumini"
  const key = /^a/i.test(place) ? "site.metaInPlaceStartingWithA" : "site.metaInPlace";
  return t(key, { kind, place });
}

// The Mediateca's originals: the URLs we have are WordPress thumbnails ("-300x300")
export const fullSizePhoto = (url: string) => url.replace(/-\d+x\d+(?=\.\w+$)/, "");
