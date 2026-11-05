// How many of the sites seen last "A caso" avoids
export const RECENT_SITES = 10;

// A random site from `pool`, avoiding the ones seen lately (`recent`: ids, the latest first, the
// open one included). In a small pool it avoids only as many as it can and still have a choice,
// the latest first, so it never offers the site just seen while another is left
export function pickRandomSite<T extends { content_id: string }>(
  pool: T[],
  recent: string[],
  random = Math.random,
): T | undefined {
  const avoided = new Set(recent.slice(0, Math.max(0, pool.length - 1)));
  const candidates = pool.filter((poi) => !avoided.has(poi.content_id));
  return candidates[Math.floor(random() * candidates.length)];
}

// `recent` with `id` as the latest, at most RECENT_SITES long
export function addRecentSite(recent: string[], id: string) {
  return [id, ...recent.filter((other) => other !== id)].slice(0, RECENT_SITES);
}
