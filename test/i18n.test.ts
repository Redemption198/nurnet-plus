/// <reference types="vite-plus/client" />
// Vite's types for ?raw imports, also when the file is checked on its own (the pre-commit check)
import { describe, expect, it } from "vite-plus/test";
import en from "../i18n/locales/en.json";
import itMessages from "../i18n/locales/it.json";
import detailsJson from "../public/nurnet-details.json?raw";
import { CATEGORIES, statusOf } from "../app/utils/categories";
import { type CensusField, censusTermKey, censusTermParts } from "../app/utils/censusTerms";
import { preferredLocale } from "../app/utils/locale";
import { VISIBILITY_LEVELS } from "../app/utils/visibilityLevels";

type Messages = { [key: string]: string | Messages };

// "info.tips.search", ... for every message
function keys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string" ? [prefix + key] : keys(value, `${prefix}${key}.`),
  );
}

// Placeholders such as {n} and {query}, which the code fills in by name
const placeholders = (message: string) => [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

function lookup(messages: Messages, path: string) {
  return path
    .split(".")
    .reduce<string | Messages | undefined>(
      (node, key) => (typeof node === "object" ? node[key] : undefined),
      messages,
    );
}

describe("locale messages", () => {
  it("have the same keys in Italian and English", () => {
    expect(keys(en).sort()).toEqual(keys(itMessages).sort());
  });

  it("use the same placeholders in both languages", () => {
    for (const key of keys(itMessages)) {
      const italian = lookup(itMessages, key) as string;
      const english = lookup(en, key) as string;
      expect(placeholders(english).sort(), key).toEqual(placeholders(italian).sort());
    }
  });

  it("name every category, status and sight-line level", () => {
    const statuses = ["mantenuto", "diroccato", "non visibile"].map((value) => statusOf(value)!);
    const needed = [
      ...CATEGORIES.map((category) => `categories.${category.key}`),
      ...statuses.map((status) => `status.${status.key}`),
      ...VISIBILITY_LEVELS.map((level) => `visibilityLevels.${level.key}`),
    ];
    for (const key of needed) {
      expect(typeof lookup(itMessages, key), key).toBe("string");
      expect(typeof lookup(en, key), key).toBe("string");
    }
  });

  it("keep the census's own names in Italian", () => {
    for (const category of CATEGORIES) {
      expect(lookup(itMessages, `categories.${category.key}`)).toBe(category.name);
    }
  });
});

describe("census terms", () => {
  const details: { sites: Record<string, Partial<Record<CensusField, string>>> } =
    JSON.parse(detailsJson);
  const FIELDS: CensusField[] = ["typology", "period", "lithology", "landUse"];

  it("make a key from the Italian wording", () => {
    expect(censusTermKey("typology", "Nuraghe a corridoio (protonuraghe)")).toBe(
      "typology.nuragheACorridoioProtonuraghe",
    );
    expect(censusTermKey("lithology", "Basalti e brecce andesitico-basaltiche")).toBe(
      "lithology.basaltiEBrecceAndesiticoBasaltiche",
    );
    expect(censusTermKey("typology", "Allée couverte")).toBe("typology.alleeCouverte");
    expect(censusTermParts("bosco / coltivabile")).toEqual(["bosco", "coltivabile"]);
  });

  // A data refresh with a new value fails here instead of showing Italian in another language
  it("translate every value in the data, the Italian as the census writes it", () => {
    const parts = new Set<string>();
    for (const site of Object.values(details.sites))
      for (const field of FIELDS) {
        const value = site[field];
        if (value) for (const part of censusTermParts(value)) parts.add(`${field}\t${part}`);
      }
    for (const entry of parts) {
      const [field, part] = entry.split("\t") as [CensusField, string];
      const key = censusTermKey(field, part);
      expect(lookup(itMessages, key), key).toBe(part);
      expect(typeof lookup(en, key), key).toBe("string");
    }
  });
});

describe("preferredLocale", () => {
  it("takes the first language the app has", () => {
    expect(preferredLocale(["it-IT", "en-US"])).toBe("it");
    expect(preferredLocale(["en-GB", "it"])).toBe("en");
    expect(preferredLocale(["de-DE", "it-IT"])).toBe("it");
  });

  it("falls back to English", () => {
    expect(preferredLocale(["de-DE", "fr"])).toBe("en");
    expect(preferredLocale([])).toBe("en");
  });
});
