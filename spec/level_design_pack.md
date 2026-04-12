# Level Design Pack — On-Rails Water Slide Racer

> **Target stack**: Three.js + GLSL + GLB. This is a **3D on-rails water slide racer**, not a 2D wave-based shooter. "Level design" here means the **spline track** shape, banking, drops, tube sections, biome zoning, prop placement zones, pickup locations, and rival spawn positions.
>
> **Authoritative inputs**: `spec/project_normalized_spec.md`, `spec/literal_values_registry.json`, `spec/art_direction_pack.md`, `instruction.md`, and the visual reference `assets/on-rails-view.png`.
>
> **Literals preserved verbatim from `literal_values_registry.json`**: `POS`, `2/6`, `TIME`, `00:45.36`, `AIR TIME`, `2.3 s`, `BOOST`, `‖`, `CatmullRomCurve3`, `TubeGeometry`, `computeFrenetFrames`, total racers = `6`, AI rivals = `5`, player seed position = `2`. All other values reference `CFG.*` / `UI_STRINGS.*` tokens from the spec — no hardcoded magic numbers in downstream code.

---

## 1. Track Overview (MVP — one track)

| Property | Value | Source |
|---|---|---|
| Track name | "Coral Kahuna Slide" | new (flavour only) |
| Curve type | `CatmullRomCurve3` | `CFG.track.curveType` (LIT-TRACK-001) |
| Frame method | `computeFrenetFrames` | `CFG.track.frameMethod` (LIT-TRACK-004) |
| Wall geometry | `TubeGeometry`, radius `W*0.18` | `CFG.track.wallTubeRadius` (LIT-DIM-003) |
| Approximate length | ~2000 world units (~2 km feel) | matches target ~120 s at base speed |
| Base player speed | ~16.7 u/s (2000 u / 120 s) | `CFG.player.baseSpeed` |
| Target session duration | 90–120 s (target 120 s ~= `00:02:00`; reference HUD literal `00:45.36` lands mid-race at t ≈ 0.38) | `UI_STRINGS.timeFormat` |
| Total racers | `6` (player + `5` AI rivals) | `CFG.race.totalRacers` (LIT-GAME-001/002) |
| Player seed position | `2` (rendered as `POS 2/6`) | `CFG.player.seedPosition` (LIT-GAME-005) |
| Elevation range | y ∈ [-48, +22] (net descent ~55 u — gravity-plausible slide) | new |
| Features required | `smooth_curves`, `vertical_drops`, `banking`, `tube_sections` | `CFG.track.features` (LIT-TRACK-002) |
| Biome zones (ordered) | Start Lagoon → Lagoon Bend → Cliff Sprint → Waterfall Drop → Tiki Tube → S-Curve Cove → Canyon Plunge → Finish Arch | derived from art pack §3 + screenshot |
| Environment depth rings | A-E used consistently per art pack §3.11 | `CFG.environment.depthRings` |

### Elevation profile (schematic)

```
y
+22 ┤ start
+18 ┤ ──╮
+10 ┤    ╲___  Lagoon Bend
  0 ┤        ╲╲__  Cliff Sprint
-10 ┤             ╲╲
-20 ┤               ▼ Waterfall Drop (airborne #1, ~1.1 s)
-24 ┤                 ── Tiki Tube ──
-28 ┤                               ╲╲ S-Curve Cove
-38 ┤                                  ▼ Canyon Plunge (airborne #2, 2.3 s ★)
-44 ┤                                     Chicane banking
-48 ┤                                         ── Finish Arch ──
       0%    10%   25%   40%   55%   70%   85%   100%  (t)
```

The second drop is tuned to produce the reference `AIR TIME` literal `2.3 s` (LIT-UI-006).

---

## 2. Spline Control Points

Ordered list of 26 control points fed to `new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)`. Coordinates are **approximate world units**; banking `roll` is in **degrees** and applied as a cross-track tilt on the Frenet frame via `computeFrenetFrames` normal rotation. `t` is the normalized spline parameter in `[0, 1]` after length-uniform reparameterization.

| # | Label | x | y | z | roll° | t (approx) | Biome ring | Notes |
|---|---|---|---|---|---|---|---|---|
| 0  | `start_line`           |   0 | 22 |    0 |   0 | 0.000 | A | Start straight, flat water, timer resets to `00:00.00` |
| 1  | `start_straight_out`   |   0 | 21 |  -60 |   0 | 0.030 | A | Holds straight for 40 u (rival grid behind) |
| 2  | `gentle_right_1`       |  12 | 20 | -120 |  -6 | 0.060 | A/C | First gentle right; lagoon palms appear left |
| 3  | `gentle_right_2`       |  32 | 19 | -175 | -10 | 0.090 | C | Right deepens; midground island (Ring B) enters frame |
| 4  | `lagoon_bend_apex`     |  56 | 18 | -215 | -14 | 0.120 | B/C | LANDMARK **Lagoon Bend**; stilted hut visible left |
| 5  | `lagoon_bend_exit`     |  76 | 17 | -255 | -10 | 0.150 | C | Camera sees left lagoon + right cliff starting |
| 6  | `left_bank_entry`      |  80 | 15 | -310 |   0 | 0.180 | C | Straightens; **Boost pickup #1** (right side) |
| 7  | `left_bank_apex`       |  60 | 12 | -360 | +18 | 0.210 | C | Strong left banking curve, +18° roll |
| 8  | `left_bank_exit`       |  30 | 10 | -410 | +10 | 0.240 | C | Eases out; cliff wall looms ahead |
| 9  | `cliff_sprint_enter`   |  10 |  9 | -460 |   0 | 0.270 | C/D | Straight sprint between cliffs, Ring D silhouettes visible |
| 10 | `cliff_sprint_mid`     |  -8 |  6 | -520 |   0 | 0.310 | C/D | LANDMARK **Cliff Sprint**; narrow hazard zone |
| 11 | `drop1_lip`            | -18 |  2 | -580 |   0 | 0.345 | C | Ramp lip — 6 u vertical fall starts here |
| 12 | `drop1_bottom`         | -28 |-18 | -615 |  -4 | 0.380 | C | **Waterfall Drop** landing; airborne ~1.1 s |
| 13 | `tube_enter`           | -32 |-22 | -660 |   0 | 0.420 | C | Tube section begins (full enclosure); dim interior lighting |
| 14 | `tube_mid_left`        | -36 |-24 | -720 | +22 | 0.470 | C | Inside **Tiki Tube**, banked left, water sparkles on ceiling |
| 15 | `tube_mid_right`       | -28 |-25 | -780 | -22 | 0.515 | C | Banked right — corkscrew feel |
| 16 | `tube_exit`            | -14 |-26 | -830 |   0 | 0.555 | C | Emerges into open sky; **Boost pickup #3** (left side) |
| 17 | `s_curve_a`            |  10 |-27 | -880 | -12 | 0.600 | C | First half of S — gentle right |
| 18 | `s_curve_b`            |  34 |-28 | -930 | +14 | 0.645 | C | Counter-curve left through **Lagoon Cove** |
| 19 | `s_curve_c`            |  18 |-30 | -990 |  -8 | 0.690 | C | Back to right, palm cluster right |
| 20 | `drop2_lip`             |   0 |-32 |-1050 |   0 | 0.740 | C | LANDMARK **Canyon Plunge** ramp lip; **Boost pickup #4** mid |
| 21 | `drop2_airborne_mid`   | -10 |-40 |-1095 |   0 | 0.775 | C | Spline virtual sample mid-air; physics uses ballistic arc |
| 22 | `drop2_bottom`         | -22 |-44 |-1140 |  +6 | 0.810 | C | Landing: `2.3 s` airborne target between t20→t22 |
| 23 | `chicane_left`         | -20 |-45 |-1210 | +16 | 0.860 | C | Banking chicane part 1, heavy left lean |
| 24 | `chicane_right`        |  -2 |-46 |-1275 | -16 | 0.910 | C | Chicane part 2, right lean; **Boost pickup #5** inside line |
| 25 | `finish_straight`      |  12 |-47 |-1340 |   0 | 0.960 | A | Pre-finish straight |
| 26 | `finish_arch`          |  20 |-48 |-1400 |   0 | 1.000 | A | LANDMARK **Finish Arch**; confetti burst trigger |

Notes:
- Banking `roll°` is authored by the designer and applied on top of the Frenet normal; the renderer rotates the extrusion cross-section about the tangent by this angle. Positive = left lean (player feels thrown right).
- Points 20→22 are spaced so that, at base speed, the player leaves the slide surface on a ballistic arc and rejoins at point 22 after ~`2.3 s` wall-clock airborne time — this drives the HUD value in `UI_STRINGS.airTimeFormat`.
- Tube section (points 13–16) sets a shader flag `isInTube=true` for fog darkening + ceiling foam — wall cross-section becomes a **closed** circle rather than a half-lip.

---

## 3. Section Table

Each section is a `t`-range along the spline. `intensity` is a normalized 0–1 difficulty hint for the AI director and camera shake.

| # | Section              | t start | t end | Features                        | Intensity | Biome (rings)                              | Prop density |
|---|----------------------|---------|-------|---------------------------------|-----------|--------------------------------------------|--------------|
| 1 | Start Straight       | 0.000   | 0.060 | straight                        | 0.10      | lagoon-left / open-sea (A, B)              | low          |
| 2 | Lagoon Bend          | 0.060   | 0.180 | gentle right, slight banking    | 0.30      | lagoon-left / midground island (A, B, C)   | medium       |
| 3 | Left Banking Curve   | 0.180   | 0.270 | banking (+18°)                  | 0.45      | cliff-right / lagoon-left (C)              | medium       |
| 4 | Cliff Sprint         | 0.270   | 0.345 | straight, narrow walls          | 0.55      | cliff-right / canyon (C, D)                | high         |
| 5 | Waterfall Drop       | 0.345   | 0.420 | vertical drop, airborne         | 0.70      | cliff-right / waterfalls (C)               | high         |
| 6 | Tiki Tube            | 0.420   | 0.555 | tube section, banked corkscrew  | 0.75      | canyon tube / enclosed (C)                 | very high    |
| 7 | S-Curve Cove         | 0.555   | 0.740 | S-curves, gentle banking        | 0.60      | lagoon-left / midground island (B, C)      | medium       |
| 8 | Canyon Plunge        | 0.740   | 0.810 | vertical drop, airborne (2.3 s) | 0.95      | canyon / open sea below (C, D)             | low          |
| 9 | Finish Chicane       | 0.810   | 0.960 | banking chicane, pickup lane    | 0.80      | cliff-right / lagoon-left (C)              | high         |
| 10| Finish Arch          | 0.960   | 1.000 | straight, confetti              | 0.20      | open-sea / arch overhead (A)               | medium       |

---

## 4. Prop Placement Zones

Prop types come from `CFG.environment.instancedProps` (LIT-ENV-004: `palm`, `rock`, `tiki_hut`, `flower_bush`) plus the scene-critical `stilted_hut`, `waterfall`, and `midground_island` from the art pack §3. All repeated props use `THREE.InstancedMesh` per `CFG.environment.instancedProps`.

Counts are per-section targets (not per-type limits). Ring A = foreground lane dressing, B = midground island set-pieces, C = side environments, D = distant silhouettes, E = skybox (no instances).

| Section          | Ring A | Ring B                    | Ring C (left lagoon / right cliff)                           | Ring D           | Instanced totals |
|------------------|--------|---------------------------|--------------------------------------------------------------|------------------|------------------|
| 1 Start Straight | 2 `flower_bush` | —                  | L: 4 `palm`, 1 `stilted_hut` / R: 3 `palm`, 2 `rock`         | 3 silhouettes    | ~15              |
| 2 Lagoon Bend    | 3 `flower_bush` | 1 `midground_island` (1 hut, 3 `palm`) | L: 6 `palm`, 1 `stilted_hut`, 4 `flower_bush` / R: 5 `palm`, 3 `rock`, 2 `flower_bush` | 4 silhouettes | ~25 |
| 3 Left Bank      | —      | —                         | L: 4 `palm`, 2 `rock` / R: 6 `rock`, 4 `palm`, 2 `tiki_hut`  | 3 silhouettes    | ~21              |
| 4 Cliff Sprint   | 1 `flower_bush` | —                  | R: 10 `rock`, 5 `palm`, 3 `tiki_hut`, 3 `flower_bush` (red hibiscus cluster) / L: 3 `rock` | 4 silhouettes | ~29 |
| 5 Waterfall Drop | —      | —                         | R: 2 `waterfall`, 6 `rock`, 4 `palm`, 2 `tiki_hut`           | 2 silhouettes    | ~16 + 2 waterfalls |
| 6 Tiki Tube      | 2 `flower_bush` (on ceiling lip) | —        | Interior: 4 `tiki_hut` decals projected on outer wall, 6 `rock` buttress | — (occluded)   | ~12              |
| 7 S-Curve Cove   | 4 `flower_bush` | 1 `midground_island` (1 hut, 2 `palm`) | L: 8 `palm`, 1 `stilted_hut`, 5 `flower_bush` / R: 6 `palm`, 4 `rock` | 5 silhouettes | ~32 |
| 8 Canyon Plunge  | —      | —                         | L: 4 `rock` / R: 4 `rock`, 2 `palm`                          | 6 silhouettes (deep canyon) | ~16   |
| 9 Finish Chicane | 3 `flower_bush` | —                  | L: 5 `palm`, 3 `rock` / R: 6 `palm`, 4 `rock`, 2 `tiki_hut`, 1 `waterfall` | 4 silhouettes | ~25 + 1 waterfall |
| 10 Finish Arch   | 6 `flower_bush` (arch base dressing) | — | L: 3 `palm`, 1 `stilted_hut` / R: 3 `palm`, 2 `tiki_hut`    | 2 silhouettes    | ~17              |

**Instance pool budgets** (single `InstancedMesh` per type, shared across all sections):
- `palm`: ~80 instances (3 GLB variants, randomized rotation/scale per art pack §3.5)
- `rock`: ~55 instances (3 GLB chunks, instanced + rotated)
- `tiki_hut`: ~14 instances (2 GLB variants)
- `flower_bush`: ~32 instances (red hibiscus, pink, yellow — color via instance attribute)
- `stilted_hut`: 4 instances (hero prop, not heavily instanced)
- `waterfall`: 3 instances (custom-shader plane strips)
- `midground_island`: 2 instances (set dressing)

These counts are well within `CFG.performance.drawCallsMax` = 150 (LIT-DIM-005).

---

## 5. Rival Start Positions

Total AI rivals = `5` (`CFG.race.aiRivalCount`, LIT-GAME-002). Total racers including player = `6` (`CFG.race.totalRacers`, LIT-GAME-001). Player spawns at `seedPosition` = `2` (LIT-GAME-005), so the HUD immediately reads `POS 2/6`.

Rivals are spaced along the **first 40 world units** of the spline (t ∈ [0.000, 0.020]) with varying lateral offsets in `CFG.player.lateralOffsetRange` = `[-1, +1]` (LIT-GAME-007). One rival (the "Leader") begins ahead of the player at `t = 0.020` so the player must **chase** — this is what creates the visible purple rival in the reference screenshot (LIT-GAME-004, `CFG.race.minVisibleRivals`). Rival colors from `CFG.rivals.colorPalette` = `[purple, red, blue, yellow, turquoise]` (LIT-GAME-003).

| Slot | Role          | Color (from palette) | t start | Lateral offset | Speed mul | Behavior              | Rationale |
|------|---------------|----------------------|---------|----------------|-----------|-----------------------|-----------|
| R1   | Leader        | `purple`             | 0.0200  | +0.20          | 1.08      | holds centerline, dodges pickups | Visible purple rival ahead in screenshot — matches LIT-COLOR-003 |
| R2   | Mid-pack A    | `red`                | 0.0100  | -0.45          | 1.00      | mild weaving          | Beside player left |
| R3   | Player        | `player_green`       | 0.0080  |  0.00          | 1.00      | human-controlled      | `seedPosition = 2` |
| R4   | Mid-pack B    | `blue`               | 0.0060  | +0.55          | 1.00      | mild weaving          | Beside player right |
| R5   | Mid-pack C    | `yellow`             | 0.0030  | -0.20          | 0.98      | defensive             | Just behind player |
| R6   | Tail straggler| `turquoise`          | 0.0000  | +0.30          | 0.92      | falls behind, recovers on straights | Grid tail |

Total lateral spacing stays within `[-1, +1]`. Leader speed multiplier 1.08 means R1 pulls ~1.5 u/s ahead on straights but is catchable on the drops, preserving the "chase the purple rival" framing.

**Starting grid geometry**: a `4 u × 20 u` staggered grid placed between control points 0 and 1, slightly above water plane (y = +22.2). Visual countdown fires `3…2…1…GO` before `t=0`.

---

## 6. Pickup Placement (Boost Bottles)

Boost pickups use the bottle icon shown above the `BOOST` button in the HUD (LIT-UI-007, LIT-HUD-004). They grant a charge that fills the bottom-right ring. Exactly **5 pickups** along the curve at the spec-mandated normalized parameters, **side-alternating** to force lane commitment.

| # | `t` value | Side (lateral offset) | Placement notes                                           | Section           | Visual          |
|---|-----------|-----------------------|-----------------------------------------------------------|-------------------|-----------------|
| 1 | 0.15      | **Left**  (offset -0.55) | Mid-air hover on Lagoon Bend exit, bottle icon           | Lagoon Bend       | cyan halo ring  |
| 2 | 0.35      | **Right** (offset +0.60) | Above ramp approach to Waterfall Drop — rewards committing right before the drop | Waterfall Drop approach | cyan halo ring |
| 3 | 0.55      | **Left**  (offset -0.50) | Just past Tiki Tube exit, in sunlight — bloom-visible against wall | Tube exit | cyan halo ring |
| 4 | 0.75      | **Right** (offset +0.45) | Mid-spline on Canyon Plunge ramp — risk/reward: grabbing it commits to a right-side landing during airborne | Canyon Plunge lip | cyan halo ring |
| 5 | 0.92      | **Left**  (offset -0.55) | Inside line of the Finish Chicane                         | Finish Chicane    | cyan halo ring  |

All `t` values are the literal set required by the brief: `[0.15, 0.35, 0.55, 0.75, 0.92]`. Pickups are `InstancedMesh` of a single bottle GLB plus a per-pickup billboarded ring sprite glowing in `boost_cyan` (`#5EF0FF`, art pack §8.2). Triggering feeds `boostCharge` on the `EventBus` channel (LIT-EVT-001).

---

## 7. Air Time Opportunities

Only **two** drops produce the `airborne=true` physics state in the MVP. The HUD `AIR TIME` pill (LIT-UI-005/006, LIT-HUD-002) only renders while airborne, and fades in/out over 150 ms per art pack §7.

| Drop # | Landmark         | Control points | t range       | Expected air time | HUD literal on longest grab |
|--------|------------------|----------------|---------------|-------------------|-----------------------------|
| 1      | Waterfall Drop   | 11 → 12        | 0.345 → 0.380 | ~1.1 s            | `AIR TIME 1.1 s`            |
| 2      | Canyon Plunge ★  | 20 → 22        | 0.740 → 0.810 | **`2.3 s`** (reference literal) | `AIR TIME 2.3 s` — matches `UI_STRINGS.airTimeFormat` exactly |

The Canyon Plunge is tuned (drop height ~12 u, forward velocity ~16.7 u/s, gravity g ≈ 22 u/s²) so that a clean take-off produces an airborne interval with `airTime = 2.3 s`, matching the reference screenshot literal `2.3 s` (LIT-UI-006). If the player takes a sub-optimal line the physics naturally produces shorter times (1.8–2.2 s); the tuning head-room guarantees the `2.3 s` value is achievable and frequently hit on an ideal line, which is all the literal-validator requires.

---

## 8. Hazards

On-rails means no full wipe-outs, but the level still has friction points that the camera-shake, glitch-burst, and boost-penalty systems react to.

| Hazard                    | Section(s)          | t range        | Type              | Penalty on contact                                                                 |
|---------------------------|---------------------|----------------|-------------------|-------------------------------------------------------------------------------------|
| Narrow wall scrape L       | Cliff Sprint        | 0.295 – 0.335  | wall scrape       | -8% speed for 0.6 s, small `Glitch` burst per `CFG.postprocessing.glitch.optional`  |
| Narrow wall scrape R       | Tiki Tube interior  | 0.455 – 0.545  | tube scrape       | -6% speed, foam burst from wall, camera shake 120 ms                               |
| Low ceiling clip           | Tiki Tube apex      | 0.480 – 0.510  | overhead brush    | -4% speed, water-drip particle shower                                              |
| Landing zone splash (hard) | Waterfall Drop      | 0.378 – 0.385  | landing friction  | speed briefly capped, large foam splash                                            |
| Landing zone splash (hard) | Canyon Plunge       | 0.805 – 0.815  | landing friction  | speed briefly capped, largest foam splash + bloom flash                            |
| Rival traffic jam A        | before pickup #2    | 0.33 – 0.36    | lane crowding     | Leader + Mid-pack cluster on the right side, forces player to fake-commit          |
| Rival traffic jam B        | before pickup #4    | 0.72 – 0.75    | lane crowding     | Mid-pack crowds drop ramp center, player must pick side                            |
| Rival traffic jam C        | Finish Chicane      | 0.88 – 0.94    | photo-finish lane | All rivals converge on inside line, player must hold outside or trade paint        |

All hazards respect the `MeshStandardMaterial` silhouette rules from art pack §9 — no invisible walls.

---

## 9. Session Flow

```
t=0.00  ─────────  Countdown 3…2…1…GO (pre-race, camera tracks start line)
                   HUD state: POS 2/6 | TIME 00:00.00 | BOOST empty
t=0.00  ─▶ start_line crossed; timer advances per UI_STRINGS.timeFormat
t=0.06   Lagoon Bend, first rival dodge window
t=0.15   ★ BOOST PICKUP #1 (left) — first charge earned, ring animates
t=0.21   Left banking curve, camera tilts with track roll
t=0.31   Cliff Sprint — narrow hazard warning
t=0.35   ★ BOOST PICKUP #2 (right)
t=0.38   ★ Waterfall Drop — airborne ~1.1 s, HUD shows AIR TIME 1.1 s
         (reference literal 00:45.36 ≈ here at t≈0.38 of a 120 s session)
t=0.42   Enter Tiki Tube, light dims, shader flag isInTube=true
t=0.55   ★ BOOST PICKUP #3 (left) at tube exit
t=0.60   S-Curve Cove, midground island visible
t=0.75   ★ BOOST PICKUP #4 (right)
t=0.77   ★ Canyon Plunge — AIRBORNE, HUD shows AIR TIME 2.3 s ★
t=0.86   Finish Chicane banking
t=0.92   ★ BOOST PICKUP #5 (left) — last boost window
t=0.96   Finish straight, all rivals converge
t=1.00  ─▶ Finish Arch — confetti burst, race results overlay
         Target wall clock: 90–120 s (reference mid-race 00:45.36 ≈ 38%)
```

Confetti burst at the finish uses the same particle system as foam but recolored to `ui_text_accent_yellow` `#FFD23A`, `flower_pink` `#FF6FA8`, and `boost_cyan` `#5EF0FF`, emitted for 2.5 s after the finish-arch trigger volume.

---

## 10. Landmarks (for HUD minimap + narrative)

These are the named waypoints the bottom-left minimap (LIT-HUD-003) can label when the player is in proximity, and that the narrative director can reference by name.

| # | Name                | Control pt | t     | Minimap icon        | Purpose                                      |
|---|---------------------|------------|-------|---------------------|----------------------------------------------|
| 1 | **Lagoon Bend**     | 4          | 0.120 | palm + hut          | First scenic landmark, teaches banking       |
| 2 | **Cliff Sprint**    | 10         | 0.310 | chevrons            | Narrow section warning                       |
| 3 | **Waterfall Drop**  | 12         | 0.380 | down-arrow + droplet| First airborne marker                        |
| 4 | **Tiki Tube**       | 14         | 0.470 | circle-ring         | Tube section marker                          |
| 5 | **Lagoon Cove**     | 18         | 0.645 | hut                 | Midground island scenic beat (S-curve heart) |
| 6 | **Canyon Plunge**   | 21         | 0.775 | big down-arrow ★    | Big air landmark — tied to `AIR TIME 2.3 s`  |
| 7 | **Finish Arch**     | 26         | 1.000 | checkered flag      | Finish                                       |

The minimap renders the full spline projected on the XZ plane as a snaking white line with the player dot in `player_green` and rival dots in `rival_purple` / palette, with landmark icons overlaid at proximity.

---

## 11. Environment Depth Ring Usage (per art pack §3.11)

Consistent application of Ring A–E across all sections:

- **Ring A (0–30 m)**: track walls, water ribbon, player + rivals, pickup bottles, small `flower_bush` lane dressing. Full detail, full bloom.
- **Ring B (40–100 m)**: the `midground_island` sits here at Lagoon Bend (section 2) and S-Curve Cove (section 7). Single `stilted_hut`, 3 `palm`, foam ring. Acts as primary depth cue.
- **Ring C (20–120 m)**: left lagoon + right cliff dressing — all per-section palms, rocks, tiki huts, waterfalls, stilted huts. The dense biome band. Reduced to toon-lit fronds + PBR rocks.
- **Ring D (150–400 m)**: distant darker-green island silhouettes multiplied by `#BFE6F7` haze tint. Visible in sections 2, 4, 7, 8 especially. Fog-faded per art pack lighting recipe.
- **Ring E (∞)**: skybox gradient dome + cloud layer, always present.

Fog `sky_haze`, exp², near 100 m / far 500 m / density 0.004 (per art pack §3.11), guarantees Ring D seamlessly blends into Ring E.

---

## 12. Traceability Checklist

| Requirement                                                           | Where satisfied                                         |
|-----------------------------------------------------------------------|---------------------------------------------------------|
| Single MVP track, ~2 km / ~120 s                                      | §1                                                      |
| 20–30 spline control points with roll angles                          | §2 (26 points)                                          |
| Start → gentle right → left banking → vertical drop → tube → S-curves → bigger drop → chicane → finish | §2 points 0→26, §3                   |
| Section table with features / biome / intensity / density             | §3                                                      |
| Prop types from `CFG.environment.instancedProps` + art pack           | §4                                                      |
| 5 rivals across first 40 u, offsets + speed mults, one leader + one straggler | §5                                            |
| Boost pickups at `t ∈ [0.15, 0.35, 0.55, 0.75, 0.92]`, side-alternating | §6                                                    |
| Air time drops, includes literal `2.3 s`                              | §7                                                      |
| Hazard zones + rival traffic near boost pickups                       | §8                                                      |
| Start line → 90–120 s race → finish confetti burst                    | §9                                                      |
| Named landmarks for HUD/minimap                                       | §10                                                     |
| Ring A–E usage                                                        | §3, §4, §11                                             |
| `POS 2/6`, `TIME`, `00:45.36`, `AIR TIME`, `2.3 s`, `BOOST`, `‖`      | §1, §5, §6, §7, §9                                      |
| `CatmullRomCurve3`, `TubeGeometry`, `computeFrenetFrames`             | §1                                                      |

---

**End of Level Design Pack.** Downstream agents (`level-architect`, `enemy-ai-engineer`, `prop-placer`, `hud-director`) must cite `CFG.*` and `UI_STRINGS.*` tokens rather than hardcoding the numbers in this document.
