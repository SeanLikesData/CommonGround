import random
from datetime import datetime, timezone


def rf_signal() -> dict:
    return {
        "modality": "rf",
        "frequency_mhz": round(random.uniform(30, 3000), 2),
        "signal_strength_dbm": round(random.uniform(-120, 0), 1),
        "bandwidth_khz": round(random.uniform(10, 500), 1),
        "location": {
            "lat": round(random.uniform(-90, 90), 6),
            "lon": round(random.uniform(-180, 180), 6),
        },
        "timestamp": datetime.now(timezone.utc),
        "processed": False,
    }


def drone_video() -> dict:
    return {
        "modality": "drone_video",
        "altitude_m": round(random.uniform(10, 400), 1),
        "heading_deg": round(random.uniform(0, 360), 1),
        "speed_ms": round(random.uniform(0, 30), 1),
        "detection_confidence": round(random.uniform(0, 1), 3),
        "coordinates": {
            "lat": round(random.uniform(-90, 90), 6),
            "lon": round(random.uniform(-180, 180), 6),
        },
        "timestamp": datetime.now(timezone.utc),
        "processed": False,
    }


def ugs_reading() -> dict:
    return {
        "modality": "ugs",
        "sensor_id": f"UGS-{random.randint(1, 20):03d}",
        "detection_type": random.choice(["seismic", "acoustic", "magnetic"]),
        "confidence": round(random.uniform(0, 1), 3),
        "magnitude": round(random.uniform(0, 10), 2),
        "location": {
            "lat": round(random.uniform(-90, 90), 6),
            "lon": round(random.uniform(-180, 180), 6),
        },
        "timestamp": datetime.now(timezone.utc),
        "processed": False,
    }
