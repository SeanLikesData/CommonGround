import asyncio
import logging
import os

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler

import alerts
import graph
from cycle import run_once
from server import app

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL_SEC = int(os.environ.get("AGENT_INTERVAL_SEC", "15"))
RECENT_WINDOW_SEC = int(os.environ.get("AGENT_RECENT_WINDOW_SEC", "900"))  # 15 min
BASELINE_WINDOW_SEC = int(os.environ.get("AGENT_BASELINE_WINDOW_SEC", "86400"))  # 24 h
HTTP_PORT = int(os.environ.get("AGENT_HTTP_PORT", "8001"))


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
        "agent started (interval=%ds, recent=%ds, baseline=%ds, http=:%d)",
        INTERVAL_SEC,
        RECENT_WINDOW_SEC,
        BASELINE_WINDOW_SEC,
        HTTP_PORT,
    )

    asyncio.create_task(_job())

    config = uvicorn.Config(app, host="0.0.0.0", port=HTTP_PORT, log_level="info")
    server = uvicorn.Server(config)
    try:
        await server.serve()
    finally:
        log.info("shutting down")
        scheduler.shutdown(wait=False)
        graph.close()
        alerts.close()


if __name__ == "__main__":
    asyncio.run(main())
