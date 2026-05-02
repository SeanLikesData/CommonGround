import os
from neo4j import GraphDatabase

URI = os.environ["NEO4J_URI"]
USER = os.environ["NEO4J_USER"]
PASSWORD = os.environ["NEO4J_PASSWORD"]


def run_heuristics() -> dict:
    # TODO: implement graph heuristics (orphan nodes, hubs, etc.)
    return {}
