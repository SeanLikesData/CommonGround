import logging
from typing import Optional

from graphiti_core import Graphiti
from neo4j import AsyncDriver

log = logging.getLogger(__name__)

CONSTRAINTS_AND_INDEXES = [
    "CREATE CONSTRAINT sensor_id IF NOT EXISTS FOR (s:Sensor) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT signal_id IF NOT EXISTS FOR (s:Signal) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT report_id IF NOT EXISTS FOR (r:Report) REQUIRE r.id IS UNIQUE",
    "CREATE CONSTRAINT location_geohash IF NOT EXISTS FOR (l:Location) REQUIRE l.geohash IS UNIQUE",
    "CREATE CONSTRAINT region_geohash IF NOT EXISTS FOR (r:Region) REQUIRE r.geohash IS UNIQUE",
    "CREATE CONSTRAINT modality_name IF NOT EXISTS FOR (m:Modality) REQUIRE m.name IS UNIQUE",
    "CREATE INDEX report_created_at IF NOT EXISTS FOR (r:Report) ON (r.created_at)",
    "CREATE POINT INDEX location_point IF NOT EXISTS FOR (l:Location) ON (l.point)",
]


async def setup(driver: AsyncDriver, graphiti: Optional[Graphiti]) -> None:
    log.info("setting up neo4j constraints and indexes")
    async with driver.session() as session:
        for stmt in CONSTRAINTS_AND_INDEXES:
            await session.run(stmt)
    if graphiti is not None:
        log.info("setting up graphiti indices")
        await graphiti.build_indices_and_constraints()
    log.info("schema setup complete")
