# Gameplay Blueprint
## Game: On-Rails Water Slide Racer
## Stack: 3D — Three.js + GLSL + GLB
## Generated: 2026-04-11
## Source spec: `d:/Work/AI/on-rails/spec/project_normalized_spec.md`
## Literal registry: `d:/Work/AI/on-rails/spec/literal_values_registry.json`
## Visual reference: `d:/Work/AI/on-rails/assets/on-rails-view.png`

> Override: all 2D plugin defaults are translated to a 3D third-person spline racer. There is no aiming, no shooting, no sprite dodging — the verbs are **steer**, **boost**, **air**, and **overtake** on a `THREE.CatmullRomCurve3` water slide.

---

## 1. High-Concept (one sentence)
A 6-racer tropical jetski sprint down a spline-driven water slide (1 player + 5 AI rivals) where you **steer smoothly A/D**, **time your Space boost**, and **milk big air on drops** to overtake rivals and climb the `POS 2/6` pill to `POS 1/6` before the `TIME` hits ~2:00.

---

## 2. Core Loop (every ~5 seconds)
**Read the curve ahead → pick a lateral line (inside vs outside) → steer A/D to hold it → dodge or absorb rival contact → feather or dump Space BOOST → launch off a drop → display `AIR TIME 2.3 s` → land, re-attach to spline, repeat.**

Every ~5 seconds the player is doing exactly one of these micro-decisions:
1. **Steer (continuous)** — smooth-damped lateral offset in `[-1, +1]` on the current spline frame.
2. **Commit to a line** — inside of a banked turn (shorter arc, risk of scraping the orange-red tube wall) vs outside (longer, safer).
3. **Boost window** — spend BOOST charge on a straight or exiting a turn for a clean overtake; avoid burning it going into a blind curve.
4. **Air event** — at a vertical drop, leave the spline, arc ballistically, watch `AIR TIME` accumulate, land back on the spline.
5. **Rival contact** — body-check the rival ahead, or dodge the wash of a rival behind you.

Each loop ends with one of two micro-rewards:
- **Position tick up** — HUD `POS` pill flips from e.g. `3/6` to `2/6`.
- **Air time banked** — `AIR TIME` pill (orange) flashes with a numeric value ≥ `0.3 s`.

---

## 3. Pacing Curve

Target race length: ~120 s (two minutes). The spline is authored in 5 phases that the player traverses in sequence. Intensity is player-felt, 0–10.

| Time | Phase | Name | Intensity | Player Position Seed | New Track Elements | New Systems Exposed |
|------|-------|------|-----------|----------------------|--------------------|---------------------|
| 0–15 s | P1 | "Launch Ramp" | 2/10 | starts `POS 6/6` in the back | gentle straight + 1 wide curve, no drops, full width | steering A/D only; BOOST charge ring visible but empty; HUD `TIME` runs |
| 15–30 s | P2 | "First Curves" | 4/10 | climbing → `POS 5/6`, `POS 4/6` | 2 medium S-curves, first **banking** (camera tilts) | first power-up bottle pickup → fills BOOST charge ring; first rival overtake window |
| 30–60 s | P3 | "Banking & First Drop" | 6/10 | reaches the screenshot seed `POS 2/6` | stronger banked turns + **first vertical drop** → triggers airborne ballistic physics | `AIR TIME` pill (orange, `X.X s` format) appears while airborne ≥ `0.3 s`; landing re-attaches to spline; first wall-scrape if cutting inside |
| 60–90 s | P4 | "Tube Section + Boost Pickups" | 8/10 | locked in a tight pack at `POS 2/6 / 3/6` | full enclosed **tube section** (orange-red `TubeGeometry` walls curl overhead), denser rival traffic, 2+ boost bottles | chained boost economy; rival body-contact nudges; glitch shader flickers briefly on BOOST ignition |
| 90–120 s | P5 | "Final Sprint" | 9/10 | decisive overtake to `POS 1/6` | long straight → one last big drop → finish banner | full BOOST meter, all systems active; finish-line camera flourish |

Intensity curve shape: 2 → 4 → 6 → 8 → 9, with a micro-dip to 7 between phases 4 and 5 to set up the final sprint release.

**Design rule:** the screenshot reference (`POS 2/6`, `TIME 00:45.36`, `AIR TIME 2.3 s`) sits exactly inside Phase 3. That is the canonical "hero moment" of the race and the blueprint anchors on it.

---

## 4. Risk/Reward Matrix

| Action | Risk | Reward | When it's right |
|--------|------|--------|-----------------|
| **Hold center line** (offset ≈ 0) | Low — no wall contact, no overtake chance | Low — you stay at the same rank | Phase 1 tutorial; blind turns you can't read yet |
| **Cut inside line on a banked turn** | High — scrape orange-red tube wall → lateral clamp + speed loss event | High — shorter arc, closes gap on rival ahead | Phase 2+ on turns you can read; combo with a late apex boost |
| **Take outside line** | Medium — longer arc, slower position gain | Medium — safest overtake on a wide rival, sets up a better exit | Phase 3–4 when the inside lane is held by a rival |
| **Fire BOOST on a straight** | Low — just burns charge | High — clean overtake, FOV kick, speed-line payoff | Anytime the BOOST ring is ≥ 50% and the next 2+ seconds of spline are straight-ish |
| **Fire BOOST into a blind curve** | High — handling feels heavier, you'll clip the wall | High — biggest time gain when it works | Phase 5 finale only; risk is the point |
| **Fire BOOST off a drop lip** | Medium — you'll commit to the ballistic arc with extra horizontal velocity | High — longest `AIR TIME` reading, biggest overtake payoff | Phase 3 and Phase 5 drops |
| **Body-check rival sideways** | Medium — mutual speed loss | Medium — frees up the line you want | Tube section (Phase 4) where lanes are tight |
| **Grab a boost-bottle power-up** | Low — tiny steering detour | High — refills BOOST ring | Every pickup in Phases 2–4 |
| **Ignore the rail, chase big air** | Medium — poor landing = speed loss | High — `AIR TIME ≥ 2.0 s` is a hero beat (screenshot literal: `2.3 s`) | Phase 3 and Phase 5 drops only |

### Boost cost model
- BOOST drains the charge ring while active and regenerates slowly passively **and** instantly on bottle pickup.
- While boosting: camera FOV pushes from `60°` (literal: `CFG.camera.fov`) to ~`72°`, speed lines + optional glitch shader slice pulse, and the player jetski gains **brief forgiveness on wall contact** (invulnerability to the speed-loss penalty, not to the clamp).
- This makes boost the answer to "I'm about to clip the wall" as well as "I want to overtake."

### Air time scoring
- Air time starts counting as soon as the player leaves the spline (vertical drop or boost-off-lip).
- HUD surfaces it once accumulated ≥ `0.3 s` as `AIR TIME 2.3 s` (literal format `<float> s` with a space before `s`).
- Longer air = longer BOOST regen tick on clean landing. A sloppy landing (off-center, high angle) cancels the bonus.

---

## 5. Progression Model

### MVP (single race)
- **One track** — a single authored spline with the 5 phases above.
- **Six racers** (`CFG.race.totalRacers = 6`, `CFG.race.aiRivalCount = 5`).
- **Player seed** starts at `POS 6/6` and the target final rank is `POS 1/6`.
- **Win state** — cross finish line in `POS 1/6`.
- **Acceptable state** — finish in any rank `1/6` through `3/6` is a "podium" end screen.
- **Fail state** — finish in `4/6`, `5/6`, or `6/6` shows a "try again" end screen.

### Forward hook (future expansion, do NOT build now)
- Additional tracks unlockable by finishing `POS ≤ 3/6` on the prior track.
- Cosmetic unlocks for the player jetski body (keeping `CFG.player.colors.bodyPrimary = green` and `bodySecondary = yellow` as the default livery).
- Time-trial ghost mode.
- Rival roster expansion beyond the 5 literal colors (`purple, red, blue, yellow, turquoise`).

None of the above is in scope for MVP. The architecture should just not forbid it.

---

## 6. Session Model

- **Target race duration:** ~120 s (2 minutes). Acceptable range 90–150 s.
- **First-try player duration:** 110–140 s (may finish `POS 3/6` or `4/6`).
- **Skilled player duration:** ~100 s with clean boost economy and inside-line cuts, finishing `POS 1/6`.
- **Session flow:**
  1. **Title / Menu** — "Tap to Start" (mobile) / "Press Space" (desktop). Music loop + idle camera drift over the lagoon.
  2. **Race countdown** — 3 → 2 → 1 → GO. `TIME` starts at `00:00.00`.
  3. **Race running** — HUD live: `POS X/6` (top-left), `TIME MM:SS.CC` (top-right), `AIR TIME X.X s` (top-right, only when airborne), mini-map (bottom-left), power-up slot + `BOOST` button (bottom-right), pause `‖` (top-left corner).
  4. **Pause** — pause `‖` freezes the simulation and dims the scene. Resume or quit.
  5. **Finish** — cross line → cinematic slow-mo + final `POS X/6` displayed large + final `TIME` displayed large + best `AIR TIME` reading from the race.
  6. **Results screen** — "Restart" and "Menu" buttons.
  7. **Restart** — same track, same seed, fast reset.
- **Re-play motivation:** beat your own previous `POS` (e.g. went from `POS 3/6` to `POS 1/6`), beat your own previous `TIME`, beat your own single-jump `AIR TIME` record.

---

## 7. Player Verbs → Input → Feel Mapping

All inputs taken verbatim from `CFG.controls.keys = ["A", "D", "ArrowLeft", "ArrowRight", "Space"]`.

### Verb 1 — **Steer left**
- **Input:** `A` or `ArrowLeft` (held)
- **Effect:** target lateral offset decreases toward `-1` (left-clamped by `CFG.player.lateralOffsetRange`)
- **Feel:** smooth-damped (spring / critically damped lerp), NOT a snap. Response time "feels like" 150–250 ms to reach target. Player jetski visually rolls ~10–15° into the lean. Camera tilts a small fraction of the same roll.
- **Rule:** NEVER snap. Per `REQ-020`, only interpolation. A/D is an intent signal, not a teleport.

### Verb 2 — **Steer right**
- **Input:** `D` or `ArrowRight` (held)
- **Effect:** mirror of Verb 1 toward `+1`.
- **Feel:** identical profile, mirrored.

### Verb 3 — **BOOST**
- **Input:** `Space` (tap to ignite, hold to sustain while charge lasts) + on-screen `BOOST` button (touch)
- **Effect:**
  - Forward speed multiplier kicks in over ~0.5 s (half-second kick ramp).
  - Camera FOV pushes from `60°` → ~`72°`.
  - Radial speed lines bloom in screen-space.
  - Optional glitch shader slice pulse (`slice = floor(uv.y * N)`, `offset = sin(slice + time) * intensity`, `uv.x += offset`) fires for ~0.3 s on ignition.
  - Brief wall-scrape invulnerability (~0.5 s on ignition) — you shrug the first wall touch.
  - BOOST ring on the bottom-right HUD button drains visibly.
- **Feel:** physical. Half-second kick, not instantaneous teleport speed. The player should feel shoved into their seat.
- **End:** ring empties → speed ramps back down over ~0.4 s with an FOV exhale.

### Verb 4 — **Pause**
- **Input:** top-left `‖` button (click / tap)
- **Effect:** freezes simulation, dims scene via reduced tone mapping exposure, overlays a pause modal.
- **Feel:** instant, audible click.

### Verb 5 — **Implicit: collect power-up**
- **Input:** none (automatic on contact with a bottle pickup along the spline)
- **Effect:** BOOST ring refills toward full.
- **Feel:** pickup chime + a small bloom burst on the bottle slot icon (bottom-right above BOOST).

### Verb 6 — **Implicit: air time**
- **Input:** none (automatic when leaving spline over a vertical drop or a boosted lip)
- **Effect:** ballistic flight, HUD `AIR TIME X.X s` pill appears (hidden otherwise).
- **Feel:** camera goes quieter, wind SFX swells, time feels to slow slightly (tone mapping exposure +0.05 bump). On landing, splash particle burst.

### Inputs that do NOT exist
- No throttle/brake — forward is automatic (REQ-003).
- No aim/fire — this is not a shooter.
- No jump button — jumps are track-driven (vertical drops on the spline), not player-initiated.

---

## 8. Win / Lose Conditions

### Win (primary)
- **Finish in `POS 1/6`** when crossing the finish line at the end of the spline. Displayed verbatim as `POS 1/6` on the results screen.

### Soft-win (podium)
- **Finish in `POS 2/6` or `POS 3/6`** — results screen shows a "podium" state with an offer to retry for `POS 1/6`.

### Lose
- **Finish in `POS 4/6`, `5/6`, or `6/6`** — results screen shows "Try again".

### Optional secondary win (time target)
- Hidden target time of `01:50.00` (beats the seed capture `TIME 00:45.36` which represents ~Phase 3, not the full race). Beating it displays a bonus "Par Beaten" pill on results.

### No death, no lives
- There is no instant-death state. The player cannot fall out of the world — airborne physics always re-attach to the spline on landing (REQ-030). Failure is **placement**, not **elimination**.

---

## 9. Failure Recovery

The game is forgiving on contact, punishing on repetition.

| Event | Instant consequence | Recovery |
|-------|---------------------|----------|
| **Wall scrape** (lateral offset hits `±1` against orange-red tube) | Lateral offset clamps. Forward speed drops ~15% over ~0.3 s. Screen-edge vignette pulse. NO instant death. | Let go of the steering key, speed ramps back up over ~0.8 s. |
| **Head-on wall slam** (wall + BOOST into curve) | Forward speed drops ~35%. Short camera shake. Optional glitch shader burst. NO instant death. | Same as above, longer ramp (~1.2 s). |
| **Rival body-check** | Mutual ~10% speed loss + small lateral nudge both ways. | Recover in ~0.4 s. |
| **Off-spline airborne** | Camera free-follows ballistic arc; `AIR TIME` HUD pill appears. | On landing, auto-reattach to the spline at the nearest `t` value. Clean landings preserve speed, sloppy landings (high vertical velocity or bad angle) shed ~20% speed. |
| **Fell "out" of the tube section** | Not possible — tube walls are authoritative clamps (REQ-032). | N/A. |
| **BOOST fired on empty ring** | No-op. Soft error tick on HUD. | N/A — next bottle refills. |
| **Finish-line cross in any position** | Race ends, results screen. | Restart button. |

Design philosophy: **the player should never feel that they "died."** They only feel that they lost a position.

---

## 10. Juice Opportunities (hand-off to juice-specialist downstream)

Every item below is a discrete juice hook the downstream juice agent should consider. Tagged with the trigger and the literal value (from `literal_values_registry.json`) where relevant.

### Camera juice
- J-CAM-01: FOV push from `60°` to ~`72°` on BOOST ignition (over 0.25 s), release back over 0.4 s. Literal base: `CFG.camera.fov = 60`.
- J-CAM-02: Slight roll-with-banking during turns (matches `REQ-021`), under ~15°.
- J-CAM-03: Small vertical ease on landing after airborne phase (~5 cm dip).
- J-CAM-04: Finish-line slow-mo cinematic — time scale 0.5x for ~1 s as the player crosses the line.
- J-CAM-05: Pause dims scene via `toneMappingExposure` drop from `1.1` to ~`0.6` over 0.15 s.

### Player jetski juice
- J-PLR-01: Lean roll into turns (visual only, ~15°).
- J-PLR-02: Squash on landing (0.9x vertical over 80 ms, spring back).
- J-PLR-03: Rider torso lean forward on BOOST ignition.
- J-PLR-04: Water trail particles (`lifetimeMin 300 ms`, `lifetimeMax 600 ms` — literal) intensify 2x during BOOST.
- J-PLR-05: Side splash particles at the waterline during hard turns.

### HUD juice
- J-HUD-01: `POS 2/6` pill flashes + bloom pulse when position changes (e.g. `POS 3/6` → `POS 2/6`).
- J-HUD-02: `TIME 00:45.36` digit roll animation on the centisecond field.
- J-HUD-03: `AIR TIME 2.3 s` pill fades in (120 ms) when airborne ≥ `0.3 s`, fades out (150 ms) on landing. Orange tint (`CFG.postprocessing` palette).
- J-HUD-04: `BOOST` button charge ring pulses when ring is ≥ 80%, hinting "fire me."
- J-HUD-05: `BOOST` button does a full-360 bloom sweep on ignition.
- J-HUD-06: Bottle power-up icon above BOOST pops in with a scale-bounce (1.0 → 1.3 → 1.0) on pickup.
- J-HUD-07: Mini-map player dot leaves a 0.5 s trailing streak during BOOST.
- J-HUD-08: Pause `‖` button rotates 90° and color-pulses on click.

### World / shader juice
- J-FX-01: Water shader `uFoamIntensity` uniform pulses up on BOOST and on landing splash.
- J-FX-02: Bloom intensity (`CFG.postprocessing.bloom.intensity = 1.2`) briefly ramps to ~1.6 on BOOST ignition (~0.3 s), releases.
- J-FX-03: Glitch shader slice burst on BOOST ignition and on hard wall slam (200–300 ms only — never persistent, per `REQ-137 / REQ-148`).
- J-FX-04: Radial speed lines (screen-space) during BOOST.
- J-FX-05: Chromatic aberration soft-pulse during airborne phase.
- J-FX-06: Waterfall spray on the right-bank cliff intensifies briefly when player passes close.
- J-FX-07: Palm trees flex (vertex-shader wind) stronger when player passes near.
- J-FX-08: Rival jetski wakes ripple the water surface (uv offset in the water shader near rival positions).

### Audio juice (handoff hints only)
- J-SFX-01: Engine pitch rises with speed, rises extra on BOOST.
- J-SFX-02: Doppler pass-by whoosh on rival overtakes.
- J-SFX-03: Wind howl rises during airborne phase, cuts on landing splash.
- J-SFX-04: Finish-line crowd cheer swell.
- J-SFX-05: `POS` tick-up chime when position improves.

### Hero-moment juice (screenshot reference)
- J-HERO-01: The screenshot captures `POS 2/6 / TIME 00:45.36 / AIR TIME 2.3 s` — that moment should be a **scripted juice beat**: late Phase 3, first big drop, player airborne at ~2.3 s, one rival (purple) visible ahead. Choreograph the camera, bloom pulse, and `AIR TIME` pill fade-in to land exactly like the reference PNG.

---

## 11. Design Anchors (literal values that MUST be honored verbatim)

These are the strings and numbers the rest of the pipeline is contractually bound to. All of them come from `literal_values_registry.json` and must appear exactly as written.

- `POS` (top-left label) — REQ-303
- `2/6` (seed position value, format `<current>/<total>`) — REQ-304
- `TIME` (top-right label) — REQ-305
- `00:45.36` (seed time value, format `MM:SS.CC`) — REQ-306
- `AIR TIME` (right-middle label, only while airborne) — REQ-307
- `2.3 s` (seed air time value, format `<float> s` with a space before `s`) — REQ-308
- `BOOST` (bottom-right button label) — REQ-315
- `‖` (pause symbol, top-left) — REQ-302
- Total racers: **6** (1 player + 5 AI) — REQ-024
- Final target position: **`POS 1/6`** (primary win)
- Rival color palette: `purple, red, blue, yellow, turquoise` — REQ-152 extended by `LIT-GAME-003`
- Player jetski livery: green body + yellow accents — REQ-149
- Camera FOV base: `60` degrees — `LIT-DIM-001`
- Controls: `A`, `D`, `ArrowLeft`, `ArrowRight`, `Space` — `LIT-GAME-006`
- Lateral offset clamp: `[-1, +1]` — `LIT-GAME-007`
- Water trail particle lifetimes: 300–600 ms — `LIT-FX-001 / LIT-FX-002`

Any downstream agent that renames, reformats, or drops one of these strings is wrong.

---

## 12. Handoff Checklist (for the next stage)

- [x] Core loop expressed in one sentence
- [x] Pacing curve has 5 distinct phases (> required 4)
- [x] Every player verb listed with exact input and exact feel
- [x] Risk/reward matrix covers steering, boost, air, and rival contact
- [x] Progression model covers MVP + forward hook
- [x] Session model specifies race duration (~120 s target) and full flow
- [x] Win/lose conditions specify exact `POS X/6` literal states
- [x] Failure recovery explicitly forbids instant death
- [x] Juice opportunities enumerated for downstream juice-specialist
- [x] All literal HUD strings (`POS`, `2/6`, `TIME`, `00:45.36`, `AIR TIME`, `2.3 s`, `BOOST`, `‖`) are referenced verbatim

Next stage consumers:
- **movement-architect** — Verbs 1/2/3, smooth-damp feel profile, BOOST kick model, airborne ballistic model, landing re-attach model.
- **level-designer** — Pacing curve phases 1–5 and their authored spline features (curves, banking, first drop, tube section, final drop).
- **ai-architect** — 5 rivals, pack-stays-close targeting, player-avoidance, noise on rival speeds so overtakes happen, starting seed `POS 6/6` climbing to `POS 2/6` by Phase 3.
- **balance-tuner** — BOOST economy (charge, drain rate, pickup refill), air time threshold (≥ `0.3 s`), wall scrape speed-loss %, body-check nudge %.
- **juice-specialist** — Section 10 in full.
- **hud-builder** — Section 11 literal anchors.
