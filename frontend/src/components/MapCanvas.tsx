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
import { colors, severityColor } from "@/lib/symbology";
import { setMapInstance } from "@/lib/mapInstance";
import type { AlertEvent, SpotEvent } from "@/lib/types";

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

function connectionsToFeatureCollection(alerts: AlertEvent[], spots: SpotEvent[]) {
  const spotById = new Map(spots.map((s) => [s.id, s]));
  const features: GeoJSON.Feature[] = [];
  for (const a of alerts) {
    for (const sid of a.contributingSpotIds) {
      const s = spotById.get(sid);
      if (!s) continue;
      features.push({
        type: "Feature",
        properties: { alertId: a.id, severity: a.severity },
        geometry: { type: "LineString", coordinates: [s.location, a.location] },
      });
    }
  }
  return { type: "FeatureCollection" as const, features };
}

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [styleReady, setStyleReady] = useState(false);

  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const setSelection = useMapStore((s) => s.setSelection);
  const visibleLayers = useMapStore((s) => s.visibleLayers);
  const chatOpen = useMapStore((s) => s.chatOpen);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

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
    setMapInstance(map);

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "bottom-right",
    );
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

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
          filter: [
            "all",
            ["==", ["get", "feature_type"], "sensor"],
            ["!=", ["get", "sensor_type"], "trail_cam"],
          ],
          paint: {
            "circle-radius": 6,
            "circle-color": "#0f172a",
            "circle-stroke-color": layerColors.sensor,
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "trail-cams",
          type: "circle",
          source: "ao",
          filter: [
            "all",
            ["==", ["get", "feature_type"], "sensor"],
            ["==", ["get", "sensor_type"], "trail_cam"],
          ],
          paint: {
            "circle-radius": 5,
            "circle-color": "#0f172a",
            "circle-stroke-color": layerColors.trailCam,
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "patrol-loop",
          type: "line",
          source: "ao",
          filter: ["==", ["get", "feature_type"], "patrol_loop"],
          paint: {
            "line-color": layerColors.patrolLoop,
            "line-width": 2,
            "line-opacity": 0.75,
            "line-dasharray": [2, 2],
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

        // Connection lines (alert ← contributing spots)
        map.addSource("connections", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "connections-layer",
          type: "line",
          source: "connections",
          paint: {
            "line-color": colors.cyan,
            "line-width": 1.2,
            "line-opacity": 0.45,
            "line-dasharray": [1, 2],
          },
        });

        // Dynamic SPOT layer
        map.addSource("spots", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // SPOT halo: severity-colored disc behind the glyph.
        const severityMatch: maplibregl.ExpressionSpecification = [
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
        ];
        map.addLayer({
          id: "spots-halo",
          type: "circle",
          source: "spots",
          paint: {
            "circle-radius": 16,
            "circle-color": severityMatch,
            "circle-opacity": 0.65,
            "circle-stroke-color": "#0f172a",
            "circle-stroke-width": 1,
            "circle-stroke-opacity": 0.5,
          },
        });

        // SPOT glyph: shape encodes the reporter type, color tracks severity.
        map.addLayer({
          id: "spots-layer",
          type: "symbol",
          source: "spots",
          layout: {
            "text-field": [
              "match",
              ["get", "source"],
              "drone",
              "●",
              "ugs",
              "▲",
              "rf",
              "◆",
              "human",
              "★",
              "trail-cam",
              "■",
              "●",
            ],
            "text-size": 20,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": severityMatch,
            "text-halo-color": "#0f172a",
            "text-halo-width": 2,
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
        for (const layerId of ["spots-layer", "spots-halo"]) {
          map.on("click", layerId, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const id = f.properties?.id as string;
            if (id) setSelection({ kind: "spot", id });
          });
        }
        for (const layerId of ["sensors", "trail-cams"]) {
          map.on("click", layerId, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const id = f.properties?.label as string;
            if (id) setSelection({ kind: "sensor", id });
          });
        }

        for (const id of ["spots-layer", "spots-halo", "sensors", "trail-cams"]) {
          map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
        }

        setStyleReady(true);
      } catch (err) {
        console.error("Failed to load AO geojson", err);
      }
    });

    const markers = markersRef.current;
    return () => {
      for (const m of markers.values()) m.remove();
      markers.clear();
      setMapInstance(null);
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

  // Update connection lines whenever alerts or events change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const src = map.getSource("connections");
    if (src && "setData" in src) {
      (src as maplibregl.GeoJSONSource).setData(
        connectionsToFeatureCollection(alerts, events),
      );
    }
  }, [alerts, events, styleReady]);

  // Manage alert pulse markers as DOM elements.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    const seen = new Set<string>();
    for (const a of alerts) {
      seen.add(a.id);
      if (markersRef.current.has(a.id)) continue;
      const el = document.createElement("div");
      el.className = "alert-pulse-marker";
      el.style.setProperty("--alert-color", severityColor(a.severity));
      el.style.cursor = "pointer";
      el.style.pointerEvents = "auto";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelection({ kind: "alert", id: a.id });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(a.location)
        .addTo(map);
      markersRef.current.set(a.id, marker);
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [alerts, styleReady, setSelection]);

  // Resize map when the agent panel toggles so MapLibre redraws to the new width.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const id = window.setTimeout(() => map.resize(), 320);
    return () => window.clearTimeout(id);
  }, [chatOpen, styleReady]);

  // Layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const setVis = (id: string, visible: boolean) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    };
    setVis("sensors", visibleLayers.has("sensors"));
    setVis("trail-cams", visibleLayers.has("sensors"));
    setVis("nai-fill", visibleLayers.has("nais"));
    setVis("nai-line", visibleLayers.has("nais"));
    setVis("drone-orbit", visibleLayers.has("drone-orbit"));
    setVis("spots-layer", visibleLayers.has("spots"));
    setVis("spots-halo", visibleLayers.has("spots"));
    setVis("connections-layer", visibleLayers.has("alerts"));
    setVis("patrol-loop", visibleLayers.has("inferred"));
  }, [visibleLayers, styleReady]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
