import random
from datetime import datetime, timezone

def simulate(t: float, scenario: Scenario) -> list[dict]:
    events = []
    for entity in scenario.entities:
        pos = interpolate_position(entity, t)
        if pos is None:  # entity not active yet or done
            continue
        for sensor in scenario.sensors:
            if distance(pos, sensor.location) <= sensor.detection_radius_m:
                events.append(generate_detection(sensor, entity, pos, t))
    # Add background noise
    events.extend(generate_false_positives(scenario, t))
    return events
