import os

import yaml

from .models import Scenario


def load_scenario(path: str) -> Scenario:
    with open(path) as f:
        data = yaml.safe_load(f)
    return Scenario(**data)


def list_scenarios(directory: str = "simulation/scenarios") -> list[str]:
    """Return sorted list of scenario names (filenames without extension)."""
    names = []
    for fname in os.listdir(directory):
        if fname.endswith(".yaml") or fname.endswith(".yml"):
            names.append(os.path.splitext(fname)[0])
    return sorted(names)


if __name__ == "__main__":
    import sys

    s = load_scenario(sys.argv[1])
    print(
        f"Loaded {s.name}: {len(s.entities)} entities, "
        f"{len(s.sensors)} sensors, {s.duration_seconds}s"
    )
