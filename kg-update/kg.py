import os
from neo4j import GraphDatabase

URI = os.environ["NEO4J_URI"]
USER = os.environ["NEO4J_USER"]
PASSWORD = os.environ["NEO4J_PASSWORD"]


def apply_report(report: dict):
    # TODO: define node/relationship schema and implement Cypher writes
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        pass  # e.g. MERGE nodes for modality, location, sensor, link to Report node
    driver.close()
