from typing import Optional

import pygeohash

LOCATION_PRECISION = 7  # ~150m cells
REGION_PRECISION = 5    # ~5km cells


def normalize_location(signal: dict) -> Optional[dict]:
    """Return {lat, lon} from a signal regardless of which field name it uses.

    rf and ugs use `location`; drone_video uses `coordinates`.
    """
    raw = signal.get("location") or signal.get("coordinates")
    if not raw:
        return None
    lat = raw.get("lat")
    lon = raw.get("lon")
    if lat is None or lon is None:
        return None
    return {"lat": float(lat), "lon": float(lon)}


def geohashes(lat: float, lon: float) -> tuple[str, str]:
    """Return (location_geohash, region_geohash) at the configured precisions."""
    location = pygeohash.encode(lat, lon, precision=LOCATION_PRECISION)
    region = pygeohash.encode(lat, lon, precision=REGION_PRECISION)
    return location, region
