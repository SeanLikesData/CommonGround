"""
scenarios/registry.py

Bridges the new SimulationEngine with main.py's legacy step-based interface.
Scenarios are pre-generated at import time so run_scenario_step() can iterate
through events without changing main.py's architecture.
"""
import logging
import pathlib

log = logging.getLogger(__name__)

_YAML_DIR = pathlib.Path(__file__).parent.parent / "simulation" / "scenarios"


def _build_registry() -> dict:
    try:
        from simulation.engine import SimulationEngine
        from simulation.loader import load_scenario
    except ImportError as exc:
        log.warning("simulation package not available: %s", exc)
        return {}

    registry: dict = {}
    for yaml_path in sorted(_YAML_DIR.glob("*.yaml")):
        name = yaml_path.stem
        try:
            scenario = load_scenario(str(yaml_path))
            engine = SimulationEngine(scenario)
            raw_events = engine.run_sync_collect()

            # Convert to legacy format: list of {delay_seconds, signal}
            formatted = [
                {
                    "delay_seconds": e.get("sim_time_s", 0.0),
                    "signal": {k: v for k, v in e.items() if not k.startswith("_")},
                }
                for e in raw_events
            ]
            registry[name] = {"events": formatted}
            log.debug("Loaded scenario '%s' (%d events)", name, len(formatted))
        except Exception as exc:
            log.warning("Failed to load scenario '%s': %s", name, exc)

    return registry


SCENARIOS = _build_registry()
