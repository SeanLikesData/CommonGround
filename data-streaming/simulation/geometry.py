import math

EARTH_M_PER_DEG = 111320.0


def latlon_to_meters(
    point: tuple[float, float], origin: tuple[float, float]
) -> tuple[float, float]:
    """Convert (lat, lon) to local (x, y) meters relative to origin."""
    lat, lon = point
    olat, olon = origin
    dx = (lon - olon) * math.cos(math.radians(olat)) * EARTH_M_PER_DEG
    dy = (lat - olat) * EARTH_M_PER_DEG
    return dx, dy


def meters_to_latlon(
    xy: tuple[float, float], origin: tuple[float, float]
) -> tuple[float, float]:
    """Inverse of latlon_to_meters."""
    x, y = xy
    olat, olon = origin
    lat = olat + y / EARTH_M_PER_DEG
    lon = olon + x / (math.cos(math.radians(olat)) * EARTH_M_PER_DEG)
    return lat, lon


def distance_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Distance in meters between two (lat, lon) points using local projection."""
    dx, dy = latlon_to_meters(a, b)
    return math.sqrt(dx * dx + dy * dy)


def bearing_deg(
    from_pt: tuple[float, float], to_pt: tuple[float, float]
) -> float:
    """Compass bearing 0-360 from from_pt to to_pt."""
    dx, dy = latlon_to_meters(to_pt, from_pt)
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360
