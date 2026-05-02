import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_BEARING,
  MAP_CENTER,
  MAP_PITCH,
  MAP_ZOOM,
  fallbackStyle,
  layerColors,
  satelliteStyleUrl,
  terrainSource,
} from "@/lib/mapStyle";
import { useMapStore } from "@/lib/store";
import { colors } from "@/lib/symbology";
import type { SpotEvent } from "@/lib/types";

const GEOJSON_URL = "/geojson/ao-lionheart.geojson";

function spotsToFeatureCollection(spots: SpotEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((s) => ({
      type: "Feature" as const,
      properties: {
        id: s.id,
        severity: s.severity,
        source: s.source,
        salute: s.salute,
      },
      geometry: { type: "Point" as const, coordinates: s.location },
    })),
  };
}

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [styleReady, setStyleReady] = useState(false);

  const events = useMapStore((s) => s.events);
  const setSelection = useMapStore((s) => s.setSelection);
  const visibleLayers = useMapStore((s) => s.visibleLayers);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteStyleUrl ?? fallbackStyle,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", async () => {
      if (terrainSource) {
        map.addSource("terrain-dem", terrainSource);
        map.addLayer({
          id: "hillshade",
          type: "hillshade",
          source: "terrain-dem",
          paint: {
            "hillshade-shadow-color": "#000",
            "hillshade-highlight-color": "#fff",
            "hillshade-exaggeration": 0.5,
          },
        });
      }

      try {
        const res = await fetch(GEOJSON_URL);
        const geojson = await res.json();
        map.addSource("ao", { type: "geojson", data: geojson });

        map.addLayer({
          id: "wadi-line",
          type: "line",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "wadi"],
          paint: {
            "line-color": layerColors.wadi,
            "line-width": 2,
            "line-opacity": 0.7,
            "line-dasharray": [2, 2],
          },
        });

        map.addLayer({
          id: "msr-line",
          type: "line",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "msr"],
          paint: {
            "line-color": layerColors.msr,
            "line-width": 2,
            "line-opacity": 0.6,
          },
        });

        map.addLayer({
          id: "ao-boundary",
          type: "line",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "ao_boundary"],
          paint: {
            "line-color": layerColors.ao,
            "line-width": 2.5,
            "line-opacity": 0.9,
          },
        });

        map.addLayer({
          id: "nai-fill",
          type: "fill",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "nai"],
          paint: {
            "fill-color": layerColors.nai,
            "fill-opacity": 0.12,
          },
        });
        map.addLayer({
          id: "nai-line",
          type: "line",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "nai"],
          paint: {
            "line-color": layerColors.nai,
            "line-width": 2,
            "line-opacity": 0.9,
          },
        });

        map.addLayer({
          id: "drone-orbit",
          type: "line",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "drone_orbit"],
          paint: {
            "line-color": layerColors.drone,
            "line-width": 2,
            "line-dasharray": [3, 2],
            "line-opacity": 0.85,
          },
        });

        map.addLayer({
          id: "sensors",
          type: "circle",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "sensor"],
          paint: {
            "circle-radius": 6,
            "circle-color": "#0f172a",
            "circle-stroke-color": layerColors.sensor,
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "objective",
          type: "circle",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "objective"],
          paint: {
            "circle-radius": 7,
            "circle-color": layerColors.ao,
            "circle-opacity": 0,
            "circle-stroke-color": layerColors.ao,
            "circle-stroke-width": 2.5,
          },
        });

        map.addLayer({
          id: "village",
          type: "circle",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "village"],
          paint: {
            "circle-radius": 5,
            "circle-color": layerColors.ao,
            "circle-stroke-color": "#0f172a",
            "circle-stroke-width": 1.5,
          },
        });

        map.addLayer({
          id: "suspected-site",
          type: "circle",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "suspected_site"],
          paint: {
            "circle-radius": 8,
            "circle-color": layerColors.suspected,
            "circle-opacity": 0.25,
            "circle-stroke-color": layerColors.suspected,
            "circle-stroke-width": 2,
          },
        });

        // Dynamic SPOT layer
        map.addSource("spots", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "spots-layer",
          type: "circle",
          source: "spots",
          paint: {
            "circle-radius": 8,
            "circle-color": [
              "match",
              ["get", "severity"],
              "low",
              colors.severity.low,
              "med",
              colors.severity.med,
              "med-high",
              colors.severity.medHigh,
              "high",
              colors.severity.high,
              "#94a3b8",
            ],
            "circle-stroke-color": "#0f172a",
            "circle-stroke-width": 2,
            "circle-opacity": 0.9,
          },
        });

        map.addLayer({
          id: "ao-labels",
          type: "symbol",
          source: "ao",
          filter: [
            "in",
            ["get", "feature_type"],
            ["literal", ["ao_boundary", "nai", "objective", "village", "suspected_site"]],
          ],
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#f8fafc",
            "text-halo-color": "#0f172a",
            "text-halo-width": 1.5,
          },
        });

        // Click handlers
        map.on("click", "spots-layer", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const id = f.properties?.id as string;
          if (id) setSelection({ kind: "spot", id });
        });
        map.on("click", "sensors", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const id = f.properties?.label as string;
          if (id) setSelection({ kind: "sensor", id });
        });

        for (const id of ["spots-layer", "sensors"]) {
          map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
        }

        setStyleReady(true);
      } catch (err) {
        console.error("Failed to load AO geojson", err);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
  }, [setSelection]);

  // Push events into the spots source whenever they change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const src = map.getSource("spots");
    if (src && "setData" in src) {
      (src as maplibregl.GeoJSONSource).setData(spotsToFeatureCollection(events));
    }
  }, [events, styleReady]);

  // Layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const setVis = (id: string, visible: boolean) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    };
    setVis("sensors", visibleLayers.has("sensors"));
    setVis("nai-fill", visibleLayers.has("nais"));
    setVis("nai-line", visibleLayers.has("nais"));
    setVis("drone-orbit", visibleLayers.has("drone-orbit"));
    setVis("spots-layer", visibleLayers.has("spots"));
  }, [visibleLayers, styleReady]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
