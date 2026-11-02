import { describe, expect, it } from "vite-plus/test";
import {
  buildVisibility,
  detailsFor,
  distance,
  normalize,
  parseIndex,
  tokenize,
  visibleFrom,
} from "../app/workers/nurnet-data";

const index = parseIndex({
  rows: [
    ["NUR1", "10", "Nuraghe Losa", "Abbasanta", "", "Guilcer", 8.8018, 40.0703],
    ["NUR2", "10", "Nuraghe Izzi", "Abbasanta", "", "Guilcer", 8.815, 40.071],
    ["NUR3", "30", "Domus de janas", "Ghilarza", "", "Guilcer", 8.85, 40.12],
  ],
});

describe("parseIndex", () => {
  it("turns rows into sites with [lon, lat]", () => {
    expect(index[0]).toEqual({
      content_id: "NUR1",
      category_id: "10",
      name: "Nuraghe Losa",
      comune: "Abbasanta",
      localita: "",
      regione: "Guilcer",
      coordinates: [8.8018, 40.0703],
    });
  });
});

describe("search text", () => {
  it("ignores case, accents and apostrophes", () => {
    expect(normalize("Cann'e Sisa")).toBe("canne sisa");
    expect(normalize("Tàttari")).toBe("tattari");
    expect(normalize("S’Urachi")).toBe("surachi");
  });

  it("splits on spaces and punctuation but keeps apostrophes inside words", () => {
    expect(tokenize("Nuraghe Cann'e Sisa (Gesturi)")).toEqual([
      "Nuraghe",
      "Cann'e",
      "Sisa",
      "Gesturi",
      "",
    ]);
  });
});

describe("detailsFor", () => {
  const file = {
    photoBase: "https://example.org/uploads/",
    sites: { NUR1: { photos: ["a.jpg", "https://other.org/b.jpg"], stato: "Mantenuto" } },
  };

  it("adds the photo base to relative photo URLs", () => {
    expect(detailsFor(file, "NUR1").photos).toEqual([
      "https://example.org/uploads/a.jpg",
      "https://other.org/b.jpg",
    ]);
  });

  it("gives sites without details an empty photo list", () => {
    expect(detailsFor(file, "NUR9")).toEqual({ photos: [] });
  });
});

describe("distance", () => {
  it("is about 1.1 km between Losa and Izzi", () => {
    const metres = distance(index[0]!.coordinates, index[1]!.coordinates);
    expect(metres).toBeGreaterThan(1050);
    expect(metres).toBeLessThan(1200);
  });
});

describe("line of sight", () => {
  const network = buildVisibility(
    {
      pairs: [
        ["NUR1", "NUR2", 150, 140],
        ["NUR1", "NUR3", 20, 40],
        // A site that isn't in the index is skipped
        ["NUR1", "NUR404", 150, 150],
      ],
    },
    index,
  );

  it("links each pair both ways with the mean height in metres", () => {
    expect(network.get("NUR1")).toEqual([
      { i: 1, height: 14.5 },
      { i: 2, height: 3 },
    ]);
    expect(network.get("NUR2")).toEqual([{ i: 0, height: 14.5 }]);
  });

  it("lists the visible sites nearest first, with their elevation", () => {
    const visible = visibleFrom("NUR1", network, index, (id) => (id === "NUR2" ? 300 : undefined));
    expect(visible.map((entry) => entry.i)).toEqual([1, 2]);
    expect(visible[0]).toMatchObject({ height: 14.5, elevation: 300 });
    expect(visible[0]!.distance).toBeLessThan(visible[1]!.distance);
  });

  it("returns nothing for a site without lines", () => {
    expect(visibleFrom("NUR404", network, index, () => undefined)).toEqual([]);
  });
});
