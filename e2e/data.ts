/// <reference types="node" />
import { readFileSync } from "node:fs";
import { CATEGORIES } from "../app/utils/categories.ts";

// The counts the tests expect, read from the dataset the app serves, so a data update doesn't
// break them
const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8"));

const index: { rows: [id: string, categoryId: string, name: string][] } = read("nurnet-index.json");
const details: { sites: Record<string, { photos?: unknown[] }> } = read("nurnet-details.json");

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const TOTAL_SITES = index.rows.length;

export function sitesOfType(name: string) {
  const ids = CATEGORIES.find((category) => category.name === name)!.ids;
  return index.rows.filter((row) => ids.includes(row[1])).length;
}

// Site names that contain `text`, ignoring case and accents
export function namesContaining(text: string) {
  return index.rows.map((row) => row[2]).filter((name) => fold(name).includes(fold(text)));
}

export const photoCount = (id: string) => details.sites[id]!.photos?.length ?? 0;
