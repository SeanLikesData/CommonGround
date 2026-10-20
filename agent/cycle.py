import json
import logging
from typing import Optional

from agent import build_agent
from alerts import derive_alerts, persist_alerts
from graph import run_heuristics
from memory import memory_records

log = logging.getLogger(__name__)

_last_heuristics: Optional[dict] = None
_last_memories: Optional[list] = None


async def run_once(recent_window_sec: int, baseline_window_sec: int) -> None:
    global _last_heuristics, _last_memories
    log.info(
        "running heuristics (recent=%ds, baseline=%ds)",
        recent_window_sec,
        baseline_window_sec,
    )
    data = run_heuristics(recent_window_sec, baseline_window_sec)

    nonempty = {k: v for k, v in data.items() if v}

    derived = derive_alerts(data)

    if not nonempty:
        log.info("no heuristic findings; skipping LLM call")
        persist_alerts(derived, reasoning=None)
        return

    memories = memory_records()
    if data == _last_heuristics and memories == _last_memories:
        log.info("heuristics unchanged from last cycle; skipping LLM call")
        persist_alerts(derived, reasoning=None)
        return

    user_msg = (
        "Latest battlespace heuristics:\n\n```json\n"
        + json.dumps(nonempty, indent=2, default=str)
        + "\n```\n\nAssess these alert geohashes: "
        + json.dumps([a["geohash"] for a in derived])
    )

    result = await build_agent(memories).run(user_msg)
    log.info("sitrep:\n%s", result.output.sitrep)
    persist_alerts(derived, reasoning=None, assessments=result.output.alerts, memories=memories)
    _last_heuristics = data
    _last_memories = memories
