# Scenario: Luzon Strait Dark Vessel Incursion (INDOPACOM)
#
# AO: Luzon Strait (~20.5°N, 121.8°E) — international waters between
# the Philippines and Taiwan, a key INDOPACOM chokepoint.
#
# Four-sensor fusion: AIS dark → maritime radar → passive sonar → ELINT
# Compressed timeline: real-world 2+ hours → demo ~90 sec (events at T=0/30/60/90s)
#
# Tagline: "The fishing vessel went dark. The radar found the ghost.
#           The sonar found its escort. The EP-3E named the warship.
#           CommonGround sees the package before the strait is crossed."

EVENTS = [
    # ── T-120 min (demo T=0s) ────────────────────────────────────────────────
    # AIS transponder on YU FENG 7 (MMSI 412345678) goes dark in open water
    # well outside any established fishing ground.  The vessel's last port was
    # SANSHA (Hainan), a known PLA-N logistics hub.  Class: fishing, but
    # displacement, speed, and timing are inconsistent with commercial fishing.
    {
        "delay_seconds": 0,
        "signal": {
            "modality": "ais",
            "theater": "indopacom",
            "scenario": "indopacom_incursion",
            "scenario_step": 0,
            "scenario_time": "T-120min",
            # ── vessel identity (ITU AIS fields) ──
            "mmsi": "412345678",                   # Maritime Mobile Service Identity (9 digits)
            "vessel_name": "YU FENG 7",
            "vessel_type_code": 30,                # ITU: 30=Fishing
            "vessel_type_label": "FISHING",
            "flag_state": "CHN",                   # ISO 3166-1 alpha-3
            "imo": "9876543",                      # IMO ship number
            "call_sign": "BSXQ9",
            "length_m": 52,
            "beam_m": 9,
            "displacement_tons": 480,
            # ── last known AIS position (before going dark) ──
            "last_known": {
                "lat": 20.512,
                "lon": 121.834,
                "sog_kts": 8.4,                    # speed over ground
                "cog_deg": 192,                    # course over ground
                "heading_deg": 195,                # true heading
                "nav_status": 0,                   # 0=underway using engine
                "rot": 0,                          # rate of turn (deg/min, 0=steady)
                "timestamp": "2026-05-02T01:14:00Z",
            },
            # ── dark vessel indicators ──
            "dark": True,
            "dark_since_utc": "2026-05-02T01:14:00Z",
            "dark_duration_min": 66,
            "last_port": "SANSHA, HAINAN",         # PLA-N logistics hub
            "anomaly": "TRANSPONDER_OFF_OPEN_WATER",
            "anomaly_flags": [
                "DARK_IN_OPEN_WATER",
                "LAST_PORT_MILITARY_LOGISTICS_HUB",
                "SPEED_INCONSISTENT_WITH_FISHING",
                "HEADING_INTO_RESTRICTED_CORRIDOR",
            ],
            # ── location (last known) ──
            "location": {"lat": 20.512, "lon": 121.834},
            "narrative": (
                "AIS transponder on YU FENG 7 (MMSI 412345678, flag CHN) went dark at "
                "0114Z in open Luzon Strait water. Last SOG 8.4 kts, COG 192°. "
                "Last port: SANSHA, Hainan (PLA-N logistics hub). Vessel class 'fishing' "
                "inconsistent with speed, displacement (480t), and operational area. "
                "Anomaly flags: dark in open water, military logistics origin, heading "
                "into restricted corridor."
            ),
            "processed": False,
        },
    },

    # ── T-60 min (demo T=30s) ────────────────────────────────────────────────
    # AN/SPS-73 surface search radar aboard CG-1201 acquires surface contact
    # SKUNK-07 with no AIS correlation — confirming the vessel is operating
    # dark.  Track geometry and speed are consistent with YU FENG 7's last
    # known position projected forward on COG 192°.
    {
        "delay_seconds": 30,
        "signal": {
            "modality": "maritime_radar",
            "theater": "indopacom",
            "scenario": "indopacom_incursion",
            "scenario_step": 1,
            "scenario_time": "T-60min",
            # ── sensor ──
            "sensor_id": "CG-1201",               # Ticonderoga-class CG hull number
            "radar_type": "AN/SPS-73",            # surface search radar
            "radar_mode": "SURFACE_SEARCH",
            # ── contact track ──
            "contact_id": "SKUNK-07",             # SKUNK = unidentified surface contact
            "bearing_deg": 312,
            "bearing_type": "TRUE",
            "range_nm": 18.4,
            "speed_kts": 12.3,
            "course_deg": 185,
            "rcs_m2": 420,                        # radar cross section (m²)
            "classification": "SURFACE_CONTACT_MEDIUM",
            "confidence": 0.87,
            "track_quality": 4,                   # 1–9 NATO track quality scale
            # ── AIS correlation ──
            "correlated_ais": None,               # null = no AIS transponder match (dark)
            "correlation_attempt": True,
            "correlation_radius_nm": 1.0,
            # ── tactical assessment ──
            "consistent_with_prior": "YU_FENG_7_LAST_KNOWN",
            "projected_intercept_area": "LUZON_STRAIT_NORTHERN_CHOKEPOINT",
            # ── location (contact estimated position) ──
            "location": {"lat": 20.498, "lon": 121.819},
            "narrative": (
                "CG-1201 AN/SPS-73 surface search radar acquires SKUNK-07 bearing 312° "
                "true, range 18.4 nm, SOG 12.3 kts, COG 185°. RCS ~420 m² consistent "
                "with 400–600 ton surface vessel. No AIS correlation within 1 nm. "
                "Track geometry consistent with YU FENG 7 last known position projected "
                "forward on COG 192° over 60 min. Track quality: 4/9."
            ),
            "processed": False,
        },
    },

    # ── T-30 min (demo T=60s) ────────────────────────────────────────────────
    # SURTASS passive sonar detects a submerged contact (GOBLIN-02) bearing
    # 308° — consistent with an SSK providing covert escort to the surface
    # dark vessel.  Three-line tonal at 217/434/651 Hz is a known signature
    # for the Type 039A (Yuan-class) SSK.
    {
        "delay_seconds": 60,
        "signal": {
            "modality": "sonar",
            "theater": "indopacom",
            "scenario": "indopacom_incursion",
            "scenario_step": 2,
            "scenario_time": "T-30min",
            # ── sensor ──
            "sensor_type": "PASSIVE",             # PASSIVE | ACTIVE
            "sensor_platform": "SURTASS",         # Surveillance Towed Array Sensor System
            "array_type": "TB-29A",               # thin-line towed array
            # ── contact ──
            "contact_id": "GOBLIN-02",            # GOBLIN = submerged contact
            "bearing_deg": 308,
            "bearing_ambiguity": False,            # left-right ambiguity resolved
            # ── acoustic signature ──
            "frequency_hz": 217,                  # fundamental machinery tonal
            "tonals_hz": [217, 434, 651],         # harmonics (fundamental + 2nd + 3rd)
            "line_count": 3,
            "broadband_snr_db": 12.4,             # broadband signal-to-noise ratio
            "narrowband_snr_db": 18.7,            # narrowband (LOFAR) SNR
            # ── classification ──
            "confidence": 0.81,
            "signature_class": "SUBMERGED",       # SUBMERGED | SURFACE
            "probable_hull_class": "TYPE_039A",   # Yuan-class SSK
            "probable_class_label": "TYPE_039A_SSK",
            # ── kinematics ──
            "doppler_hz": -2.1,                   # negative doppler = closing range
            "closing": True,
            "estimated_speed_kts": 7.0,           # ~7 kts consistent with quiet creep
            "estimated_depth_m": 120,             # estimated depth from ray-path analysis
            # ── tactical inference ──
            "escort_probability": 0.76,           # probability this is escorting SKUNK-07
            "escort_candidate": "SKUNK-07",
            # ── location (estimated from bearing/range) ──
            "location": {"lat": 20.503, "lon": 121.801},
            "narrative": (
                "SURTASS (TB-29A array) passive sonar detects submerged contact GOBLIN-02 "
                "bearing 308°, bearing ambiguity resolved. Three-line narrowband tonal at "
                "217/434/651 Hz (SNR 18.7 dB) consistent with Type 039A (Yuan-class) SSK "
                "propulsion machinery. Doppler -2.1 Hz indicates closing. Estimated 7 kts, "
                "~120 m depth. Escort probability 0.76 relative to SKUNK-07. "
                "Probable multi-domain package: dark surface vessel + submerged escort."
            ),
            "processed": False,
        },
    },

    # ── T-0 (demo T=90s) ─────────────────────────────────────────────────────
    # EP-3E Aries II SIGINT/ELINT aircraft detects a Type 055 DDG surface
    # search radar emission bearing 291°.  Combined with the dark AIS, SKUNK-07
    # radar track, and GOBLIN-02 sonar contact, CommonGround assesses this as
    # a coordinated multi-domain incursion package.
    {
        "delay_seconds": 90,
        "signal": {
            "modality": "elint",
            "theater": "indopacom",
            "scenario": "indopacom_incursion",
            "scenario_step": 3,
            "scenario_time": "T-0",
            # ── collection platform ──
            "collection_platform": "EP-3E_ARIES",  # EP-3E Aries II SIGINT aircraft
            "collection_altitude_ft": 22000,
            # ── emitter parameters ──
            "emitter_id": "EW-LZ-441",
            "frequency_mhz": 9410,               # X-band (8–12 GHz) surface search
            "frequency_band": "X",               # HF|VHF|UHF|L|S|C|X|Ku|Ka
            "pulse_width_us": 0.08,              # pulse width in microseconds
            "pri_us": 476,                       # pulse repetition interval (μs)
            "prf_hz": 2100,                      # pulse repetition frequency (Hz)
            "scan_type": "CIRCULAR",             # CIRCULAR | SECTOR | STARING | CONICAL
            "scan_period_s": 3.0,               # antenna rotation period
            "peak_power_kw_est": 250,            # estimated peak power
            "polarization": "HORIZONTAL",        # H | V | CIRCULAR
            # ── library match & classification ──
            "classification": "SURFACE_SEARCH_RADAR",
            "emitter_library_match": "MFC-110_SKYWATCH",  # NATO ELINT library designator
            "platform_estimate": "TYPE_055_DDG",           # Renhai-class cruiser/DDG
            "confidence": 0.89,
            # ── geolocation ──
            "bearing_from_ep_deg": 291,          # bearing from EP-3E to emitter (true)
            "position_estimate": {"lat": 20.489, "lon": 121.788},
            "position_cep_nm": 8.0,              # circular error probable (nm)
            # ── fusion assessment ──
            "fused_contacts": ["YU_FENG_7_DARK_AIS", "SKUNK-07", "GOBLIN-02"],
            "package_assessment": "MULTI_DOMAIN_INCURSION_PACKAGE",
            "alert_level": "HIGH",
            # ── location ──
            "location": {"lat": 20.489, "lon": 121.788},
            "narrative": (
                "EP-3E Aries II detects Type 055 DDG surface search radar (MFC-110 "
                "SKYWATCH, X-band, PRF 2100 Hz, 0.08 μs pulse) bearing 291° true, "
                "position estimate CEP 8 nm. Combined fusion with YU FENG 7 dark AIS, "
                "SKUNK-07 radar track, and GOBLIN-02 sonar contact: CommonGround assesses "
                "probable multi-domain incursion package — dark maritime militia/auxiliary "
                "vessel with Yuan-class SSK escort and Renhai-class DDG standoff cover "
                "transiting Luzon Strait northern chokepoint. Alert: HIGH."
            ),
            "processed": False,
        },
    },
]
