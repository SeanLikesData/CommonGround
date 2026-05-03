# Scenario: Wadi Hamrin Pre-positioning (CENTCOM)
#
# AO LIONHEART — Hamrin range, northern Iraq (~34.45°N, 44.35°E)
# Three-reporter fusion: UGS seismic → RF burst → drone visual confirmation
# Compressed timeline: real-world 90 min → demo ~60 sec (events at T=0/30/60s)
#
# Tagline: "UGS sees the maneuver. RF catches the coordination.
#           The drone confirms the staging. CommonGround sees all three
#           before the ambush."

EVENTS = [
    # ── T-90 min (demo T=0s) ─────────────────────────────────────────────────
    # UGS-WADI-S1 at the south mouth of Wadi Hamrin detects a tracked vehicle
    # signature moving northbound into the wadi at ~20 km/h.  No friendly
    # armour is scheduled in this sector.  Single sensor — monitor does not
    # alert, but a SPOT pin drops on the map.
    {
        "delay_seconds": 0,
        "signal": {
            "modality": "ugs",
            "theater": "centcom",
            "scenario": "wadi_hamrin",
            "scenario_step": 0,
            "scenario_time": "T-90min",
            # ── sensor identity ──
            "sensor_id": "UGS-WADI-S1",
            "sensor_type": "REMBASS_II",           # Remotely Monitored Battlefield Sensor System
            "emplaced_by": "SCOUT-1",
            # ── detection ──
            "detection_type": "seismic",           # seismic | acoustic | magnetic | pir
            "magnitude": 7.2,                      # normalized relative amplitude 0–10
            "snr_db": 18.4,                        # signal-to-noise ratio in dB
            "confidence": 0.88,                    # target-class confidence 0–1
            # ── target estimate (from seismic signature analysis) ──
            "vehicle_class": "tracked",            # tracked | wheeled_heavy | wheeled_light | personnel
            "vehicle_bearing_deg": 350,            # direction of travel (true)
            "vehicle_speed_kph": 19,               # estimated from seismic pulse interval
            "detection_count": 1,                  # number of distinct targets
            # ── cross-check ──
            "friendly_oob_check": "NO_FRIENDLY_ARMOR_IN_SECTOR",
            # ── location ──
            "location": {
                "lat": 34.4283,
                "lon": 44.3421,
                "mgrs": "38SMC834127",             # south mouth of Wadi Hamrin
                "named_area": "WADI_HAMRIN_SOUTH_MOUTH",
            },
            "narrative": (
                "UGS-WADI-S1 (REMBASS II seismic) at south mouth of Wadi Hamrin detects "
                "tracked-vehicle signature, northbound ~19 km/h, SNR 18.4 dB. "
                "Cross-check of friendly OOB: no friendly armour scheduled in sector. "
                "Single-modality — monitor agent does not alert. SPOT pin generated."
            ),
            "processed": False,
        },
    },

    # ── T-45 min (demo T=30s) ────────────────────────────────────────────────
    # Edge RF sensor near VIL FORK detects a 1.2-second encrypted burst on a
    # frequency band associated with adversary command traffic.  Bearing line
    # geolocates through the area where the tracked vehicle was heading.
    # Monitor agent applies rule R-12 (cross-modal anomaly fusion within
    # 5 km / 60 min) + prior P-3 (no friendly armour in sector) → medium-high
    # alert.
    {
        "delay_seconds": 30,
        "signal": {
            "modality": "rf",
            "theater": "centcom",
            "scenario": "wadi_hamrin",
            "scenario_step": 1,
            "scenario_time": "T-45min",
            # ── RF parameters ──
            "frequency_mhz": 148.500,              # adversary VHF command band
            "signal_strength_dbm": -44,            # received signal strength (dBm)
            "bandwidth_khz": 12.5,                 # 12.5 kHz narrow-band FM (NFM digital)
            "duration_ms": 1200,                   # 1.2-second burst
            "modulation": "FM_NARROW",             # FM_NARROW | FM_WIDE | AM | BPSK | QPSK | FSK
            "encrypted": True,
            "classification": "SIGINT_BURST",
            # ── geolocation ──
            "bearing_deg": 195,                    # line-of-bearing from sensor (true)
            "emission_schedule_check": "NO_SCHEDULED_FRIENDLY_EMISSION",
            "geolocation_intersects": "WADI_HAMRIN_CORRIDOR",
            # ── fusion context ──
            "rule_triggered": "R-12: cross-modal anomaly within 5 km / 60 min",
            "prior_applied": "P-3: no friendly armour scheduled in sector",
            "alert_level": "MEDIUM_HIGH",
            # ── location (sensor position) ──
            "location": {
                "lat": 34.4521,
                "lon": 44.3682,
                "mgrs": "38SMC863148",
                "named_area": "VIL_FORK_OVERWATCH",
            },
            "narrative": (
                "Edge RF sensor at VIL FORK overwatch detects 1.2-second encrypted burst "
                "on 148.500 MHz (adversary VHF command band, NFM 12.5 kHz). "
                "No friendly emission scheduled. Bearing 195° — bearing line geolocates "
                "through Wadi Hamrin corridor consistent with prior UGS-WADI-S1 contact. "
                "Monitor agent fires medium-high alert: rule R-12 + prior P-3."
            ),
            "processed": False,
        },
    },

    # ── T-0 (demo T=60s) ─────────────────────────────────────────────────────
    # Analyst re-tasks RAVEN-3 to overfly the staging area along MSR PYTHON.
    # Drone EO confirms two technicals under camo netting and ~6 armed dismounts.
    # Alert upgrades to HIGH.
    {
        "delay_seconds": 60,
        "signal": {
            "modality": "drone_video",
            "theater": "centcom",
            "scenario": "wadi_hamrin",
            "scenario_step": 2,
            "scenario_time": "T-0",
            # ── platform ──
            "asset": "RAVEN-3",
            "asset_type": "Group2_ISR",            # Group 1–5 UAS classification
            "sensor_mode": "EO",                   # EO | IR
            # ── flight state ──
            "altitude_m": 180,
            "heading_deg": 275,
            "speed_ms": 22,                        # ~43 kts groundspeed
            # ── detection ──
            "detection_confidence": 0.94,
            "entities_detected": [
                {
                    "type": "technical",
                    "count": 2,
                    "detail": "pickup trucks with crew-served weapons, camouflage netting",
                },
                {
                    "type": "dismount",
                    "count": 6,
                    "detail": "armed personnel, weapons visible",
                },
            ],
            "vehicle_count": 2,
            "personnel_count": 6,
            "camouflage_detected": True,
            "engagement_area": "MSR_PYTHON_STAGING",
            "alert_level": "HIGH",
            # ── location (target area) ──
            "location": {
                "lat": 34.4489,
                "lon": 44.3548,
                "mgrs": "38SMC845143",
                "named_area": "MSR_PYTHON_STAGING_AREA",
            },
            "narrative": (
                "RAVEN-3 (Group 2 ISR, EO) re-tasked to MSR PYTHON staging area. "
                "Confirms two technicals (pickup trucks w/ crew-served weapons) under "
                "camouflage netting against treeline, plus ~6 dismounted armed personnel. "
                "Detection confidence 0.94. Alert upgrades to HIGH. "
                "Assessment: adversary maneuver element pre-positioned for likely ambush "
                "against friendly convoy on MSR PYTHON."
            ),
            "processed": False,
        },
    },
]
