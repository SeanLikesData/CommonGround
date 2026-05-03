import random
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Scenario


def generate_false_positives(
    scenario: "Scenario", t: float, dt: float, rng: random.Random
) -> list[dict]:
    """
    For each sensor, roll for spurious detections based on false_positive_rate_per_min.
    Returns low-confidence events tagged with _truth_entity_id = "FALSE_POSITIVE".
    """
    events = []
    for sensor in scenario.sensors:
        p = sensor.false_positive_rate_per_min * dt / 60.0
        if rng.random() >= p:
            continue

        confidence = rng.uniform(0.1, 0.4)
        event: dict = {
            "modality": sensor.modality,
            "sensor_id": sensor.id,
            "confidence": round(confidence, 3),
            "location": sensor.location_dict(),
            "sim_time_s": t,
            "_truth_entity_id": "FALSE_POSITIVE",
            "processed": False,
        }

        if sensor.modality == "rf":
            event.update(
                {
                    "frequency_mhz": round(rng.uniform(30.0, 500.0), 1),
                    "signal_strength_dbm": round(rng.uniform(-120.0, -80.0), 1),
                    "bandwidth_khz": 25.0,
                    "bearing_deg": round(rng.uniform(0, 360), 1),
                }
            )
        elif sensor.modality == "ugs":
            event.update(
                {
                    "detection_type": sensor.detection_type or "seismic",
                    "magnitude": round(rng.uniform(0.1, 1.0), 2),
                }
            )
        elif sensor.modality == "drone_video":
            event.update(
                {
                    "altitude_m": sensor.altitude_m or 100.0,
                    "heading_deg": round(rng.uniform(0, 360), 1),
                    "speed_ms": round(rng.uniform(10, 20), 1),
                    "detection_confidence": round(confidence, 3),
                    "coordinates": sensor.location_dict(),
                    "detected_object_location": sensor.location_dict(),
                }
            )

        events.append(event)
    return events
