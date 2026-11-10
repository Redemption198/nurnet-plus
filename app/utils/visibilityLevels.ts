import { BRAND } from "./brand";

// How well two nuraghi see each other: metres of tower visible (0-15, the tower height in
// CRS4's model), the mean of both directions. The list and the map lines share these levels.
// The stronger the relation, the more the line stands out from the ground: darker on the light
// map, lighter on the dark one (darkColor), so the order holds in both modes. The UI shows
// visibilityLevels.<key> (i18n/locales)
export const VISIBILITY_LEVELS = [
  {
    min: 13.5,
    label: "Ben visibile",
    key: "high",
    color: BRAND.terracotta,
    darkColor: "#ff9446",
    dashed: false,
  },
  {
    min: 7.5,
    label: "Visibile",
    key: "medium",
    color: "#e58a3a",
    darkColor: "#b0602a",
    dashed: false,
  },
  {
    min: 0,
    label: "Poco visibile",
    key: "low",
    color: "#8c7e74",
    darkColor: "#76695f",
    dashed: true,
  },
] as const;

// A level's colour on the light or the dark map
export const levelColor = (level: (typeof VISIBILITY_LEVELS)[number], dark: boolean) =>
  dark ? level.darkColor : level.color;

// Index into VISIBILITY_LEVELS
export const visibilityLevel = (height: number) =>
  VISIBILITY_LEVELS.findIndex((level) => height >= level.min);
