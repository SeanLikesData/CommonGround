from datetime import datetime
from typing import Any

from geo import geohashes, normalize_location

SKIP_SIGNAL_KEYS = {
    "_id",
    "processed",
    "location",
    "coordinates",
    "modality",
    "timestamp",
    "sensor_id",
}

CYPHER_APPLY_REPORT = """
MERGE (m:Modality {name: $modality})

MERGE (rg:Region {geohash: $region_geohash})
  ON CREATE SET rg.lat = $lat, rg.lon = $lon

MERGE (loc:Location {geohash: $location_geohash})
  ON CREATE SET
    loc.lat = $lat,
    loc.lon = $lon,
    loc.point = point({latitude: $lat, longitude: $lon})

MERGE (loc)-[:WITHIN]->(rg)

MERGE (sig:Signal {id: $signal_id})
  ON CREATE SET sig.modality = $modality
SET sig.timestamp = datetime($timestamp), sig += $signal_props

MERGE (sig)-[:USES]->(m)
MERGE (sig)-[:OBSERVED_AT]->(loc)

FOREACH (sid IN CASE WHEN $sensor_id IS NULL THEN [] ELSE [$sensor_id] END |
  MERGE (s:Sensor {id: sid})
    ON CREATE SET s.modality = $modality
  SET s.last_seen_at = datetime($timestamp)
  MERGE (s)-[:HAS_MODALITY]->(m)
  MERGE (s)-[:EMITTED]->(sig)
)

MERGE (r:Report {id: $report_id})
  ON CREATE SET
    r.source_signal_id = $signal_id,
    r.modality = $modality,
    r.created_at = datetime($created_at)
SET r.narrative = $narrative

MERGE (r)-[:DERIVED_FROM]->(sig)
MERGE (r)-[:OBSERVED_AT]->(loc)
"""


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def build_params(report: dict) -> dict:
    signal = report["signal"]
    loc = normalize_location(signal)
    if not loc:
        raise ValueError(f"report {report['_id']} signal has no location")

    location_geohash, region_geohash = geohashes(loc["lat"], loc["lon"])
    signal_props = {k: v for k, v in signal.items() if k not in SKIP_SIGNAL_KEYS}

    return {
        "report_id": str(report["_id"]),
        "signal_id": str(report["source_signal_id"]),
        "modality": report["modality"],
        "timestamp": _to_iso(signal["timestamp"]),
        "created_at": _to_iso(report["created_at"]),
        "lat": loc["lat"],
        "lon": loc["lon"],
        "location_geohash": location_geohash,
        "region_geohash": region_geohash,
        "sensor_id": signal.get("sensor_id"),
        "signal_props": signal_props,
        "narrative": report.get("narrative"),
    }
