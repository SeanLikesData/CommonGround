from datetime import datetime, timezone


# Minimum threshold per modality to trigger a report
THRESHOLDS = {
    "rf": lambda s: s.get("signal_strength_dbm", -999) > -60,
    "drone_video": lambda s: s.get("detection_confidence", 0) > 0.75,
    "ugs": lambda s: s.get("confidence", 0) > 0.75,
}


def above_threshold(signal: dict) -> bool:
    modality = signal.get("modality")
    check = THRESHOLDS.get(modality)
    return check(signal) if check else False


def build_report(signal: dict) -> dict:
    # TODO: enrich report with additional context or LLM-generated narrative
    return {
        "source_signal_id": signal["_id"],
        "modality": signal["modality"],
        "signal": {k: v for k, v in signal.items() if k not in ("_id", "processed")},
        "created_at": datetime.now(timezone.utc),
        "kg_synced": False,
    }
