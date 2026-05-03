import asyncio
import logging
import os

from pymongo import MongoClient

import schema
from driver import make_driver, make_graphiti
from ingest import apply_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INTERVAL = 15
BATCH_SIZE = 50
MONGO_URI = os.environ["MONGODB_URI"]


async def process(reports_col, driver, graphiti) -> None:
    pending = list(reports_col.find({"kg_synced": False}).limit(BATCH_SIZE))
    if not pending:
        return

    success = 0
    for report in pending:
        update = {"kg_synced": True}
        try:
            await apply_report(driver, graphiti, report)
            success += 1
        except Exception as e:
            log.error("failed to apply report %s: %s", report["_id"], e)
            update["kg_error"] = str(e)
        reports_col.update_one({"_id": report["_id"]}, {"$set": update})

    log.info("processed %d report(s) (%d succeeded)", len(pending), success)


async def main() -> None:
    client = MongoClient(MONGO_URI)
    db = client["commonground"]
    driver = make_driver()
    graphiti = make_graphiti()

    await schema.setup(driver, graphiti)
    log.info("kg-update starting. Polling every %ds.", INTERVAL)

    try:
        while True:
            try:
                await process(db["reports"], driver, graphiti)
            except Exception as e:
                log.error("error syncing to KG: %s", e)
            await asyncio.sleep(INTERVAL)
    finally:
        try:
            await graphiti.close()
        except Exception as e:
            log.warning("error closing graphiti: %s", e)
        await driver.close()
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
