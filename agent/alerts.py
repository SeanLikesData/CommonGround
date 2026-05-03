import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from pymongo import MongoClient
from pymongo.collection import Collection

log = logging.getLogger(__name__)

MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://mongo:27017/commonground")

_client: Optional[MongoClient] = None


def _alerts() -> Collection:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client.get_default_database()["alerts"]


def _severity(report_count: int, mods: list[str]) -> str:
    multi = len(set(mods)) >= 2
    if multi and report_count >= 5:
        return "high"
    if multi or report_count >= 5:
        return "med"
    return "low"


_SENSOR_LABELS = {
    "rf": "radio",
    "drone_video": "drone video",
    "ugs": "ground sensor",
    "sigint": "SIGINT",
    "elint": "ELINT",
    "imint": "imagery",
}

_TRIGGER_HEADLINE = {
    "multi-INT": "Multi-sensor activity",
    "force-concentration": "Possible force buildup",
    "first-contact": "New contact",
}


def _pretty_sensors(mods: list[str]) -> str:
    labels = [_SENSOR_LABELS.get(m, m.replace("_", " ")) for m in sorted(set(mods)) if m]
    if not labels:
        return "unknown sensors"
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} + {labels[1]}"
    return ", ".join(labels[:-1]) + f", + {labels[-1]}"


def _pretty_location(lat: Optional[float], lon: Optional[float], geohash: str) -> str:
    if lat is None or lon is None:
        return f"grid {geohash}"
    return f"near {lat:.3f}, {lon:.3f}"


def _summary(
    geohash: str,
    mods: list[str],
    reports: int,
    sources: list[str],
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> str:
    headline = next(
        (_TRIGGER_HEADLINE[s] for s in sources if s in _TRIGGER_HEADLINE),
        "Activity detected",
    )
    sensors = _pretty_sensors(mods)
    loc = _pretty_location(lat, lon, geohash)
    noun = "report" if reports == 1 else "reports"
    return f"{headline} {loc} — {reports} {noun} ({sensors})"


def derive_alerts(heuristics: dict[str, list[dict]]) -> list[dict[str, Any]]:
    """Build one alert per region from heuristic outputs that warrant attention."""
    by_geohash: dict[str, dict[str, Any]] = {}

    triggers = {
        "multi_int_corroboration": "multi-INT",
        "force_concentration": "force-concentration",
        "first_contact": "first-contact",
    }
    for key, label in triggers.items():
        for row in heuristics.get(key, []):
            gh = row.get("geohash")
            if not gh:
                continue
            entry = by_geohash.setdefault(
                gh,
                {
                    "geohash": gh,
                    "lat": row.get("lat"),
                    "lon": row.get("lon"),
                    "mods": [],
                    "report_ids": [],
                    "report_count": 0,
                    "sources": [],
                    "first_seen": row.get("first_seen"),
                    "latest": row.get("latest"),
                },
            )
            entry["sources"].append(label)
            for m in row.get("mods", []):
                if m and m not in entry["mods"]:
                    entry["mods"].append(m)
            for rid in row.get("report_ids", []):
                if rid and rid not in entry["report_ids"]:
                    entry["report_ids"].append(rid)
            n = row.get("reports") or row.get("recent") or 0
            entry["report_count"] = max(entry["report_count"], int(n))
            if row.get("latest") and (
                not entry["latest"] or row["latest"] > entry["latest"]
            ):
                entry["latest"] = row["latest"]

    return list(by_geohash.values())


def persist_alerts(alerts: list[dict[str, Any]], reasoning: Optional[str]) -> int:
    """Upsert alerts by geohash. Returns count written."""
    if not alerts:
        return 0
    col = _alerts()
    now = datetime.now(timezone.utc)
    written = 0
    for a in alerts:
        sev = _severity(a["report_count"], a["mods"])
        summary = _summary(
            a["geohash"],
            a["mods"],
            a["report_count"],
            a["sources"],
            a.get("lat"),
            a.get("lon"),
        )
        doc = {
            "geohash": a["geohash"],
            "lat": a["lat"],
            "lon": a["lon"],
            "severity": sev,
            "summary": summary,
            "modalities": a["mods"],
            "report_count": a["report_count"],
            "contributing_report_ids": a["report_ids"][:50],
            "triggers": a["sources"],
            "reasoning": reasoning,
            "updated_at": now,
            "latest_report_at": a.get("latest"),
        }
        col.update_one(
            {"_id": a["geohash"]},
            {
                "$set": doc,
                "$setOnInsert": {"first_seen_at": now},
            },
            upsert=True,
        )
        written += 1
    log.info("persisted %d alert(s)", written)
    return written


def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
