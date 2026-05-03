import os
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
