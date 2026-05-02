import logging
import os
import time

from pymongo import MongoClient
from report import above_threshold, build_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 10  # seconds between polls
MONGO_URI = os.environ["MONGODB_URI"]
BATCH_SIZE = 50


def process(signals_col, reports_col):
    pending = list(signals_col.find({"processed": False}).limit(BATCH_SIZE))
    if not pending:
        return

    to_report = [s for s in pending if above_threshold(s)]
    processed_ids = [s["_id"] for s in pending]

    if to_report:
        reports = [build_report(s) for s in to_report]
        reports_col.insert_many(reports)
        log.info("Generated %d report(s) from %d signal(s)", len(reports), len(pending))

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
