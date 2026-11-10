import type { MapLibreMap } from "maplibre-gl";
import type { InjectionKey, ShallowRef } from "vue";

// TheMap's MapLibre instance, for the components inside it (MapControls): provided rather than
// kept in useState, which is serialized into the page and can't hold a live object (WebGL,
// workers, listeners). Undefined until the map is created, and when it can't be
const MAP_KEY: InjectionKey<ShallowRef<MapLibreMap | undefined>> = Symbol("map");

export function provideMap(map: ShallowRef<MapLibreMap | undefined>) {
  provide(MAP_KEY, map);
}

export function useMap() {
  const map = inject(MAP_KEY);
  if (!map) throw new Error("useMap() needs TheMap around it");
  return map;
}
