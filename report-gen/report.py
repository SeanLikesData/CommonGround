import json
import logging
import os
from datetime import datetime, timezone

import anthropic

log = logging.getLogger(__name__)

ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"

SPOT_TOOL = {
    "name": "submit_spot_report",
    "description": "Submit a structured NATO SPOT report extracted from the sensor signal.",
    "input_schema": {
        "type": "object",
        "properties": {
            "size":                 {"type": "string", "description": "Plain-language count and type of contacts (e.g. '2 vehicles', '1 small boat'). Avoid acronyms; spell out platform types when known."},
            "activity":             {"type": "string", "description": "What the contact is doing, in plain English (e.g. 'moving north along the ridgeline', 'loitering near the inlet'). One short sentence, no jargon."},
            "location_description": {"type": "string", "description": "Where it is, described the way an operator would say it out loud: nearest landmark, road, or terrain feature first, then approximate lat/lon to 3 decimals in parentheses. No raw geohash."},
            "unit":                 {"type": "string", "description": "Best-guess identification of the unit or force. Use 'Unknown' if it can't be determined; do not invent unit designators."},
            "time_dtg":             {"type": "string", "description": "Date-time group in format DDHHMMZMonYYYY (e.g. '031430ZMay2026')."},
            "equipment":            {"type": "string", "description": "Platforms and assets in plain language. If a military designator is used (e.g. 'BTR-80'), append a short gloss in parentheses (e.g. 'BTR-80 (Russian armored personnel carrier)'). Comma-separated list."},
            "threat_level":         {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "description": "Assessed threat level"},
            "narrative":            {"type": "string", "description": "A 2-4 sentence tactical assessment written for a busy human operator. Lead with the bottom line: what is happening and why it matters. Then briefly state the supporting evidence from the signal and any immediate implication or recommended watch item. Plain English, no acronyms beyond universally known ones (RF is fine; FMV, BDA, multi-INT are not). No bullet markup — flowing prose."},
        },
        "required": [
            "size", "activity", "location_description", "unit",
            "time_dtg", "equipment", "threat_level", "narrative",
        ],
    },
}

# Minimum threshold per modality to trigger a report
THRESHOLDS = {
    # existing modalities
    "rf":          lambda s: s.get("signal_strength_dbm", -999) > -60,
    "drone_video": lambda s: s.get("detection_confidence", 0) > 0.75,
    "ugs":         lambda s: s.get("confidence", 0) > 0.75,
    # INDOPACOM modalities
    "ais":            lambda s: s.get("dark", False) is True,
    "maritime_radar": lambda s: s.get("confidence", 0) > 0.75,
    "sonar":          lambda s: s.get("confidence", 0) > 0.75,
    "elint":          lambda s: s.get("confidence", 0) > 0.75,
}


def above_threshold(signal: dict) -> bool:
    modality = signal.get("modality")
    check = THRESHOLDS.get(modality)
    return check(signal) if check else False


def generate_spot_report(signal: dict) -> dict | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.warning("ANTHROPIC_API_KEY not set — skipping SPOT generation")
        return None

    signal_payload = {k: v for k, v in signal.items() if k not in ("_id", "processed")}

    def _serialize(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    signal_json = json.dumps(signal_payload, default=_serialize, indent=2)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=(
                "You are a NATO tactical intelligence analyst generating SPOT reports "
                "from multi-modal sensor signals. Use the submit_spot_report tool to "
                "submit a structured SPOT report based solely on information in the signal. "
                "Do not hallucinate unit names, coordinates, or capabilities."
            ),
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a SPOT report from this sensor signal:\n\n{signal_json}",
                }
            ],
            tools=[SPOT_TOOL],
            tool_choice={"type": "tool", "name": "submit_spot_report"},
        )
        tool_block = next(b for b in response.content if b.type == "tool_use")
        spot = tool_block.input
        log.info(
            "SPOT generated for modality=%s threat_level=%s",
            signal.get("modality"),
            spot.get("threat_level"),
        )
        return spot

    except anthropic.APIConnectionError as e:
        log.error("Claude API connection error: %s", e)
    except anthropic.RateLimitError as e:
        log.error("Claude API rate limit: %s", e)
    except anthropic.APIStatusError as e:
        log.error("Claude API status error %s: %s", e.status_code, e.message)
    except (KeyError, StopIteration) as e:
        log.error("Unexpected Claude response structure: %s", e)

    return None


def build_report(signal: dict) -> dict:
    spot = generate_spot_report(signal)
    report = {
        "source_signal_id": signal["_id"],
        "modality": signal["modality"],
        "signal": {k: v for k, v in signal.items() if k not in ("_id", "processed")},
        "created_at": datetime.now(timezone.utc),
        "kg_synced": False,
    }
    if spot is not None:
        report["spot_report"] = spot
    return report
