import math
import random
from typing import Optional

from .geometry import EARTH_M_PER_DEG, meters_to_latlon
from .models import Entity, Sensor

_GPS_JITTER_DEG = 5.0 / EARTH_M_PER_DEG  # 5 m std in degrees
_RANDOM_WALK_SPEED_MS = 5.0               # typical step size m/s
_RANDOM_WALK_MAX_DRIFT_M = 4000.0         # bounding radius


def _jitter(pos: tuple[float, float], rng: random.Random) -> tuple[float, float]:
    return (
        pos[0] + rng.gauss(0, _GPS_JITTER_DEG),
        pos[1] + rng.gauss(0, _GPS_JITTER_DEG),
    )


def _lerp_waypoints(
    waypoints: list[tuple[float, float, float]], t: float
) -> tuple[float, float]:
    """Linear interpolation between (lat, lon, t_s) waypoints."""
    for i in range(len(waypoints) - 1):
        t0, t1 = waypoints[i][2], waypoints[i + 1][2]
        if t0 <= t <= t1:
            if t1 == t0:
                return (waypoints[i][0], waypoints[i][1])
            alpha = (t - t0) / (t1 - t0)
            lat = waypoints[i][0] + alpha * (waypoints[i + 1][0] - waypoints[i][0])
            lon = waypoints[i][1] + alpha * (waypoints[i + 1][1] - waypoints[i][1])
            return (lat, lon)
    last = waypoints[-1]
    return (last[0], last[1])


def _random_walk(
    entity_id: str, start: tuple[float, float], steps: int
) -> tuple[float, float]:
    """Deterministic random walk from start, accumulated over `steps` 1-second steps."""
    walk_rng = random.Random(hash(entity_id) & 0xFFFF_FFFF)
    x, y = 0.0, 0.0
    for _ in range(steps):
        angle = walk_rng.uniform(0, 2 * math.pi)
        dist = walk_rng.gauss(_RANDOM_WALK_SPEED_MS, 1.0)
        nx = x + dist * math.cos(angle)
        ny = y + dist * math.sin(angle)
        r = math.sqrt(nx * nx + ny * ny)
        if r > _RANDOM_WALK_MAX_DRIFT_M:
            nx, ny = x, y  # bounce: stay put this step
        x, y = nx, ny
    return meters_to_latlon((x, y), start)


def interpolate_position(
    entity: Entity, t: float, rng: random.Random
) -> Optional[tuple[float, float]]:
    """
    Returns the entity's (lat, lon) at simulation time t, or None if inactive.
    Adds ~5 m GPS jitter to all returned positions.
    """
    if t < entity.active_from_s:
        return None
    if entity.active_until_s is not None and t > entity.active_until_s:
        return None

    if entity.pattern == "stationary":
        wp = entity.waypoints[0]
        return _jitter((wp[0], wp[1]), rng)

    if entity.pattern == "one_shot":
        wps = entity.waypoints
        if t < wps[0][2] or t > wps[-1][2]:
            return None
        return _jitter(_lerp_waypoints(wps, t), rng)

    if entity.pattern == "patrol":
        if entity.period_seconds is None:
            return None
        t_mod = t % entity.period_seconds
        return _jitter(_lerp_waypoints(entity.waypoints, t_mod), rng)

    if entity.pattern == "random_walk":
        start = (entity.waypoints[0][0], entity.waypoints[0][1])
        pos = _random_walk(entity.id, start, int(t))
        return _jitter(pos, rng)

    return None


def interpolate_drone_position(
    sensor: Sensor, t: float, rng: random.Random
) -> Optional[tuple[float, float]]:
    """For drone sensors with patrol_waypoints. Returns drone's current (lat, lon)."""
    if not sensor.patrol_waypoints:
        return sensor.location

    wps = sensor.patrol_waypoints
    max_t = wps[-1][2]
    t_mod = (t % max_t) if max_t > 0 else 0.0
    pos = _lerp_waypoints(wps, t_mod)
    return _jitter(pos, rng)
