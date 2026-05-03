# Scenario registry — single source of truth for all available scenarios.
#
# To add a new scenario:
#   1. Create data-streaming/scenarios/<your_scenario>.py with an EVENTS list.
#   2. Import it below and add one entry to SCENARIOS.
#
# SCENARIOS keys are used as scenario_id in the MongoDB control document.

from .wadi_hamrin import EVENTS as _WADI_HAMRIN_EVENTS
from .indopacom_incursion import EVENTS as _INDOPACOM_EVENTS

SCENARIOS: dict = {
    "wadi_hamrin": {
        "id": "wadi_hamrin",
        "name": "Wadi Hamrin Pre-positioning",
        "theater": "CENTCOM",
        "description": (
            "Multi-modal ambush detection in AO LIONHEART (Hamrin range, Iraq). "
            "UGS seismic detects tracked vehicle → RF burst catches adversary "
            "coordination → drone visual confirms staging area."
        ),
        "modalities": ["ugs", "rf", "drone_video"],
        "event_count": len(_WADI_HAMRIN_EVENTS),
        "events": _WADI_HAMRIN_EVENTS,
    },
    "indopacom_incursion": {
        "id": "indopacom_incursion",
        "name": "Luzon Strait Dark Vessel Incursion",
        "theater": "INDOPACOM",
        "description": (
            "Multi-domain maritime incursion through Luzon Strait. "
            "AIS transponder goes dark → surface radar acquires ghost contact → "
            "passive sonar detects submerged escort → ELINT identifies DDG cover."
        ),
        "modalities": ["ais", "maritime_radar", "sonar", "elint"],
        "event_count": len(_INDOPACOM_EVENTS),
        "events": _INDOPACOM_EVENTS,
    },
}
