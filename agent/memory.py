import os
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path

MEMORIES_PATH = Path(os.environ.get("AGENT_MEMORIES_PATH", "/app/memories.md"))


def read_memories() -> str:
    if not MEMORIES_PATH.exists():
        return ""
    return MEMORIES_PATH.read_text(encoding="utf-8")


def append_memory(text: str) -> str:
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    line = f"- [{timestamp}] {text.strip()}\n"
    MEMORIES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MEMORIES_PATH.open("a", encoding="utf-8") as f:
        f.write(line)
    return line.strip()


def memory_records() -> list[dict[str, str]]:
    """Content-address timestamped entries, including legacy multiline memories.

    IDs survive appends/restarts; editing an entry intentionally changes its ID.
    Unknown free-form Markdown is not treated as citable guidance.
    """
    records = []
    for entry in re.split(r"(?m)(?=^- \[)", read_memories()):
        match = re.fullmatch(r"- \[([^\]]+)\] (.*)", entry.strip(), re.S)
        if not match:
            continue
        timestamp, text = match.groups()
        canonical = f"{timestamp}\n{text}"
        records.append({
            "id": "mem-" + hashlib.sha256(canonical.encode()).hexdigest(),
            "timestamp": timestamp,
            "text": text,
        })
    return records
