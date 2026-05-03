from pydantic import BaseModel, Field
from typing import Literal, Optional

LatLon = tuple[float, float]


class RFSignature(BaseModel):
    bands_mhz: list[float]
    burst_interval_s: float = 30.0
    bandwidth_khz: float = 25.0
    tx_power_dbm: float = 30.0


class Entity(BaseModel):
    id: str
    type: Literal["convoy", "foot_patrol", "civilian_vehicle", "lone_actor"]
    pattern: Literal["patrol", "one_shot", "random_walk", "stationary"]
    waypoints: list[tuple[float, float, float]]  # (lat, lon, t_seconds)
    period_seconds: Optional[float] = None       # required if pattern == "patrol"
    rf_signature: Optional[RFSignature] = None
    seismic_signature: float = 0.0
    acoustic_signature: float = 0.0
    visual_signature: float = 0.0
    active_from_s: float = 0.0
    active_until_s: Optional[float] = None


class Sensor(BaseModel):
    id: str
    modality: Literal["rf", "ugs", "drone_video"]
    location: LatLon
    detection_radius_m: float
    false_positive_rate_per_min: float = 0.0
    detection_type: Optional[Literal["seismic", "acoustic", "magnetic"]] = None
    patrol_waypoints: Optional[list[tuple[float, float, float]]] = None
    altitude_m: Optional[float] = None
    fov_radius_m: Optional[float] = None

    def location_dict(self) -> dict:
        return {"lat": self.location[0], "lon": self.location[1]}


class AO(BaseModel):
    name: str
    center: LatLon
    bbox_km: float = 10.0
    road_waypoints: list[LatLon] = Field(default_factory=list)
    base_perimeter: list[LatLon] = Field(default_factory=list)


class Scenario(BaseModel):
    name: str
    description: str = ""
    duration_seconds: float
    seed: int = 42
    ao: AO
    sensors: list[Sensor]
    entities: list[Entity]
