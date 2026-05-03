import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from neo4j import Driver, GraphDatabase

log = logging.getLogger(__name__)

URI = os.environ["NEO4J_URI"]
USER = os.environ["NEO4J_USER"]
PASSWORD = os.environ["NEO4J_PASSWORD"]

_driver: Optional[Driver] = None


def driver() -> Driver:
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    return _driver


def close() -> None:
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


HEURISTICS: dict[str, str] = {
    "new_activity": """
        MATCH (r:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg:Region)
        WHERE r.created_at > datetime($since)
        RETURN reg.geohash AS geohash, reg.lat AS lat, reg.lon AS lon,
               r.modality AS modality,
               count(r) AS reports,
               max(r.created_at) AS latest
        ORDER BY latest DESC LIMIT 25
    """,
    "multi_int_corroboration": """
        MATCH (r:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg:Region)
        WHERE r.created_at > datetime($since)
        WITH reg, collect(DISTINCT r.modality) AS mods, count(r) AS n
        WHERE size(mods) >= 2
        RETURN reg.geohash AS geohash, reg.lat AS lat, reg.lon AS lon,
               mods, n AS reports
        ORDER BY size(mods) DESC, n DESC LIMIT 10
    """,
    "first_contact": """
        MATCH (r:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg:Region)
        WHERE r.created_at > datetime($since)
        WITH reg, count(r) AS recent, collect(DISTINCT r.modality) AS mods,
             min(r.created_at) AS first_seen
        OPTIONAL MATCH (r2:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg)
        WHERE r2.created_at <= datetime($since) AND r2.created_at > datetime($baseline_start)
        WITH reg, recent, mods, first_seen, count(r2) AS prior
        WHERE prior = 0
        RETURN reg.geohash AS geohash, reg.lat AS lat, reg.lon AS lon,
               recent, mods, first_seen
        ORDER BY first_seen DESC LIMIT 15
    """,
    "force_concentration": """
        MATCH (r:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg:Region)
        WHERE r.created_at > datetime($since)
        WITH reg, count(r) AS n, collect(DISTINCT r.modality) AS mods
        WHERE n >= 3
        RETURN reg.geohash AS geohash, reg.lat AS lat, reg.lon AS lon,
               n AS reports, mods
        ORDER BY n DESC LIMIT 10
    """,
    "modality_shift": """
        MATCH (r:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg:Region)
        WHERE r.created_at > datetime($since)
        WITH reg, collect(DISTINCT r.modality) AS recent_mods
        MATCH (r2:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg)
        WHERE r2.created_at <= datetime($since) AND r2.created_at > datetime($baseline_start)
        WITH reg, recent_mods, collect(DISTINCT r2.modality) AS prior_mods
        WITH reg, recent_mods, prior_mods,
             [m IN recent_mods WHERE NOT m IN prior_mods] AS new_mods
        WHERE size(new_mods) > 0 AND size(prior_mods) > 0
        RETURN reg.geohash AS geohash, reg.lat AS lat, reg.lon AS lon,
               prior_mods, new_mods
        LIMIT 10
    """,
    "persistent_contact": """
        MATCH (r:Report)-[:OBSERVED_AT]->(:Location)-[:WITHIN]->(reg:Region)
        WHERE r.created_at > datetime($since)
        WITH reg,
             count(DISTINCT toString(date(r.created_at)) + ':' + toString(r.created_at.hour)) AS buckets,
             count(r) AS reports,
             collect(DISTINCT r.modality) AS mods
        WHERE buckets >= 3
        RETURN reg.geohash AS geohash, reg.lat AS lat, reg.lon AS lon,
               buckets, reports, mods
        ORDER BY buckets DESC LIMIT 10
    """,
    "sensor_reactivation": """
        MATCH (sen:Sensor)-[:EMITTED]->(sig:Signal)
        WHERE sig.timestamp > datetime($since)
        WITH sen, count(sig) AS recent, max(sig.timestamp) AS latest
        OPTIONAL MATCH (sen)-[:EMITTED]->(sig2:Signal)
        WHERE sig2.timestamp <= datetime($since) AND sig2.timestamp > datetime($baseline_start)
        WITH sen, recent, latest, count(sig2) AS prior
        WHERE prior = 0
        RETURN sen.id AS sensor_id, sen.modality AS modality,
               recent, latest LIMIT 15
    """,
}


def _serialize(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    return value


def run_heuristics(recent_window_sec: int, baseline_window_sec: int) -> dict[str, list[dict]]:
    now = datetime.now(timezone.utc)
    params = {
        "since": (now - timedelta(seconds=recent_window_sec)).isoformat(),
        "baseline_start": (now - timedelta(seconds=baseline_window_sec)).isoformat(),
    }
    results: dict[str, list[dict]] = {}
    with driver().session() as session:
        for name, query in HEURISTICS.items():
            try:
                records = session.run(query, params).data()
                results[name] = [_serialize(r) for r in records]
            except Exception as e:
                log.error("heuristic %s failed: %s", name, e)
                results[name] = []
    return results
