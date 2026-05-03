import math
import random
from typing import Optional

from .geometry import bearing_deg, distance_m
from .models import Entity, Sensor

_RSSI_FLOOR_DBM = -120.0


def detect_ugs(
    sensor: Sensor,
    entity: Entity,
    entity_pos: tuple[float, float],
    t: float,
    rng: random.Random,
) -> Optional[dict]:
    d = distance_m(sensor.location, entity_pos)
    if d > sensor.detection_radius_m:
        return None

    det_type = sensor.detection_type
    if det_type == "seismic":
        sig = entity.seismic_signature
    elif det_type == "acoustic":
        sig = entity.acoustic_signature
    else:  # magnetic
        sig = entity.seismic_signature * 0.5

    if sig <= 0.1:
        return None

    falloff = max(0.0, 1.0 - (d / sensor.detection_radius_m))
    magnitude = sig * falloff + rng.gauss(0, 0.3)
    confidence = min(1.0, max(0.0, falloff + rng.gauss(0, 0.1)))

    return {
        "modality": "ugs",
        "sensor_id": sensor.id,
        "detection_type": det_type,
        "confidence": round(confidence, 3),
        "magnitude": round(max(0.0, magnitude), 2),
        "location": sensor.location_dict(),
        "sim_time_s": t,
        "_truth_entity_id": entity.id,
        "processed": False,
    }


def detect_rf(
    sensor: Sensor,
    entity: Entity,
    entity_pos: tuple[float, float],
    t: float,
    rng: random.Random,
) -> Optional[dict]:
    if entity.rf_signature is None:
        return None

    rf = entity.rf_signature
    # Only fires during a 1-second burst window every burst_interval_s
    phase = t % rf.burst_interval_s
    if phase > 1.0:
        return None

    d = distance_m(sensor.location, entity_pos)
    if d > sensor.detection_radius_m:
        return None

    # Log-distance path loss model
    rssi = rf.tx_power_dbm - 20.0 * math.log10(max(d, 1.0)) - 30.0
    if rssi < _RSSI_FLOOR_DBM:
        return None

    freq = rng.choice(rf.bands_mhz)
    bear = bearing_deg(sensor.location, entity_pos)
    bear_noisy = (bear + rng.gauss(0, 10.0)) % 360.0

    return {
        "modality": "rf",
        "sensor_id": sensor.id,
        "frequency_mhz": round(freq, 2),
        "signal_strength_dbm": round(rssi + rng.gauss(0, 2.0), 1),
        "bandwidth_khz": rf.bandwidth_khz,
        "bearing_deg": round(bear_noisy, 1),
        "location": sensor.location_dict(),
        "sim_time_s": t,
        "_truth_entity_id": entity.id,
        "processed": False,
    }


def detect_drone_video(
    sensor: Sensor,
    entity: Entity,
    entity_pos: tuple[float, float],
    drone_pos: tuple[float, float],
    t: float,
    rng: random.Random,
) -> Optional[dict]:
    fov_r = sensor.fov_radius_m if sensor.fov_radius_m is not None else sensor.detection_radius_m
    d = distance_m(drone_pos, entity_pos)
    if d > fov_r:
        return None

    sig = entity.visual_signature
    if sig <= 0.0:
        return None

    falloff = max(0.0, 1.0 - (d / fov_r))
    confidence = min(1.0, max(0.0, (sig / 10.0) * falloff + rng.gauss(0, 0.05)))

    _20m_deg = 20.0 / 111320.0
    detected_lat = entity_pos[0] + rng.gauss(0, _20m_deg)
    detected_lon = entity_pos[1] + rng.gauss(0, _20m_deg)

    return {
        "modality": "drone_video",
        "sensor_id": sensor.id,
        "altitude_m": sensor.altitude_m if sensor.altitude_m is not None else 100.0,
        "heading_deg": round(rng.uniform(0, 360), 1),
        "speed_ms": round(rng.uniform(10, 20), 1),
        "detection_confidence": round(confidence, 3),
        "coordinates": {"lat": round(drone_pos[0], 6), "lon": round(drone_pos[1], 6)},
        "detected_object_location": {
            "lat": round(detected_lat, 6),
            "lon": round(detected_lon, 6),
        },
        "location": {"lat": round(drone_pos[0], 6), "lon": round(drone_pos[1], 6)},
        "sim_time_s": t,
        "_truth_entity_id": entity.id,
        "processed": False,
    }
