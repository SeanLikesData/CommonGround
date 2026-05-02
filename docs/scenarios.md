# CommonGround — Demo Scenario Candidates

Two candidate scenarios for the demo. Each stresses a different facet of CommonGround: real-time multi-sensor fusion, and long-horizon pattern-of-life inference. Pick one, or run them as a paired arc.

Both are set in the same area of operations (AO LIONHEART) using the corpus framework already drafted: OBJ FALCON, MSR PYTHON (the Main Supply Route), VIL FORK, NAI-7 / NAI-12, Wadi Hamrin (a dry riverbed used as a covered approach), with friendly ISR teams RAVEN-3 / ROOK-2 / HAWK-4 / SCOUT-1 / OWL-2 / ECHO-1.

**Geographic anchor:** AO LIONHEART is overlaid on the real Hamrin range, northern Iraq (~34.45°N, 44.35°E — Diyala / Salah ad-Din border). Real terrain, real drainage, real road corridor; all tactical graphics, unit positions, sensor placements, and labels are synthetic. See `ao-lionheart.geojson` for the overlay envelope.

---

## Scenario 1 — Wadi Hamrin pre-positioning (real-time fusion)

**Tagline:** *"UGS sees the maneuver. RF catches the coordination. The drone confirms the staging. CommonGround sees all three before the ambush."*

### Premise

An adversary maneuver element uses Wadi Hamrin as a covered approach to pre-position for an ambush against a friendly supply convoy on MSR PYTHON. The wadi (Arabic for dry riverbed; common Middle East terrain feature) is sunken terrain — vehicles in it are below the visible horizon of overhead ISR and surrounding higher ground. A friendly recon team has emplaced an unattended ground sensor (UGS) at the south mouth of the wadi precisely because it is the natural chokepoint for anyone using the wadi as concealment.

### Reporters

- **UGS** (seismic + acoustic) at the south mouth of Wadi Hamrin
- **Edge RF sensor** on overwatch near VIL FORK
- **Operator + drone** (RAVEN-3) re-tasked mid-scenario for visual confirmation

### Arc (90 minutes, compressed in demo)

- **T-90 min — UGS hit, no alert.** Seismic detector identifies tracked-vehicle signature, northbound at ~20 km/h. Cross-checks friendly OOB: no friendly armor scheduled. Writes SPOT, pushes to graph. Pin drops on map. Single-modality, single-sensor — monitor agent does not alert.
- **T-45 min — RF burst, monitor fires.** Edge RF sensor near VIL FORK detects a 1.2-second encrypted burst on a frequency band associated with adversary command traffic. Cross-checks friendly emission schedule: no scheduled friendly emission. Writes SPOT with bearing line. The bearing line geolocates through the area where the tracked vehicle was heading. The monitor agent applies rule R-12 (cross-modal anomaly fusion within 5 km / 60 min) plus prior P-3 (no friendly armor in this sector) and raises a medium-high alert. Pulsing ring draws around both pins. Alert card cites both reports + both memory entries.
- **T-0 — Drone confirms.** Analyst clicks the alert and re-tasks RAVEN-3 to overfly the staging area along MSR PYTHON. Drone clip plays; VLM extracts entities; SPOT pin drops with two technicals (pickup trucks with mounted crew-served weapons) under camouflage netting against a treeline, plus ~6 dismounted personnel with weapons visible. Alert upgrades to high. Assessment writes itself with citations to all three reports.

### Synthesis

Three independent reports — seismic, RF, visual — fuse on the same area within 90 minutes. Each reporter contributes something the others cannot. UGS sees the maneuver while it's still in defilade and invisible to overhead ISR. RF catches a coordination signal no visual sensor could pick up. Drone provides the confirmation that turns "two anomalies" into a known pre-positioning pattern.

Assessment: *"Adversary maneuver element pre-positioned along MSR PYTHON ahead of likely ambush against friendly convoy. Maneuver component used Wadi Hamrin as covered approach. Command element active consistent with imminent execution. Recommend reinforce route security, consider strike on identified vehicles before dispersal."*

### Operator decision

Analyst sees the assessment, confirms with the battle captain, route security is reinforced and a strike package considered against the staged technicals. CommonGround surfaces the picture; the human makes the call.

### Correction beat (learning loop)

Earlier in the shift, the agent fired an alert on a single-sensor RF burst in a sector where civilian Baofeng radio traffic is known to be high. Analyst types into chat: *"Don't alert on single-sensor RF bursts in sector S — civilian Baofeng traffic is normal here."* Agent classifies as an interpretive prior, drafts the entry, analyst confirms. Three later single-RF events in sector S do not fire alerts.

### What this scenario uniquely demonstrates

- Real-time multi-sensor fusion across three modalities in 90 minutes
- The terrain-as-through-line story (Wadi Hamrin is the reason every reporter is positioned where it is)
- Clean handoff: UGS → alert → RF → upgraded alert → drone re-task → visual confirmation
- The "alert cites the rule + the prior + the contributing reports" transparency moment

---

## Scenario 2 — Patrol pattern reveals a high-value site (pattern-of-life inference)

**Tagline:** *"One vehicle is noise. The same vehicle on the same loop every other day is a patrol. Patrols guard things — the agent finds what."*

### Premise

A different tempo entirely: not 90 minutes of fusion, but two weeks of pattern-of-life (POL) inference. POL analysis is a named intelligence tradecraft: senior analysts spend hours scrubbing weeks of historical sightings to identify behavioral patterns that reveal what an adversary is protecting, where leadership is staying, where weapons caches are, where high-value individuals live. Today this is manual, slow, and only happens for already-prioritized targets.

CommonGround's monitor agent runs continuously over the same graph the real-time scenario uses. Over days, it accumulates UGS pings, trail-cam frames, and occasional RF detections of vehicle movements across the AO. Most are noise — civilian traffic, agricultural movement, friendly patrols. The agent's job is to find the patterns that aren't noise.

### Reporters

- **Multiple UGS** at chokepoints across the AO (intersections, bridges, wadi mouths)
- **EO/IR trail cameras** at known transit points (a fourth reporter type added for this scenario — motion-triggered with on-device VLM)
- **Edge RF sensor** picking up occasional brief check-in bursts (no specific content, just emission events)
- **No drone in the build-up** — drone gets cued only at the synthesis moment

### Arc (14 days, compressed in demo)

- **Day 1–6 — Accumulation.** Over six days, sensors across the AO log hundreds of vehicle movements. Each one enters the graph. None individually is interesting. The map looks like a slowly-blooming pin field.
- **Day 7 — Pattern emerges.** The monitor agent runs a periodic pattern-search across the graph and notices that a small set of vehicle signatures (similar weight class per UGS, similar pickup-truck profile per trail cam) has been transiting the same loop on a consistent ~36-hour interval for six rotations. The loop is not on any commercial route, the timing is too regular to be random transit, and the geometry of the loop encloses an area roughly 3 km across. No friendly forces are operating in that area. The agent raises a medium alert: *"Repeating vehicle pattern consistent with route security patrol around suspected protected site. Pattern observed across UGS-0341, UGS-0359, TRAIL-07, TRAIL-12 over 144 hours. Centroid of patrolled area: GRID 38SLC4XYZ. Recommend collection on centroid."*
- **Day 7 — Analyst inspects.** Analyst clicks the alert. CommonGround draws the inferred patrol loop on the map. The centroid falls on a walled compound that has not previously been a named area of interest. The alert cites the contributing reports (the six rotation observations) and the cited memory entries: rule R-23 (recurring multi-sensor traffic pattern detection) and reasoning example E-4 (a prior analyst's narrative about how route security patrols indicate protected sites).
- **Day 7 — Drone overflight.** Analyst re-tasks ROOK-2 for next-orbit overflight of the centroid. Drone clip plays; VLM extracts entities; SPOT pin drops at the compound: walled enclosure, 3 vehicles inside, communications array on the roof, armed personnel at the gate. Assessment writes itself: *"Probable adversary command post or leadership residence. Patrol pattern consistent with route security; physical features (comms array, armed gate, walled enclosure) consistent with high-value site. Recommend persistent ISR, escalate to brigade."*

### Synthesis

The agent finds in 7 days what a manual analyst would find in 30 days of overtime — if anyone bothered to look. The inference (recurring patrol pattern → protected site) is exactly the kind of reasoning a senior analyst does, captured as a reasoning example in memory and reused continuously by the monitor. The dollar metric is intelligence yield per analyst-hour, and CommonGround moves it by an order of magnitude on this kind of long-horizon work.

### Operator decision

Tip-off goes up to brigade S2; persistent ISR is tasked on the compound; the site becomes a named target for further collection. CommonGround does not name the high-value individual or claim leadership presence — it surfaces the pattern, the operator and the brigade decide what to do about it.

### Correction beat (learning loop)

Earlier, the agent flagged a similar repeating-vehicle pattern that turned out to be a farmer driving the same route to the same field every other day. Analyst writes the correction: *"This is local agricultural traffic. Patterns that loop through farmland during 0500–0700 local with a single vehicle and no return-trip RF activity are not patrols."* Agent proposes either an interpretive prior (downweight ag-time-window patterns) or a reasoning example (the analyst's narrative about how to distinguish patrols from ag), classifies it, analyst confirms. Future ag-pattern matches don't fire.

### What this scenario uniquely demonstrates

- The agent + memory layer's ability to do long-horizon work that a real-time fusion engine cannot
- A different tempo (days/weeks vs. minutes/hours) — proves CommonGround is not just a real-time alert system
- A concrete intelligence product (a candidate high-value site) rather than a tactical alert
- The reasoning-examples memory category in action (POL-style analyst reasoning captured and reused)
- Bridges to real intel-community tradecraft (POL analysis is a named discipline; senior analysts will recognize what they're seeing)

---

## How the two scenarios compare

| Dimension | 1. Wadi Hamrin | 2. Patrol → HVS |
|---|---|---|
| **Time scale** | 90 minutes | 14 days |
| **Reporters used** | UGS + RF + drone | UGS + trail cam + RF + drone |
| **Operational outcome** | Reinforce route, possible strike | Cue persistent ISR on candidate HVS |
| **Value metric** | Ambush prevented | Intel yield per analyst-hour |
| **Demonstrates uniquely** | Real-time multi-modal fusion + terrain logic | Long-horizon pattern-of-life inference |
| **Production lift** | Lowest (corpus framework drafted) | Highest (need 14 days of synthetic background traffic + pattern-search code) |
| **Risk** | Most generic | Most code to write for the long-horizon search |

## Composition options

- **Wadi Hamrin alone (1):** safest, designed, lowest production risk. ~2 minutes of demo, all three reporter types, the correction beat fits inside cleanly.
- **Patrol → HVS alone (2):** strongest agent-and-memory showcase. Pre-recorded compression of 14 days. Less visceral than real-time but a more novel demonstration of what CommonGround does that no current tool does.
- **Paired arc (1 + 2):** open with a short POL beat that surfaces the suspected staging compound, then run the real-time Wadi Hamrin fusion catching maneuver out of (or near) that same compound. Two timescales, one through-line. Higher production lift; only attempt if Scenario 1 is solid first.

Recommended build order: Scenario 1 first as the working demo and fallback. If time allows, add a compressed Scenario 2 beat in front of it for the paired arc.
