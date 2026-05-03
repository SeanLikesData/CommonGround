import type { Map as MapLibreMap } from "maplibre-gl";

let instance: MapLibreMap | null = null;
const listeners = new Set<(m: MapLibreMap | null) => void>();

export function setMapInstance(m: MapLibreMap | null) {
  instance = m;
  for (const fn of listeners) fn(m);
}

export function getMapInstance(): MapLibreMap | null {
  return instance;
}

export function subscribeMap(fn: (m: MapLibreMap | null) => void): () => void {
  listeners.add(fn);
  fn(instance);
  return () => {
    listeners.delete(fn);
  };
}
