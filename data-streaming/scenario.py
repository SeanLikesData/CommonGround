from dataclasses import dataclass

# scenario.py - the world
@dataclass
class AO:
    center: tuple[float, float]  # lat, lon — pick somewhere real, like (34.0, -118.0)
    bbox_km: float = 10.0
    
    # Named features for narrative
    road_waypoints: list[tuple[float, float]]
    base_perimeter: list[tuple[float, float]]\

@dataclass
class Sensor:
    sensor_id: str
    modality: str  # "rf", "ugs", "drone_video"
    location: tuple[float, float]
    detection_radius_m: float
    false_positive_rate: float  # per tick

@dataclass
class Entity:
    entity_id: str
    entity_type: str  # "convoy", "foot_patrol", "civilian_vehicle"
    waypoints: list[tuple[float, float, float]]  # lat, lon, t_seconds
    rf_signature: dict | None  # frequencies it emits
    seismic_signature: float  # how loud it is to UGS