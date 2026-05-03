import asyncio
import contextvars
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
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
    saved_memories: list[str] = []


_saved_memories: contextvars.ContextVar[Optional[list[str]]] = contextvars.ContextVar(
    "saved_memories", default=None
)


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
        line = append_memory(text)
        buf = _saved_memories.get()
        if buf is not None:
            buf.append(text.strip())
        return line

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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    log.info("ask: %s", req.question)
    buf: list[str] = []
    token = _saved_memories.set(buf)
    try:
        result = await get_qa_agent().run(req.question)
    finally:
        _saved_memories.reset(token)
    return AskResponse(answer=result.output, saved_memories=buf)


SITREP_SYSTEM_PROMPT = """You are an intelligence analyst writing a SITREP (situation report) for a battlespace operations cell.

Output a structured SITREP in markdown with EXACTLY these sections, in this order:

## SITREP — As of {as_of}
**BLUF:** one-sentence bottom-line-up-front (under 25 words).

### 1. Enemy Situation
2-5 bullets covering current enemy activity, drawn from the alerts and SPOT reports below. Cite alert IDs or geohashes inline as `[geohash]`. Note multi-modal corroboration where present.

### 2. Friendly Situation
1-3 bullets on sensor coverage / collection posture. Sensor silence does NOT mean degraded coverage — these sensors are event-driven. Only flag a coverage gap if the data clearly shows one.

### 3. Logistics & Sustainment
One bullet, or "No change." This system has no logistics feed; only mention if explicitly in the inputs.

### 4. Commander's Assessment
2-4 bullets. What pattern is forming? What is the most likely enemy course of action over the next reporting period? Reference durable analyst memories where they apply.

### 5. Recommendations
2-4 numbered actions for the operator. Each should be specific (e.g. "Reposition drone orbit to cover [geohash]") and tied to evidence above.

WRITING STYLE:
- Plain language. No jargon beyond SALUTE, SPOT, SITREP, RF, UGS.
- Refer to locations by 3-decimal lat/lon or short descriptor; geohash only as a tag in brackets.
- Quantify ("4 reports in 12 min") rather than vague ("recent activity").
- Hard cap: 350 words total across all sections.
- No preamble, no closing remarks. Just the SITREP.
"""


SITREP_USER_TEMPLATE = """Reporting window: last {window_minutes} minutes (since {since_iso}).

=== ALERTS (correlated, multi-modal) ===
{alerts_block}

=== SPOT REPORTS (raw observations, SALUTE format) ===
{reports_block}

=== DURABLE ANALYST MEMORIES ===
{memories_block}

Write the SITREP now."""


class SitrepRequest(BaseModel):
    window_minutes: int = Field(60, ge=5, le=1440)


class SitrepResponse(BaseModel):
    sitrep: str
    as_of: str
    window_minutes: int
    report_count: int
    alert_count: int


def _format_alert(a: dict) -> str:
    geohash = a.get("geohash", "?")
    sev = a.get("severity", "?")
    summary = a.get("summary", "").strip()
    modalities = ",".join(a.get("modalities") or [])
    n = a.get("report_count", 0)
    reasoning = (a.get("reasoning") or "").strip()
    line = f"- [{geohash}] sev={sev} mods={modalities} n={n}: {summary}"
    if reasoning:
        line += f"\n  reasoning: {reasoning}"
    return line


def _format_report(r: dict) -> str:
    sp = r.get("spot_report") or {}
    sig = r.get("signal") or {}
    loc = sig.get("location") or sig.get("coordinates") or {}
    lat = loc.get("lat")
    lon = loc.get("lon")
    coord = f"{lat:.3f},{lon:.3f}" if isinstance(lat, (int, float)) and isinstance(lon, (int, float)) else "?"
    parts = []
    if sp.get("size"): parts.append(f"S:{sp['size']}")
    if sp.get("activity"): parts.append(f"A:{sp['activity']}")
    if sp.get("unit"): parts.append(f"U:{sp['unit']}")
    if sp.get("equipment"): parts.append(f"E:{sp['equipment']}")
    salute = "; ".join(parts) or sp.get("narrative", "").strip()[:120]
    threat = sp.get("threat_level", "?")
    ts = sig.get("timestamp", "?")
    return f"- [{r.get('modality', '?')}] {ts} ({coord}) threat={threat} | {salute}"


@app.post("/sitrep", response_model=SitrepResponse)
async def sitrep(req: SitrepRequest) -> SitrepResponse:
    log.info("sitrep: window=%dm", req.window_minutes)
    now = datetime.now(timezone.utc)
    since = now - timedelta(minutes=req.window_minutes)
    since_iso = since.isoformat(timespec="seconds").replace("+00:00", "Z")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            reports_r, alerts_r = await asyncio.gather(
                client.get(f"{API_URL}/reports", params={"since": since_iso, "limit": 200}),
                client.get(f"{API_URL}/alerts", params={"since": since_iso, "limit": 100}),
            )
        reports_r.raise_for_status()
        alerts_r.raise_for_status()
    except Exception as e:
        log.exception("sitrep: failed to fetch upstream data")
        raise HTTPException(status_code=502, detail=f"upstream fetch failed: {e}")

    reports = reports_r.json()
    alerts = alerts_r.json()

    alerts_block = "\n".join(_format_alert(a) for a in alerts) or "(no alerts in window)"
    reports_block = "\n".join(_format_report(r) for r in reports[:50]) or "(no reports in window)"
    memories_block = read_memories().strip() or "(empty)"

    as_of = now.isoformat(timespec="seconds").replace("+00:00", "Z")
    system_prompt = SITREP_SYSTEM_PROMPT.format(as_of=as_of)
    user_prompt = SITREP_USER_TEMPLATE.format(
        window_minutes=req.window_minutes,
        since_iso=since_iso,
        alerts_block=alerts_block,
        reports_block=reports_block,
        memories_block=memories_block,
    )

    sitrep_agent: Agent = Agent(MODEL, system_prompt=system_prompt)
    result = await sitrep_agent.run(user_prompt)
    return SitrepResponse(
        sitrep=result.output,
        as_of=as_of,
        window_minutes=req.window_minutes,
        report_count=len(reports),
        alert_count=len(alerts),
    )


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


NODE_DETAIL_QUERY = """
MATCH (n) WHERE elementId(n) = $id
OPTIONAL MATCH (n)-[r_out]->(m_out)
WITH n, collect(DISTINCT {
    direction: 'out',
    type: type(r_out),
    id: elementId(m_out),
    label: head(labels(m_out)),
    props: properties(m_out)
}) AS outs
OPTIONAL MATCH (m_in)-[r_in]->(n)
WITH n, outs, collect(DISTINCT {
    direction: 'in',
    type: type(r_in),
    id: elementId(m_in),
    label: head(labels(m_in)),
    props: properties(m_in)
}) AS ins
RETURN n,
       elementId(n) AS n_id,
       labels(n) AS n_labels,
       [x IN outs WHERE x.id IS NOT NULL] AS outs,
       [x IN ins WHERE x.id IS NOT NULL] AS ins
"""


@app.get("/graph/node")
def graph_node(id: str = Query(...)) -> dict:
    try:
        with driver().session() as session:
            record = session.run(NODE_DETAIL_QUERY, {"id": id}).single()
    except Exception as e:
        log.error("graph_node: query failed: %s", e)
        return {"error": str(e)}
    if record is None:
        return {"error": "not found"}
    labels = record["n_labels"]
    neighbors = [
        {
            "direction": x["direction"],
            "type": x["type"],
            "node": {
                "id": x["id"],
                "label": x["label"] or "Node",
                "props": serialize(dict(x["props"])),
            },
        }
        for x in (list(record["outs"]) + list(record["ins"]))
    ]
    return {
        "node": {
            "id": record["n_id"],
            "label": labels[0] if labels else "Node",
            "props": serialize(dict(record["n"])),
        },
        "neighbors": neighbors,
    }
