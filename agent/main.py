import logging
import time

from graph import run_heuristics
from insights import extract_insights

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 15  # seconds between runs


def run_once():
    log.info("Running heuristics...")
    data = run_heuristics()
    log.info("Heuristic data: %s", data)

    insights = extract_insights(data)
    if insights:
        log.info("Insights:\n%s", insights)


if __name__ == "__main__":
    log.info("Agent starting. Polling every %ds.", INTERVAL)
    while True:
        try:
            run_once()
        except Exception as e:
            log.error("Error during run: %s", e)
        time.sleep(INTERVAL)
