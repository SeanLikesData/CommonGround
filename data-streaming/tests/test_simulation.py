"""
Test suite for the simulation engine.

Run from data-streaming/:
    pytest tests/test_simulation.py -v
"""
import pathlib
import random

import pytest

from simulation.engine import SimulationEngine
from simulation.geometry import distance_m, latlon_to_meters, meters_to_latlon
from simulation.loader import load_scenario
from simulation.models import AO, Entity, RFSignature, Scenario, Sensor
from simulation.detection import detect_ugs

_SCENARIOS_DIR = pathlib.Path(__file__).parent.parent / "simulation" / "scenarios"


# ── helpers ──────────────────────────────────────────────────────────────────

def _convoy_scenario() -> Scenario:
    return load_scenario(str(_SCENARIOS_DIR / "convoy_patrol.yaml"))


def _make_simple_scenario(
    sensors: list[Sensor],
    entities: list[Entity],
    duration: float = 600.0,
    seed: int = 42,
) -> Scenario:
    return Scenario(
        name="test",
        duration_seconds=duration,
        seed=seed,
        ao=AO(name="TEST", center=(34.05, -118.25)),
        sensors=sensors,
        entities=entities,
    )


# ── test 1: determinism ───────────────────────────────────────────────────────

def test_determinism():
    """Same seed → identical event stream on two independent runs."""
    scenario = _convoy_scenario()

    engine1 = SimulationEngine(scenario)
    events1 = engine1.run_sync_collect()

    engine2 = SimulationEngine(scenario)
    events2 = engine2.run_sync_collect()

    assert len(events1) == len(events2), "Event counts differ between runs"
    for i, (e1, e2) in enumerate(zip(events1, events2)):
        # Compare all non-timestamp fields (timestamp includes wallclock start)
        e1c = {k: v for k, v in e1.items() if k != "timestamp"}
        e2c = {k: v for k, v in e2.items() if k != "timestamp"}
        assert e1c == e2c, f"Event {i} differs: {e1c} vs {e2c}"


# ── test 2: sequential UGS detections ────────────────────────────────────────

def test_convoy_sequential_ugs():
    """
    UGS-001, -002, -003 each fire ≥3 times over 600 s, and within the first
    northbound leg (t=0..120) UGS-001 fires before UGS-002 before UGS-003.
    """
    scenario = _convoy_scenario()
    engine = SimulationEngine(scenario)
    events = engine.run_sync_collect()

    ugs_events = [e for e in events if e["modality"] == "ugs" and e.get("_truth_entity_id") == "CONVOY-1"]

    by_sensor: dict[str, list[float]] = {"UGS-001": [], "UGS-002": [], "UGS-003": []}
    for e in ugs_events:
        sid = e["sensor_id"]
        if sid in by_sensor:
            by_sensor[sid].append(e["sim_time_s"])

    # Each sensor must fire at least 3 times
    for sid, times in by_sensor.items():
        assert len(times) >= 3, f"{sid} fired only {len(times)} times"

    # Within the first northbound leg (t in 0..120), order must be 001 < 002 < 003
    first_in_leg = {}
    for sid, times in by_sensor.items():
        leg_times = [t for t in times if 0 < t <= 120]
        if leg_times:
            first_in_leg[sid] = min(leg_times)

    assert set(first_in_leg.keys()) == {"UGS-001", "UGS-002", "UGS-003"}, (
        f"Not all sensors fired in first leg: {first_in_leg}"
    )
    assert first_in_leg["UGS-001"] < first_in_leg["UGS-002"] < first_in_leg["UGS-003"], (
        f"Sensor order wrong in first leg: {first_in_leg}"
    )


# ── test 3: distance falloff ──────────────────────────────────────────────────

def test_distance_falloff():
    """
    Magnitude from a stationary entity decreases monotonically as distance
    from the UGS sensor increases.
    """
    sensor = Sensor(
        id="UGS-TEST",
        modality="ugs",
        detection_type="seismic",
        location=(34.050, -118.250),
        detection_radius_m=500,
    )

    # Entity with high seismic signature directly on the road, moved to various distances
    distances_m = [50, 150, 250, 350, 450]
    magnitudes = []
    rng = random.Random(0)

    for d in distances_m:
        # Place entity `d` meters north of sensor
        deg_offset = d / 111320.0
        entity_pos = (sensor.location[0] + deg_offset, sensor.location[1])

        entity = Entity(
            id="TEST-ENTITY",
            type="convoy",
            pattern="stationary",
            waypoints=[(entity_pos[0], entity_pos[1], 0)],
            seismic_signature=8.0,
        )

        # Average over many samples to smooth out noise
        samples = [
            detect_ugs(sensor, entity, entity_pos, 1.0, rng)
            for _ in range(200)
        ]
        valid = [s["magnitude"] for s in samples if s is not None]
        assert valid, f"No detections at distance {d} m"
        magnitudes.append(sum(valid) / len(valid))

    for i in range(len(magnitudes) - 1):
        assert magnitudes[i] > magnitudes[i + 1], (
            f"Magnitude not decreasing: {magnitudes[i]:.3f} at {distances_m[i]} m "
            f"vs {magnitudes[i+1]:.3f} at {distances_m[i+1]} m"
        )


# ── test 4: false positive rate ───────────────────────────────────────────────

def test_false_positives_within_rate():
    """
    With FP rate 6.0/min and no real entities, FP count over 10 min
    must fall within ±50% of the expected 60.
    """
    sensor = Sensor(
        id="UGS-NOISY",
        modality="ugs",
        detection_type="seismic",
        location=(34.050, -118.250),
        detection_radius_m=200,
        false_positive_rate_per_min=6.0,
    )
    scenario = _make_simple_scenario(
        sensors=[sensor],
        entities=[],
        duration=600.0,  # 10 minutes
        seed=1234,
    )
    engine = SimulationEngine(scenario)
    events = engine.run_sync_collect()

    fp_events = [e for e in events if e.get("_truth_entity_id") == "FALSE_POSITIVE"]
    expected = 60
    assert expected * 0.5 <= len(fp_events) <= expected * 1.5, (
        f"FP count {len(fp_events)} outside ±50% of expected {expected}"
    )


# ── test 5: schema backward compatibility ────────────────────────────────────

def test_schema_backward_compat():
    """
    All event dicts must contain the keys from the original simulate.py schema.
    """
    required_keys = {
        "rf": {"modality", "frequency_mhz", "signal_strength_dbm", "bandwidth_khz", "location", "timestamp", "processed"},
        "ugs": {"modality", "sensor_id", "detection_type", "confidence", "magnitude", "location", "timestamp", "processed"},
        "drone_video": {"modality", "altitude_m", "heading_deg", "speed_ms", "detection_confidence", "coordinates", "timestamp", "processed"},
    }

    scenario = _convoy_scenario()
    engine = SimulationEngine(scenario)
    events = engine.run_sync_collect()

    # Filter out false-positive events (which may have minimal keys) and check real detections
    real_events = [e for e in events if e.get("_truth_entity_id") not in (None, "FALSE_POSITIVE")]

    seen_modalities = set()
    for e in real_events:
        mod = e["modality"]
        seen_modalities.add(mod)
        if mod in required_keys:
            missing = required_keys[mod] - e.keys()
            assert not missing, f"Event missing keys for {mod}: {missing}\n  Event: {e}"

    # Convoy scenario should produce ugs and rf events
    assert "ugs" in seen_modalities, "No UGS events produced"
    assert "rf" in seen_modalities, "No RF events produced"


# ── test 6: geometry roundtrip ────────────────────────────────────────────────

def test_geometry_roundtrip():
    """
    meters_to_latlon(latlon_to_meters(p, origin), origin) ≈ p within 1 cm.
    """
    origin = (34.05, -118.25)
    test_points = [
        (34.055, -118.248),
        (34.040, -118.260),
        (34.065, -118.232),
        (34.050, -118.250),  # same as origin
    ]
    _1cm_deg = 0.01 / 111320.0  # 1 cm in degrees

    for p in test_points:
        xy = latlon_to_meters(p, origin)
        p_back = meters_to_latlon(xy, origin)
        assert abs(p_back[0] - p[0]) < _1cm_deg, (
            f"Lat roundtrip error for {p}: {abs(p_back[0] - p[0]):.2e} deg"
        )
        assert abs(p_back[1] - p[1]) < _1cm_deg, (
            f"Lon roundtrip error for {p}: {abs(p_back[1] - p[1]):.2e} deg"
        )
