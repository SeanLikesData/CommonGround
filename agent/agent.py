import os

from pydantic_ai import Agent

from memory import append_memory, read_memories

MODEL = os.environ.get("AGENT_MODEL", "anthropic:claude-haiku-4-5")

SYSTEM_PROMPT_TEMPLATE = """You are an intelligence analyst monitoring a battlespace.

You receive periodic heuristic outputs derived from a knowledge graph of SPOT
reports (SALUTE-format intel: Size, Activity, Location, Unit, Time, Equipment).
Reports are event-driven — sensor silence does not imply degraded coverage,
it just means nothing is happening in that sensor's field of view.

Each cycle:
1. Read the heuristic results.
2. Synthesize a brief sitrep highlighting what matters: new contacts,
   corroborated events, escalations, and changes in the character of activity.
3. If anything is worth carrying across cycles (analyst guidance, durable
   thresholds, recurring patterns, dedup notes), call the remember tool.
   Be selective — memories accumulate.

Output the sitrep as plain prose. Keep it tight (under 200 words unless there
is a lot to report).

Prior memories (durable across cycles):
<memories>
{memories}
</memories>
"""


def build_agent() -> Agent:
    agent: Agent = Agent(MODEL)

    @agent.system_prompt
    def with_memories() -> str:
        memories = read_memories().strip() or "(empty)"
        return SYSTEM_PROMPT_TEMPLATE.format(memories=memories)

    @agent.tool_plain
    def remember(text: str) -> str:
        """Append a durable memory to recall in future cycles.

        Use sparingly — only for guidance, thresholds, or patterns worth
        re-loading every cycle. Returns the appended line.
        """
        return append_memory(text)

    return agent
