import type { StyleSpecification } from "maplibre-gl";
import { colors } from "./symbology";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? "";

export const MAP_CENTER: [number, number] = [44.375, 34.45];
export const MAP_ZOOM = 12;
export const MAP_PITCH = 35;
export const MAP_BEARING = -10;

export const satelliteStyleUrl = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`
  : null;

export const fallbackStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};

export const terrainSource = MAPTILER_KEY
  ? {
      type: "raster-dem" as const,
      tiles: [
        `https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`,
      ],
      tileSize: 256,
      maxzoom: 12,
      encoding: "mapbox" as const,
    }
  : null;

export const layerColors = {
  ao: colors.cyan,
  nai: colors.magenta,
  msr: colors.cyan,
  wadi: colors.realGeography,
  drone: colors.orange,
  suspected: colors.magenta,
  sensor: "#f8fafc",
  iUgs: "#fbbf24",
  patrolLoop: colors.magenta,
} as const;
