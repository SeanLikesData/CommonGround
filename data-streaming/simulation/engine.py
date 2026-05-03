import asyncio
import random
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Optional

from .detection import detect_drone_video, detect_rf, detect_ugs
from .models import Scenario, Sensor
from .motion import interpolate_drone_position, interpolate_position
from .noise import generate_false_positives


class SimulationEngine:
    def __init__(
        self,
        scenario: Scenario,
        time_scale: float = 1.0,
        start_wallclock: Optional[datetime] = None,
    ):
        self.scenario = scenario
        self.time_scale = time_scale
        self.rng = random.Random(scenario.seed)
        self.start_wallclock = start_wallclock or datetime.now(timezone.utc)
        self.sim_time_s = 0.0

    def _dispatch_detection(
        self,
        sensor: Sensor,
        entity,
        pos: tuple[float, float],
        drone_positions: dict,
        t: float,
    ) -> Optional[dict]:
        if sensor.modality == "ugs":
            return detect_ugs(sensor, entity, pos, t, self.rng)
        if sensor.modality == "rf":
            return detect_rf(sensor, entity, pos, t, self.rng)
        if sensor.modality == "drone_video":
            drone_pos = drone_positions.get(sensor.id) or sensor.location
            return detect_drone_video(sensor, entity, pos, drone_pos, t, self.rng)
        return None

    def tick(self, dt: float) -> list[dict]:
        """Advance simulation by dt seconds and return all events generated."""
        events: list[dict] = []
        self.sim_time_s += dt

        drone_positions = {
            s.id: interpolate_drone_position(s, self.sim_time_s, self.rng)
            for s in self.scenario.sensors
            if s.modality == "drone_video"
        }

        for entity in self.scenario.entities:
            pos = interpolate_position(entity, self.sim_time_s, self.rng)
            if pos is None:
                continue
            for sensor in self.scenario.sensors:
                event = self._dispatch_detection(
                    sensor, entity, pos, drone_positions, self.sim_time_s
                )
                if event:
                    events.append(event)

        events.extend(
            generate_false_positives(self.scenario, self.sim_time_s, dt, self.rng)
        )

        # Stamp wallclock timestamps at the engine boundary
        for e in events:
            e["timestamp"] = self.start_wallclock + timedelta(seconds=e["sim_time_s"])

        return events

    async def run(
        self,
        on_event: Callable[[dict], Awaitable[None]],
        tick_hz: float = 10.0,
    ) -> None:
        """Run the simulation in (near-)realtime, calling on_event for each event."""
        dt = 1.0 / tick_hz
        while self.sim_time_s < self.scenario.duration_seconds:
            events = self.tick(dt * self.time_scale)
            for e in events:
                await on_event(e)
            await asyncio.sleep(dt)

    def run_sync_collect(self) -> list[dict]:
        """Run the entire scenario as fast as possible; return all events. For testing."""
        self.sim_time_s = 0.0
        self.rng = random.Random(self.scenario.seed)
        all_events: list[dict] = []
        dt = 0.1  # 10 Hz
        while self.sim_time_s < self.scenario.duration_seconds:
            all_events.extend(self.tick(dt))
        return all_events
