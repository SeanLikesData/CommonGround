import logging
import os
import time
from datetime import datetime, timezone

from pymongo import MongoClient
from simulate import rf_signal, drone_video, ugs_reading

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 5  # seconds between polling cycles
MONGO_URI = os.environ["MONGODB_URI"]


# ── background noise (random signals when no scenario is active) ──────────────

def emit_signals(col):
    signals = [rf_signal(), drone_video(), ugs_reading()]
    result = col.insert_many(signals)
    log.info(
        "Background: inserted %d signals: %s",
        len(result.inserted_ids),
        [s["modality"] for s in signals],
    )


# ── scenario control ──────────────────────────────────────────────────────────

def get_control(col_control):
    """Return the active scenario control document, or None."""
    return col_control.find_one({"_id": "scenario"})


def run_scenario_step(col_signals, col_control, control):
    """Emit the next scenario event if its delay has elapsed; mark idle when done."""
    from scenarios.registry import SCENARIOS

    scenario = SCENARIOS.get(control.get("scenario_id"))
    step = control.get("step", 0)

    # Scenario unknown or exhausted — flip to idle
    if not scenario or step >= len(scenario["events"]):
        col_control.update_one(
            {"_id": "scenario"},
            {"$set": {"status": "idle"}},
        )
        log.info("Scenario %s complete — returning to background noise.", control.get("scenario_id"))
        return

    event = scenario["events"][step]

    # Check whether enough real time has elapsed since the scenario started
    started_at = control.get("started_at")
    if started_at is None:
        log.warning("Control doc missing started_at — resetting scenario.")
        col_control.update_one({"_id": "scenario"}, {"$set": {"status": "idle"}})
        return

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    if elapsed < event["delay_seconds"]:
        log.debug(
            "Scenario %s step %d: waiting (%.1fs / %.1fs)",
            control["scenario_id"],
            step,
            elapsed,
            event["delay_seconds"],
        )
        return

    # Stamp the current wall-clock time and insert
    signal = {**event["signal"], "timestamp": datetime.now(timezone.utc)}
    col_signals.insert_one(signal)

    log.info(
        "Scenario %s step %d/%d emitted: %s",
        control["scenario_id"],
        step + 1,
        len(scenario["events"]),
        signal["modality"],
    )

    col_control.update_one(
        {"_id": "scenario"},
        {"$set": {"step": step + 1}},
    )


# ── main loop ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    client = MongoClient(MONGO_URI)
    db = client["commonground"]
    col_signals = db["signals"]
    col_control = db["control"]

    log.info("data-streaming starting. Polling every %ds.", INTERVAL)

    while True:
        try:
            control = get_control(col_control)
            if control and control.get("status") == "active":
                run_scenario_step(col_signals, col_control, control)
            else:
                emit_signals(col_signals)
        except Exception as e:
            log.error("Error in main loop: %s", e)
        time.sleep(INTERVAL)
