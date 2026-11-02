import { describe, expect, it } from "vite-plus/test";
import { CATEGORIES, categoryOf, statusOf } from "../app/utils/categories";
import { VISIBILITY_LEVELS, visibilityLevel } from "../app/utils/visibilityLevels";

describe("categoryOf", () => {
  it("groups the data's category ids", () => {
    expect(categoryOf("12").name).toBe("Nuraghe");
    expect(categoryOf("61").name).toBe("Tombe dei giganti");
    expect(categoryOf("101").name).toBe("Unicum e Grotte Tafoni");
  });

  it("puts unknown and missing ids in Sconosciuto", () => {
    expect(categoryOf("999").name).toBe("Sconosciuto");
    expect(categoryOf(null).name).toBe("Sconosciuto");
  });

  it("gives every id to one category only", () => {
    const ids = CATEGORIES.flatMap((category) => category.ids);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("statusOf", () => {
  it("reads the free-text values in the data", () => {
    expect(statusOf(" Manutenuto ")?.label).toBe("Mantenuto");
    expect(statusOf("buono")?.label).toBe("Mantenuto");
    expect(statusOf("DIROCCATO")?.label).toBe("Diroccato");
    expect(statusOf("Non visibile")?.label).toBe("Non visibile");
  });

  it("has no status for empty or unknown values", () => {
    expect(statusOf("")).toBeNull();
    expect(statusOf(undefined)).toBeNull();
    expect(statusOf("Sconosciuto")).toBeNull();
  });
});

describe("visibilityLevel", () => {
  it("maps metres of tower to the three levels", () => {
    expect(VISIBILITY_LEVELS[visibilityLevel(15)]!.label).toBe("Ben visibile");
    expect(VISIBILITY_LEVELS[visibilityLevel(13.5)]!.label).toBe("Ben visibile");
    expect(VISIBILITY_LEVELS[visibilityLevel(10)]!.label).toBe("Visibile");
    expect(VISIBILITY_LEVELS[visibilityLevel(0.2)]!.label).toBe("Poco visibile");
  });
});
