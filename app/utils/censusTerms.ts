// The census's closed vocabularies (from the NurNet Geoportale), translated in i18n/locales like
// the rest of the UI. Each value's key is made from its Italian wording, so a language file only
// lists the values; a value with no key in a language is shown as the census wrote it
export type CensusField = "typology" | "period" | "lithology" | "landUse";

// Some land uses are two at once, "bosco / coltivabile": each part is translated on its own
export const censusTermParts = (value: string) => value.split(" / ");

// "Nuraghe a corridoio (protonuraghe)" -> "typology.nuragheACorridoioProtonuraghe"
export function censusTermKey(field: CensusField, part: string) {
  const words = part
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const name = words.map((word, i) => (i ? word[0]!.toUpperCase() + word.slice(1) : word)).join("");
  return `${field}.${name}`;
}

// A census value in the language of `i18n` (useI18n() in components, nuxtApp.$i18n in plugins)
export function censusTerm(
  i18n: { te: (key: string) => boolean; t: (key: string) => string },
  field: CensusField,
  value: string,
) {
  return censusTermParts(value)
    .map((part) => {
      const key = censusTermKey(field, part);
      return i18n.te(key) ? i18n.t(key) : part;
    })
    .join(" / ");
}
