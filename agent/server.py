import json
import logging
import os
import re
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_ai import Agent

from agent import MODEL
from graph import driver, serialize
from memory import append_memory, read_memories

log = logging.getLogger(__name__)

API_URL = os.environ.get("API_URL", "http://api:8000")
ALLOWED_ORIGINS = os.environ.get(
    "AGENT_ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")
TOOL_OUTPUT_LIMIT = int(os.environ.get("AGENT_TOOL_OUTPUT_LIMIT", "8000"))

WRITE_PATTERN = re.compile(
    r"\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP|DETACH)\b",
    re.IGNORECASE,
)

QA_SYSTEM_PROMPT = """You are an intelligence analyst's Q&A assistant for a battlespace map.
You answer questions about live SPOT-report data using your tools.

Knowledge graph (Neo4j) schema:
- Nodes: Modality{{name}}, Region{{geohash, lat, lon}}, Location{{geohash, lat, lon}},
  Signal{{id, modality, timestamp}}, Sensor{{id, modality, last_seen_at}},
  Report{{id, source_signal_id, modality, created_at, narrative}}
- Edges: (Location)-[:WITHIN]->(Region), (Signal)-[:USES]->(Modality),
  (Signal)-[:OBSERVED_AT]->(Location), (Sensor)-[:EMITTED]->(Signal),
  (Sensor)-[:HAS_MODALITY]->(Modality), (Report)-[:DERIVED_FROM]->(Signal),
  (Report)-[:OBSERVED_AT]->(Location)

Tools:
- cypher_query(query): read-only Cypher; writes are rejected.
- mongo_read(collection, since_iso, limit): read /signals or /reports via the
  read API. since_iso is ISO8601 (e.g. "2026-05-03T00:00:00Z"). limit max 100.
- remember(text): append a durable memory if the analyst gave guidance worth
  carrying forward. Use sparingly.

Be concise. Cite specific entities (region geohashes, sensor IDs, modalities,
timestamps). If you don't know, say so. Don't invent data.

Prior memories (durable across cycles):
<memories>
{memories}
</memories>
"""


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


def _truncate(text: str) -> str:
    if len(text) <= TOOL_OUTPUT_LIMIT:
        return text
    return text[:TOOL_OUTPUT_LIMIT] + f"\n... [truncated, {len(text)} chars total]"


def build_qa_agent() -> Agent:
    qa: Agent = Agent(MODEL)

    @qa.system_prompt
    def _prompt() -> str:
        memories = read_memories().strip() or "(empty)"
        return QA_SYSTEM_PROMPT.format(memories=memories)

    @qa.tool_plain
    def cypher_query(query: str) -> str:
        """Run a read-only Cypher query against Neo4j and return rows as JSON.

        Writes (CREATE/MERGE/DELETE/SET/REMOVE/DROP/DETACH) are rejected.
        Returns up to 50 rows.
        """
        if WRITE_PATTERN.search(query):
            return "ERROR: write operations are not permitted; use read-only Cypher."
        try:
            with driver().session() as session:
                rows = session.run(query).data()
                return _truncate(
                    json.dumps([serialize(r) for r in rows[:50]], default=str)
                )
        except Exception as e:
            return f"ERROR: {e}"

    @qa.tool_plain
    async def mongo_read(
        collection: str, since_iso: Optional[str] = None, limit: int = 50
    ) -> str:
        """Read /signals or /reports from the read API.

        collection must be 'signals' or 'reports'. since_iso is ISO8601.
        limit capped at 100.
        """
        if collection not in ("signals", "reports"):
            return "ERROR: collection must be 'signals' or 'reports'."
        params: dict[str, Any] = {"limit": min(limit, 100)}
        if since_iso:
            params["since"] = since_iso
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(f"{API_URL}/{collection}", params=params)
                r.raise_for_status()
                return _truncate(r.text)
        except Exception as e:
            return f"ERROR: {e}"

    @qa.tool_plain
    def remember(text: str) -> str:
        """Append a durable memory to recall in future cycles."""
        return append_memory(text)

    return qa


_qa_agent: Optional[Agent] = None


def get_qa_agent() -> Agent:
    global _qa_agent
    if _qa_agent is None:
        _qa_agent = build_qa_agent()
    return _qa_agent


app = FastAPI(title="CommonGround Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    log.info("ask: %s", req.question)
    result = await get_qa_agent().run(req.question)
    return AskResponse(answer=result.output)


GRAPH_QUERY = """
MATCH (n)-[r]->(m)
RETURN n, r, m, elementId(n) AS n_id, elementId(m) AS m_id,
       labels(n) AS n_labels, labels(m) AS m_labels, type(r) AS r_type
LIMIT $limit
"""


@app.get("/graph")
def graph(limit: int = Query(300, ge=1, le=1000)) -> dict:
    nodes: dict[str, dict] = {}
    links: list[dict] = []
    try:
        with driver().session() as session:
            for row in session.run(GRAPH_QUERY, {"limit": limit}):
                for side in ("n", "m"):
                    nid = row[f"{side}_id"]
                    if nid in nodes:
                        continue
                    labels = row[f"{side}_labels"]
                    nodes[nid] = {
                        "id": nid,
                        "label": labels[0] if labels else "Node",
                        "props": serialize(dict(row[side])),
                    }
                links.append(
                    {
                        "source": row["n_id"],
                        "target": row["m_id"],
                        "type": row["r_type"],
                    }
                )
    except Exception as e:
        log.error("graph: query failed: %s", e)
        return {"nodes": [], "links": [], "error": str(e)}
    return {"nodes": list(nodes.values()), "links": links}
