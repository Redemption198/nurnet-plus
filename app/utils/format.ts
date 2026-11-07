// "850 m" up to a kilometre, then "4,2 km" ("4.2 km" in English)
export function formatDistance(metres: number, locale = "it") {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}
