import logging
import os
import time

from pymongo import MongoClient
from kg import apply_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 15  # seconds between polls
MONGO_URI = os.environ["MONGODB_URI"]
BATCH_SIZE = 50


def process(reports_col):
    pending = list(reports_col.find({"kg_synced": False}).limit(BATCH_SIZE))
    if not pending:
        return

    for report in pending:
        apply_report(report)
        reports_col.update_one({"_id": report["_id"]}, {"$set": {"kg_synced": True}})

    log.info("Synced %d report(s) to KG", len(pending))


if __name__ == "__main__":
    client = MongoClient(MONGO_URI)
    db = client["commonground"]
    log.info("kg-update starting. Polling every %ds.", INTERVAL)
    while True:
        try:
            process(db["reports"])
        except Exception as e:
            log.error("Error syncing to KG: %s", e)
        time.sleep(INTERVAL)
