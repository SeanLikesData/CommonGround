import logging
import os
import time
from collections import defaultdict

from pymongo import MongoClient
from report import above_threshold, build_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 10  # seconds between polls
MONGO_URI = os.environ["MONGODB_URI"]
BATCH_SIZE = 500
CLUSTER_WINDOW_SEC = 30.0


def _cluster_key(signal: dict) -> tuple:
    entity = signal.get("_truth_entity_id") or f"_unk_{signal.get('sensor_id', 'na')}"
    modality = signal.get("modality", "na")
    ts = signal.get("sim_time_s")
    if ts is None:
        ts_val = signal.get("timestamp")
        ts = ts_val.timestamp() if hasattr(ts_val, "timestamp") else 0.0
    bucket = int(ts // CLUSTER_WINDOW_SEC)
    return (entity, modality, bucket)


def _signal_score(signal: dict) -> float:
    modality = signal.get("modality")
    if modality == "rf":
        return signal.get("signal_strength_dbm", -999)
    if modality == "drone_video":
        return signal.get("detection_confidence", 0)
    return signal.get("confidence", 0)


def process(signals_col, reports_col):
    pending = list(signals_col.find({"processed": False}).limit(BATCH_SIZE))
    if not pending:
        return

    processed_ids = [s["_id"] for s in pending]
    eligible = [s for s in pending if above_threshold(s)]

    clusters: dict[tuple, list[dict]] = defaultdict(list)
    for s in eligible:
        clusters[_cluster_key(s)].append(s)

    representatives = [max(group, key=_signal_score) for group in clusters.values()]

    if representatives:
        reports = [build_report(s) for s in representatives]
        reports_col.insert_many(reports)
        log.info(
            "Generated %d report(s) from %d eligible signal(s) across %d signal(s)",
            len(reports),
            len(eligible),
            len(pending),
        )

    signals_col.update_many(
        {"_id": {"$in": processed_ids}},
        {"$set": {"processed": True}},
    )


if __name__ == "__main__":
    client = MongoClient(MONGO_URI)
    db = client["commonground"]
    log.info("report-gen starting. Polling every %ds.", INTERVAL)
    while True:
        try:
            process(db["signals"], db["reports"])
        except Exception as e:
            log.error("Error processing signals: %s", e)
        time.sleep(INTERVAL)
