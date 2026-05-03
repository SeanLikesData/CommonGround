import asyncio
import logging
import os
import signal

from apscheduler.schedulers.asyncio import AsyncIOScheduler

import graph
from cycle import run_once

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL_SEC = int(os.environ.get("AGENT_INTERVAL_SEC", "15"))
RECENT_WINDOW_SEC = int(os.environ.get("AGENT_RECENT_WINDOW_SEC", "900"))  # 15 min
BASELINE_WINDOW_SEC = int(os.environ.get("AGENT_BASELINE_WINDOW_SEC", "86400"))  # 24 h


async def _job() -> None:
    try:
        await run_once(RECENT_WINDOW_SEC, BASELINE_WINDOW_SEC)
    except Exception:
        log.exception("cycle failed")


async def main() -> None:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_job, "interval", seconds=INTERVAL_SEC)
    scheduler.start()
    log.info(
        "agent started (interval=%ds, recent=%ds, baseline=%ds)",
        INTERVAL_SEC,
        RECENT_WINDOW_SEC,
        BASELINE_WINDOW_SEC,
    )

    await _job()

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    await stop.wait()
    log.info("shutting down")
    scheduler.shutdown(wait=False)
    graph.close()


if __name__ == "__main__":
    asyncio.run(main())
