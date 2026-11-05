import { describe, expect, it } from "vite-plus/test";
import { addRecentSite, pickRandomSite, RECENT_SITES } from "../app/utils/randomSite";

const sites = (n: number) => Array.from({ length: n }, (_, i) => ({ content_id: `NUR${i}` }));
// Every site the picker can return, trying each slot of the candidate list
function reachable(pool: { content_id: string }[], recent: string[]) {
  const ids = new Set<string>();
  for (let i = 0; i < pool.length; i++)
    ids.add(pickRandomSite(pool, recent, () => i / pool.length)?.content_id ?? "none");
  return ids;
}

describe("pickRandomSite", () => {
  it("never picks the sites seen lately", () => {
    const recent = ["NUR3", "NUR1", "NUR7"];
    const ids = reachable(sites(20), recent);
    for (const id of recent) expect(ids.has(id)).toBe(false);
    expect(ids.size).toBe(17);
  });

  it("in a small pool, avoids only the latest ones and still has a choice", () => {
    // 3 sites, all seen: only the 2 latest are avoided
    expect([...reachable(sites(3), ["NUR0", "NUR1", "NUR2"])]).toEqual(["NUR2"]);
    // 2 sites: never the one just seen
    expect([...reachable(sites(2), ["NUR1"])]).toEqual(["NUR0"]);
  });

  it("picks the only site there is, and nothing from an empty pool", () => {
    expect(pickRandomSite(sites(1), ["NUR0"])?.content_id).toBe("NUR0");
    expect(pickRandomSite([], ["NUR0"])).toBeUndefined();
  });

  it("ignores seen sites outside the pool", () => {
    expect(reachable(sites(3), ["OTHER1", "OTHER2"]).size).toBe(3);
  });
});

describe("addRecentSite", () => {
  it("puts the site first, once, and keeps the last ones", () => {
    expect(addRecentSite(["B", "A"], "A")).toEqual(["A", "B"]);
    let recent: string[] = [];
    for (let i = 0; i < 15; i++) recent = addRecentSite(recent, `S${i}`);
    expect(recent).toHaveLength(RECENT_SITES);
    expect(recent[0]).toBe("S14");
  });
});
