import logging
from datetime import timezone
from typing import Optional

from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType
from neo4j import AsyncDriver

from cypher import CYPHER_APPLY_REPORT, build_params

log = logging.getLogger(__name__)

NARRATIVE_KEYS = ("narrative", "salute_narrative", "salute")


def _extract_narrative(report: dict) -> Optional[str]:
    for key in NARRATIVE_KEYS:
        value = report.get(key)
        if value:
            return value
    signal = report.get("signal", {})
    for key in NARRATIVE_KEYS:
        value = signal.get(key)
        if value:
            return value
    return None


async def apply_report(driver: AsyncDriver, graphiti: Optional[Graphiti], report: dict) -> None:
    params = build_params(report)
    async with driver.session() as session:
        await session.run(CYPHER_APPLY_REPORT, params)

    if graphiti is None:
        return

    narrative = _extract_narrative(report)
    if not narrative:
        return

    timestamp = report["signal"]["timestamp"]
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    await graphiti.add_episode(
        name=f"report-{params['report_id']}",
        episode_body=narrative,
        source=EpisodeType.text,
        source_description=f"report:{params['report_id']}",
        reference_time=timestamp,
    )
    log.info("graphiti episode added for report %s", params["report_id"])
