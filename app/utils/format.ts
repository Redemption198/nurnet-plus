// "850 m" up to a kilometre, then "4,2 km"
export function formatDistance(metres: number) {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}
