import { describe, expect, it } from "vite-plus/test";
import { CATEGORIES, categoryOf, isNuraghe, statusOf } from "../app/utils/categories";
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

describe("isNuraghe", () => {
  it("is true for the Nuraghe category's ids only (the ones with line-of-sight data)", () => {
    expect(CATEGORIES[0]!.name).toBe("Nuraghe");
    for (const id of ["10", "11", "12", "13"]) expect(isNuraghe(id)).toBe(true);
    for (const id of ["1", "14", "110", "30", "", null, undefined])
      expect(isNuraghe(id)).toBe(false);
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

// WCAG contrast between two #rrggbb colours
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light! + 0.05) / (dark! + 0.05);
}

// The panels and chips of tailwind.css, light and dark
const LIGHT_PANEL = "#ece5da";
const DARK_PANEL = "#272022";
const DARK_CHIP = "#4a3f41";
const DARK_INK = "#1d1819";

describe("category colours", () => {
  it.each(CATEGORIES)("$name: icons readable on the panels in both modes (3:1)", (category) => {
    expect(contrast(category.color, LIGHT_PANEL)).toBeGreaterThanOrEqual(3);
    expect(contrast(category.darkColor, DARK_PANEL)).toBeGreaterThanOrEqual(3);
    expect(contrast(category.darkColor, DARK_CHIP)).toBeGreaterThanOrEqual(3);
  });

  it.each(CATEGORIES)("$name: the selected chip's text is readable (4.5:1)", (category) => {
    expect(contrast(category.color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(category.darkColor, DARK_INK)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("visibility levels in dark mode", () => {
  it("stand out from the dark map more, the stronger the relation", () => {
    const [ben, visibile, poco] = VISIBILITY_LEVELS.map((level) =>
      contrast(level.darkColor, DARK_INK),
    );
    expect(ben).toBeGreaterThan(visibile!);
    expect(visibile).toBeGreaterThanOrEqual(3);
    expect(poco).toBeGreaterThanOrEqual(3);
  });
});
