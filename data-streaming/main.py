import logging
import os
import time

from pymongo import MongoClient
from simulate import rf_signal, drone_video, ugs_reading

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 5  # seconds between batches
MONGO_URI = os.environ["MONGODB_URI"]


def emit_signals(col):
    signals = [rf_signal(), drone_video(), ugs_reading()]
    result = col.insert_many(signals)
    log.info("Inserted %d signals: %s", len(result.inserted_ids), [s["modality"] for s in signals])


if __name__ == "__main__":
    client = MongoClient(MONGO_URI)
    col = client["commonground"]["signals"]
    log.info("data-streaming starting. Emitting every %ds.", INTERVAL)
    while True:
        try:
            emit_signals(col)
        except Exception as e:
            log.error("Error emitting signals: %s", e)
        time.sleep(INTERVAL)
