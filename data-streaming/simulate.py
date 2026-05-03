"""
simulate.py — thin shim kept for backward compatibility.

main.py imports rf_signal(), drone_video(), ugs_reading() for background noise
when no scenario is active.  These now delegate to simple random generators
shaped like the canonical event dicts used by the simulation engine.

For scenario-driven simulation, use:
    from simulation.engine import SimulationEngine
    from simulation.loader import load_scenario
"""
import random
from datetime import datetime, timezone


def rf_signal() -> dict:
    """Random RF background-noise event."""
    rng = random.Random()
    return {
        "modality": "rf",
        "sensor_id": "RF-BG",
        "frequency_mhz": round(rng.choice([45.5, 67.2, 155.0, 450.0]), 2),
        "signal_strength_dbm": round(rng.uniform(-110, -70), 1),
        "bandwidth_khz": 25.0,
        "bearing_deg": round(rng.uniform(0, 360), 1),
        "location": {
            "lat": round(34.05 + rng.gauss(0, 0.005), 6),
            "lon": round(-118.25 + rng.gauss(0, 0.005), 6),
        },
        "timestamp": datetime.now(timezone.utc),
        "processed": False,
    }


def drone_video() -> dict:
    """Random drone-video background-noise event."""
    rng = random.Random()
    lat = round(34.05 + rng.gauss(0, 0.005), 6)
    lon = round(-118.25 + rng.gauss(0, 0.005), 6)
    return {
        "modality": "drone_video",
        "sensor_id": "DRONE-BG",
        "altitude_m": round(rng.uniform(80, 150), 1),
        "heading_deg": round(rng.uniform(0, 360), 1),
        "speed_ms": round(rng.uniform(10, 20), 1),
        "detection_confidence": round(rng.uniform(0.0, 0.3), 3),
        "coordinates": {"lat": lat, "lon": lon},
        "detected_object_location": {"lat": lat, "lon": lon},
        "location": {"lat": lat, "lon": lon},
        "timestamp": datetime.now(timezone.utc),
        "processed": False,
    }


def ugs_reading() -> dict:
    """Random UGS background-noise event."""
    rng = random.Random()
    return {
        "modality": "ugs",
        "sensor_id": "UGS-BG",
        "detection_type": rng.choice(["seismic", "acoustic"]),
        "confidence": round(rng.uniform(0.05, 0.35), 3),
        "magnitude": round(rng.uniform(0.1, 1.5), 2),
        "location": {
            "lat": round(34.05 + rng.gauss(0, 0.005), 6),
            "lon": round(-118.25 + rng.gauss(0, 0.005), 6),
        },
        "timestamp": datetime.now(timezone.utc),
        "processed": False,
    }
