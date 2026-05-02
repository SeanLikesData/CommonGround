import json
import logging
import os
from datetime import datetime, timezone

import anthropic

log = logging.getLogger(__name__)

ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"

SPOT_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "spot_report",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "size":                 {"type": "string"},
                "activity":             {"type": "string"},
                "location_description": {"type": "string"},
                "unit":                 {"type": "string"},
                "time_dtg":             {"type": "string"},
                "equipment":            {"type": "string"},
                "threat_level":         {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]},
                "narrative":            {"type": "string"},
            },
            "required": [
                "size", "activity", "location_description", "unit",
                "time_dtg", "equipment", "threat_level", "narrative",
            ],
            "additionalProperties": False,
        },
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
                "from multi-modal sensor signals. Extract all relevant tactical information "
                "from the provided signal JSON and produce a structured SPOT report.\n\n"
                "SPOT report schema (all fields required):\n"
                "- size: number and type of contacts observed\n"
                "- activity: what was observed happening\n"
                "- location_description: human-readable location summary\n"
                "- unit: identified unit or force if known, otherwise 'UNKNOWN'\n"
                "- time_dtg: date-time group in format DDHHMMZMonYYYY\n"
                "- equipment: platforms and assets identified\n"
                "- threat_level: exactly one of LOW / MEDIUM / HIGH / CRITICAL\n"
                "- narrative: full tactical assessment paragraph\n\n"
                "Use only information present in the signal. Do not hallucinate."
            ),
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a SPOT report from this sensor signal:\n\n{signal_json}",
                }
            ],
            response_format=SPOT_SCHEMA,
        )
        spot = json.loads(response.content[0].text)
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
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        log.error("Failed to parse Claude response: %s", e)

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
