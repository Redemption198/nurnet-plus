import { BRAND } from "./brand";

// How well two nuraghi see each other: metres of tower visible (0-15, the tower height in
// CRS4's model), the mean of both directions. The list and the map lines share these levels
export const VISIBILITY_LEVELS = [
  { min: 13.5, label: "Ben visibile", color: BRAND.terracotta, dashed: false },
  { min: 7.5, label: "Visibile", color: "#e58a3a", dashed: false },
  { min: 0, label: "Poco visibile", color: "#8c7e74", dashed: true },
] as const;

// Index into VISIBILITY_LEVELS
export const visibilityLevel = (height: number) =>
  VISIBILITY_LEVELS.findIndex((level) => height >= level.min);
