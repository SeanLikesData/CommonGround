import logging
import os
from typing import Optional

from graphiti_core import Graphiti
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.llm_client.anthropic_client import AnthropicClient
from graphiti_core.llm_client.config import LLMConfig
from neo4j import AsyncDriver, AsyncGraphDatabase

log = logging.getLogger(__name__)


def _neo4j_uri() -> str:
    return os.environ["NEO4J_URI"]


def _neo4j_auth() -> tuple[str, str]:
    return os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]


def make_driver() -> AsyncDriver:
    user, password = _neo4j_auth()
    return AsyncGraphDatabase.driver(_neo4j_uri(), auth=(user, password))


def make_graphiti() -> Optional[Graphiti]:
    """Return a configured Graphiti client, or None if API keys are missing.

    Skipping Graphiti lets the deterministic Cypher pass still run while we
    wait on report-gen narratives and/or API keys.
    """
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not (anthropic_key and openai_key):
        log.warning(
            "ANTHROPIC_API_KEY and/or OPENAI_API_KEY not set — narrative entity "
            "extraction disabled. Deterministic graph writes will still run."
        )
        return None

    user, password = _neo4j_auth()
    llm = AnthropicClient(
        LLMConfig(
            api_key=anthropic_key,
            model=os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
        )
    )
    embedder = OpenAIEmbedder(
        OpenAIEmbedderConfig(
            api_key=openai_key,
            embedding_model=os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        )
    )
    return Graphiti(
        _neo4j_uri(),
        user,
        password,
        llm_client=llm,
        embedder=embedder,
    )
