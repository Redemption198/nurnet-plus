/// <reference types="node" />
/// <reference lib="es2023.intl" />
import { readFileSync } from "node:fs";
import { CATEGORIES } from "../app/utils/categories.ts";
import { parseIndex, type IndexFile } from "../app/workers/nurnet-data.ts";

// The counts the tests expect, read from the dataset the app serves, so a data update doesn't
// break them
const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8"));

const sites = parseIndex(read("nurnet-index.json") as IndexFile);
const details: { sites: Record<string, { photos?: unknown[] }> } = read("nurnet-details.json");

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const TOTAL_SITES = sites.length;

// The list's count as the app writes it in Italian: "7.516 siti nella mappa", grouped even with four
// digits (SearchResults' countLabel)
export const inMap = (count: number) =>
  `${count.toLocaleString("it", { useGrouping: "always" })} siti nella mappa`;

export function sitesOfType(name: string) {
  const ids = CATEGORIES.find((category) => category.name === name)!.ids;
  return sites.filter((site) => ids.includes(site.category_id ?? "")).length;
}

// Site names that contain `text`, ignoring case and accents
export function namesContaining(text: string) {
  return sites.map((site) => site.name).filter((name) => fold(name).includes(fold(text)));
}

export const photoCount = (id: string) => details.sites[id]!.photos?.length ?? 0;
