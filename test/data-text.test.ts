// The site texts in public/ as a visitor reads them: no markup, HTML entities or broken encoding.
// nurnet-dumper cleans these up and lists what it can't fix in its report; this catches data
// copied in without that review
import { describe, expect, it } from "vite-plus/test";
import indexJson from "../public/nurnet-index.json?raw";
import detailsJson from "../public/nurnet-details.json?raw";

type Text = string | number | null | undefined;
const index: { fields: string[]; rows: Text[][] } = JSON.parse(indexJson);
const details: { sites: Record<string, Record<string, Text>> } = JSON.parse(detailsJson);

const TEXT_FIELDS = ["name", "comune", "localita", "regione"];
const DETAIL_FIELDS = ["description", "source"];

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

  for (const [problem, pattern] of Object.entries(PROBLEMS)) {
    it(`have no ${problem}`, () => {
      const found = texts
        .filter(([, , text]) => pattern.test(text))
        .map(([id, field, text]) => `${id} ${field}: ${text.slice(0, 80)}`);
      expect(found).toEqual([]);
    });
  }
});
