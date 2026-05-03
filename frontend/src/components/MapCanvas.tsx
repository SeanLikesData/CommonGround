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
import {
  passesAlertFilter,
  passesSpotFilter,
  useMapStore,
  type SpotDisplayMode,
} from "@/lib/store";
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

interface SensorIndex {
  labels: Set<string>;
  coords: Map<string, [number, number]>;
  isIUgs: Set<string>;
}

interface HotSensor {
  severity: Severity;
  count: number;
}

interface DisplayState {
  spots: GeoJSON.FeatureCollection;
  leaders: GeoJSON.FeatureCollection;
  hot: Map<string, HotSensor>;
}

// Lollipop fan rendered in pixel space so the spread stays readable at every
// zoom level — at low zooms a fixed degree offset collapses to one pixel.
const FAN_RADIUS_PX = 84;
const FAN_STEP_DEG = 32;

function fanOffset(
  map: MapLibreMap,
  sensorCoord: [number, number],
  index: number,
  total: number,
): [number, number] {
  const stepRad = (FAN_STEP_DEG * Math.PI) / 180;
  const baseAngle = -Math.PI / 2; // screen-space "up" (y grows downward)
  const a = baseAngle + (index - (total - 1) / 2) * stepRad;
  const origin = map.project(sensorCoord);
  const point = map.unproject([
    origin.x + Math.cos(a) * FAN_RADIUS_PX,
    origin.y + Math.sin(a) * FAN_RADIUS_PX,
  ]);
  return [point.lng, point.lat];
}

function spotFeature(s: SpotEvent, coord: [number, number]): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {
      id: s.id,
      severity: s.severity,
      source: s.source,
      salute: s.salute,
    },
    geometry: { type: "Point", coordinates: coord },
  };
}

function computeDisplay(
  events: SpotEvent[],
  sensorIndex: SensorIndex,
  mode: SpotDisplayMode,
  map: MapLibreMap | null,
): DisplayState {
  const bySensor = new Map<string, SpotEvent[]>();
  const freeStanding: SpotEvent[] = [];
  for (const e of events) {
    if (e.sensorId && sensorIndex.labels.has(e.sensorId)) {
      const arr = bySensor.get(e.sensorId);
      if (arr) arr.push(e);
      else bySensor.set(e.sensorId, [e]);
    } else {
      freeStanding.push(e);
    }
  }

  const hot = new Map<string, HotSensor>();
  for (const [label, list] of bySensor) {
    let sev = list[0].severity;
    for (const s of list) sev = maxSeverity(sev, s.severity);
    hot.set(label, { severity: sev, count: list.length });
  }

  const spotFeatures: GeoJSON.Feature[] = freeStanding.map((s) =>
    spotFeature(s, s.location),
  );
  const leaderFeatures: GeoJSON.Feature[] = [];

  if (mode === "offset" && map) {
    // Sensor-attached spots fan out from the sensor with a leader line.
    for (const [label, list] of bySensor) {
      const coord = sensorIndex.coords.get(label);
      if (!coord) continue;
      const sorted = [...list].sort((a, b) => a.t - b.t);
      sorted.forEach((s, i) => {
        const off = fanOffset(map, coord, i, sorted.length);
        spotFeatures.push(spotFeature(s, off));
        leaderFeatures.push({
          type: "Feature",
          properties: {
            sensorId: label,
            spotId: s.id,
            severity: s.severity,
          },
          geometry: { type: "LineString", coordinates: [coord, off] },
        });
      });
    }
  }
  // "merge" and "cluster" leave sensor-attached spots out of the spots layer:
  // the sensor itself carries the signal (severity ring + pulse, plus a count
  // badge in cluster mode).

  return {
    spots: { type: "FeatureCollection", features: spotFeatures },
    leaders: { type: "FeatureCollection", features: leaderFeatures },
    hot,
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

  const allEvents = useMapStore((s) => s.events);
  const allAlerts = useMapStore((s) => s.alerts);
  const setSelection = useMapStore((s) => s.setSelection);
  const visibleLayers = useMapStore((s) => s.visibleLayers);
  const chatOpen = useMapStore((s) => s.chatOpen);
  const spotDisplayMode = useMapStore((s) => s.spotDisplayMode);
  const timeMin = useMapStore((s) => s.timeMin);
  const timeMax = useMapStore((s) => s.timeMax);
  const severityFilter = useMapStore((s) => s.severityFilter);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const cursorT = useMapStore((s) => s.cursorT);

  const events = useMemo(
    () =>
      allEvents.filter((e) =>
        passesSpotFilter(e, {
          timeMin,
          timeMax,
          severityFilter,
          sourceFilter,
          cursorT,
        }),
      ),
    [allEvents, timeMin, timeMax, severityFilter, sourceFilter, cursorT],
  );
  const alerts = useMemo(
    () =>
      allAlerts.filter((a) =>
        passesAlertFilter(a, { timeMin, timeMax, severityFilter, cursorT }),
      ),
    [allAlerts, timeMin, timeMax, severityFilter, cursorT],
  );
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const sensorPulseRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [sensorIndex, setSensorIndex] = useState<SensorIndex>({
    labels: new Set(),
    coords: new Map(),
    isIUgs: new Set(),
  });
  // Bumped on every map "move" so lollipop offsets recompute against the
  // current pixel-space projection (zoom, pan, pitch all change it).
  const [viewTick, setViewTick] = useState(0);

  const display = useMemo(
    () => computeDisplay(events, sensorIndex, spotDisplayMode, mapRef.current),
    // viewTick is intentionally a dep: recomputes pixel-space lollipop fans.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, sensorIndex, spotDisplayMode, viewTick, styleReady],
  );

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
        const isIUgs = new Set<string>();
        for (const f of geojson.features as GeoJSON.Feature[]) {
          const p = (f.properties ?? {}) as Record<string, unknown>;
          if (p.feature_type !== "sensor") continue;
          const label = p.label as string | undefined;
          if (!label || f.geometry?.type !== "Point") continue;
          labels.add(label);
          coords.set(label, (f.geometry as GeoJSON.Point).coordinates as [number, number]);
          if (p.sensor_type === "i_ugs") isIUgs.add(label);
        }
        setSensorIndex({ labels, coords, isIUgs });

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
            ["!=", ["get", "sensor_type"], "i_ugs"],
          ],
          paint: {
            "circle-radius": 6,
            "circle-color": "#0f172a",
            "circle-stroke-color": layerColors.sensor,
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "i-ugs-sensors",
          type: "circle",
          source: "ao",
          filter: [
            "all",
            ["==", ["get", "feature_type"], "sensor"],
            ["==", ["get", "sensor_type"], "i_ugs"],
          ],
          paint: {
            "circle-radius": 5,
            "circle-color": "#0f172a",
            "circle-stroke-color": layerColors.iUgs,
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

        // SPOT halo: severity-colored disc behind the glyph; reused by the
        // lollipop leader lines that connect a sensor to its offset spots.
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

        // Lollipop leaders (sensor → offset spot). Empty unless display mode
        // is "offset"; managed by an effect below.
        map.addSource("leaders", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "leaders-layer",
          type: "line",
          source: "leaders",
          paint: {
            "line-color": severityMatch,
            "line-width": 1.2,
            "line-opacity": 0.7,
            "line-dasharray": [2, 2],
          },
        });

        // Dynamic SPOT layer
        map.addSource("spots", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
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
        for (const layerId of ["sensors", "i-ugs-sensors"]) {
          map.on("click", layerId, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const id = f.properties?.label as string;
            if (id) setSelection({ kind: "sensor", id });
          });
        }

        for (const id of ["spots-layer", "spots-halo", "sensors", "i-ugs-sensors"]) {
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

  // Recompute lollipop offsets while the map is moving (zoom/pan/pitch).
  // Only attached in "offset" mode — the other modes don't depend on the
  // viewport projection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || spotDisplayMode !== "offset") return;
    const bump = () => setViewTick((t) => t + 1);
    map.on("move", bump);
    return () => {
      map.off("move", bump);
    };
  }, [styleReady, spotDisplayMode]);

  // Push the computed spots + leaders into their sources whenever the
  // display state changes (events, sensor index, or display mode).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const spotsSrc = map.getSource("spots");
    if (spotsSrc && "setData" in spotsSrc) {
      (spotsSrc as maplibregl.GeoJSONSource).setData(display.spots);
    }
    const leadersSrc = map.getSource("leaders");
    if (leadersSrc && "setData" in leadersSrc) {
      (leadersSrc as maplibregl.GeoJSONSource).setData(display.leaders);
    }
  }, [display, styleReady]);

  // Sensor visual state. Branches on the display mode:
  //   merge   → severity stroke + thicker ring + pulse marker
  //   cluster → same as merge plus a count badge on the marker
  //   offset  → no upgrade; sensor stays muted, spots fan out via leaders
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    const sensorsVisible = visibleLayers.has("sensors");
    const showUpgrade = spotDisplayMode !== "offset";

    const buildStrokeColor = (
      base: string,
      filterFn: (label: string) => boolean,
    ): string | maplibregl.ExpressionSpecification => {
      if (!showUpgrade) return base;
      const entries = Array.from(display.hot.entries()).filter(([l]) => filterFn(l));
      if (entries.length === 0) return base;
      const expr: unknown[] = ["case"];
      for (const [label, info] of entries) {
        expr.push(["==", ["get", "label"], label], severityColor(info.severity));
      }
      expr.push(base);
      return expr as maplibregl.ExpressionSpecification;
    };

    const buildStrokeWidth = (
      base: number,
      filterFn: (label: string) => boolean,
    ): number | maplibregl.ExpressionSpecification => {
      if (!showUpgrade) return base;
      const labels = Array.from(display.hot.keys()).filter(filterFn);
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
        buildStrokeColor(layerColors.sensor, (l) => !sensorIndex.isIUgs.has(l)),
      );
      map.setPaintProperty(
        "sensors",
        "circle-stroke-width",
        buildStrokeWidth(2, (l) => !sensorIndex.isIUgs.has(l)),
      );
    }
    if (map.getLayer("i-ugs-sensors")) {
      map.setPaintProperty(
        "i-ugs-sensors",
        "circle-stroke-color",
        buildStrokeColor(layerColors.iUgs, (l) => sensorIndex.isIUgs.has(l)),
      );
      map.setPaintProperty(
        "i-ugs-sensors",
        "circle-stroke-width",
        buildStrokeWidth(2, (l) => sensorIndex.isIUgs.has(l)),
      );
    }

    const wantMarkers = sensorsVisible && spotDisplayMode !== "offset";
    const expectedClass =
      spotDisplayMode === "cluster" ? "sensor-cluster-marker" : "sensor-hot-marker";

    const seen = new Set<string>();
    if (wantMarkers) {
      for (const [label, info] of display.hot) {
        const coord = sensorIndex.coords.get(label);
        if (!coord) continue;
        seen.add(label);
        const sevColor = severityColor(info.severity);
        const existing = sensorPulseRef.current.get(label);

        if (existing) {
          const el = existing.getElement();
          if (el.classList.contains(expectedClass)) {
            el.style.setProperty("--alert-color", sevColor);
            if (spotDisplayMode === "cluster") {
              const badge = el.querySelector(".sensor-cluster-marker__count");
              if (badge) badge.textContent = String(info.count);
            }
            continue;
          }
          existing.remove();
          sensorPulseRef.current.delete(label);
        }

        const el = document.createElement("div");
        el.style.setProperty("--alert-color", sevColor);
        if (spotDisplayMode === "cluster") {
          el.className = "sensor-cluster-marker";
          const pulse = document.createElement("span");
          pulse.className = "sensor-cluster-marker__pulse";
          const badge = document.createElement("span");
          badge.className = "sensor-cluster-marker__count";
          badge.textContent = String(info.count);
          el.append(pulse, badge);
        } else {
          el.className = "sensor-hot-marker";
        }
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
  }, [display, sensorIndex, visibleLayers, styleReady, spotDisplayMode]);

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
    setVis("i-ugs-sensors", visibleLayers.has("sensors"));
    setVis("nai-fill", visibleLayers.has("nais"));
    setVis("nai-line", visibleLayers.has("nais"));
    setVis("drone-orbit", visibleLayers.has("drone-orbit"));
    setVis("spots-layer", visibleLayers.has("spots"));
    setVis("spots-halo", visibleLayers.has("spots"));
    setVis("leaders-layer", visibleLayers.has("spots"));
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
