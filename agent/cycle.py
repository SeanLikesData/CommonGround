import json
import logging
from typing import Optional

from pydantic_ai import Agent

from agent import build_agent
from alerts import derive_alerts, persist_alerts
from graph import run_heuristics

log = logging.getLogger(__name__)

_last_heuristics: Optional[dict] = None
_agent: Optional[Agent] = None


def _get_agent() -> Agent:
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent


async def run_once(recent_window_sec: int, baseline_window_sec: int) -> None:
    global _last_heuristics
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

    if data == _last_heuristics:
        log.info("heuristics unchanged from last cycle; skipping LLM call")
        persist_alerts(derived, reasoning=None)
        return
    _last_heuristics = data

    user_msg = (
        "Latest battlespace heuristics:\n\n```json\n"
        + json.dumps(nonempty, indent=2, default=str)
        + "\n```\n\nWrite the sitrep."
    )

    result = await _get_agent().run(user_msg)
    log.info("sitrep:\n%s", result.output)
    persist_alerts(derived, reasoning=result.output)
