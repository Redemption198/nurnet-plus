// The site texts in public/ as a visitor reads them: no markup, HTML entities or broken encoding.
// nurnet-dumper cleans these up and lists what it can't fix in its report; this catches data
// copied in without that review
/// <reference types="vite-plus/client" />
// Vite's types for ?raw imports and import.meta.glob, also when the file is checked on its own
import { describe, expect, it } from "vite-plus/test";
import indexJson from "../public/nurnet-index.json?raw";
import detailsJson from "../public/nurnet-details.json?raw";

type Text = string | number | null | undefined;
const index: { fields: string[]; rows: Text[][] } = JSON.parse(indexJson);
const details: { sites: Record<string, Record<string, Text>> } = JSON.parse(detailsJson);

const TEXT_FIELDS = ["name", "comune", "localita", "regione"];
const DETAIL_FIELDS = ["description", "source"];

// The machine-translated descriptions, one file per language (nurnet-dumper's translate-run)
const translations = Object.entries(
  import.meta.glob<string>("../public/nurnet-descriptions.*.json", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
).map(([path, raw]) => ({
  lang: /descriptions\.([a-z-]+)\.json$/.exec(path)![1]!,
  descriptions: (JSON.parse(raw) as { descriptions: Record<string, string> }).descriptions,
}));

// Every text field of every site, as [content_id, field, text]
const texts: [string, string, string][] = [
  ...index.rows.flatMap((row) =>
    TEXT_FIELDS.map((field): [string, string, string] => [
      String(row[0]),
      field,
      String(row[index.fields.indexOf(field)] ?? ""),
    ]),
  ),
  ...Object.entries(details.sites).flatMap(([id, site]) =>
    DETAIL_FIELDS.map((field): [string, string, string] => [id, field, String(site[field] ?? "")]),
  ),
  ...translations.flatMap(({ lang, descriptions }) =>
    Object.entries(descriptions).map(([id, text]): [string, string, string] => [
      id,
      `description (${lang})`,
      text,
    ]),
  ),
];

const PROBLEMS: Record<string, RegExp> = {
  markup: /<\/?[a-z][\w:-]*(?:\s[^<>]*)?\/?>|<\/\s*$|\b[a-z]+="[^"]*"/i,
  "HTML entity": /&(?:#x[\da-f]+|#\d+|[a-z]+);/i,
  "broken encoding": /Ã[\u0080-¿]|â€|Â[ -¿]/,
  "unknown character": /�/,
};

describe("site texts", () => {
  it("are read from the data", () => {
    expect(texts.length).toBeGreaterThan(1000);
  });

  // The links taken out of the descriptions open as they are
  it("link to web pages", () => {
    const sites = details.sites as Record<string, { links?: { url: string }[] }>;
    const bad = Object.entries(sites).flatMap(([id, site]) =>
      (site.links ?? [])
        .filter(({ url }) => !/^https?:\/\/[^/\s]/.test(url) || !URL.canParse(url))
        .map(({ url }) => `${id}: ${url}`),
    );
    expect(bad).toEqual([]);
  });

  // A translation for a site that's gone, or that never had a description, would be shown for
  // nothing the census says
  it("are translated only for sites with a description", () => {
    for (const { lang, descriptions } of translations) {
      const stray = Object.keys(descriptions).filter((id) => !details.sites[id]?.description);
      expect(stray, lang).toEqual([]);
    }
  });

  for (const [problem, pattern] of Object.entries(PROBLEMS)) {
    it(`have no ${problem}`, () => {
      const found = texts
        .filter(([, , text]) => pattern.test(text))
        .map(([id, field, text]) => `${id} ${field}: ${text.slice(0, 80)}`);
      expect(found).toEqual([]);
    });
  }
});
