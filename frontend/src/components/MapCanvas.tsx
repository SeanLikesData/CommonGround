import { useEffect, useMemo, useRef, useState } from "react";
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
import { colors, severityColor, type Severity } from "@/lib/symbology";
import { setMapInstance } from "@/lib/mapInstance";
import type { AlertEvent, SpotEvent } from "@/lib/types";

const GEOJSON_URL = "/geojson/ao-lionheart.geojson";

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  med: 1,
  "med-high": 2,
  high: 3,
};

function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function spotsToFeatureCollection(spots: SpotEvent[], sensorLabels: Set<string>) {
  return {
    type: "FeatureCollection" as const,
    features: spots
      .filter((s) => !s.sensorId || !sensorLabels.has(s.sensorId))
      .map((s) => ({
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
  const sensorPulseRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [sensorIndex, setSensorIndex] = useState<{
    labels: Set<string>;
    coords: Map<string, [number, number]>;
    isTrailCam: Set<string>;
  }>({ labels: new Set(), coords: new Map(), isTrailCam: new Set() });

  const hotSensors = useMemo(() => {
    const m = new Map<string, Severity>();
    for (const e of events) {
      if (!e.sensorId || !sensorIndex.labels.has(e.sensorId)) continue;
      const cur = m.get(e.sensorId);
      m.set(e.sensorId, cur ? maxSeverity(cur, e.severity) : e.severity);
    }
    return m;
  }, [events, sensorIndex]);

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

        const labels = new Set<string>();
        const coords = new Map<string, [number, number]>();
        const isTrailCam = new Set<string>();
        for (const f of geojson.features as GeoJSON.Feature[]) {
          const p = (f.properties ?? {}) as Record<string, unknown>;
          if (p.feature_type !== "sensor") continue;
          const label = p.label as string | undefined;
          if (!label || f.geometry?.type !== "Point") continue;
          labels.add(label);
          coords.set(label, (f.geometry as GeoJSON.Point).coordinates as [number, number]);
          if (p.sensor_type === "trail_cam") isTrailCam.add(label);
        }
        setSensorIndex({ labels, coords, isTrailCam });

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

        // SPOT glyph: single shape — reporter type lives in the detail panel.
        // Sensor-attached spots are filtered out and instead "upgrade" the
        // sensor's own ring (severity stroke + pulse), so the SPOT layer only
        // renders free-standing reports (e.g. human-typed observations).
        map.addLayer({
          id: "spots-layer",
          type: "symbol",
          source: "spots",
          layout: {
            "text-field": "●",
            "text-size": 14,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#f8fafc",
            "text-halo-color": "#0f172a",
            "text-halo-width": 1.5,
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
    const sensorPulses = sensorPulseRef.current;
    return () => {
      for (const m of markers.values()) m.remove();
      markers.clear();
      for (const m of sensorPulses.values()) m.remove();
      sensorPulses.clear();
      setMapInstance(null);
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
  }, [setSelection]);

  // Push events into the spots source whenever they change. Sensor-attached
  // spots are filtered out — the sensor itself lights up instead.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const src = map.getSource("spots");
    if (src && "setData" in src) {
      (src as maplibregl.GeoJSONSource).setData(
        spotsToFeatureCollection(events, sensorIndex.labels),
      );
    }
  }, [events, sensorIndex, styleReady]);

  // Upgrade hot sensors: severity-colored stroke, thicker ring, animated
  // pulse overlay. Cool back to base when no spots reference the sensor.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    const sensorsVisible = visibleLayers.has("sensors");

    const buildStrokeColor = (
      base: string,
      filterFn: (label: string) => boolean,
    ): string | maplibregl.ExpressionSpecification => {
      const entries = Array.from(hotSensors.entries()).filter(([l]) => filterFn(l));
      if (entries.length === 0) return base;
      const expr: unknown[] = ["case"];
      for (const [label, sev] of entries) {
        expr.push(["==", ["get", "label"], label], severityColor(sev));
      }
      expr.push(base);
      return expr as maplibregl.ExpressionSpecification;
    };

    const buildStrokeWidth = (
      base: number,
      filterFn: (label: string) => boolean,
    ): number | maplibregl.ExpressionSpecification => {
      const labels = Array.from(hotSensors.keys()).filter(filterFn);
      if (labels.length === 0) return base;
      return [
        "case",
        ["in", ["get", "label"], ["literal", labels]],
        base + 1.5,
        base,
      ] as maplibregl.ExpressionSpecification;
    };

    if (map.getLayer("sensors")) {
      map.setPaintProperty(
        "sensors",
        "circle-stroke-color",
        buildStrokeColor(layerColors.sensor, (l) => !sensorIndex.isTrailCam.has(l)),
      );
      map.setPaintProperty(
        "sensors",
        "circle-stroke-width",
        buildStrokeWidth(2, (l) => !sensorIndex.isTrailCam.has(l)),
      );
    }
    if (map.getLayer("trail-cams")) {
      map.setPaintProperty(
        "trail-cams",
        "circle-stroke-color",
        buildStrokeColor(layerColors.trailCam, (l) => sensorIndex.isTrailCam.has(l)),
      );
      map.setPaintProperty(
        "trail-cams",
        "circle-stroke-width",
        buildStrokeWidth(2, (l) => sensorIndex.isTrailCam.has(l)),
      );
    }

    const seen = new Set<string>();
    if (sensorsVisible) {
      for (const [label, sev] of hotSensors) {
        const coord = sensorIndex.coords.get(label);
        if (!coord) continue;
        seen.add(label);
        const existing = sensorPulseRef.current.get(label);
        if (existing) {
          const el = existing.getElement();
          el.style.setProperty("--alert-color", severityColor(sev));
          continue;
        }
        const el = document.createElement("div");
        el.className = "sensor-hot-marker";
        el.style.setProperty("--alert-color", severityColor(sev));
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(coord)
          .addTo(map);
        sensorPulseRef.current.set(label, marker);
      }
    }
    for (const [label, m] of sensorPulseRef.current) {
      if (!seen.has(label)) {
        m.remove();
        sensorPulseRef.current.delete(label);
      }
    }
  }, [hotSensors, sensorIndex, visibleLayers, styleReady]);

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
