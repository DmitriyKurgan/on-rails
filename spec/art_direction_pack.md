# Art Direction Pack — On-Rails (Tropical Water Slide Racer)

> **Visual North Star**: `d:/Work/AI/on-rails/assets/on-rails-view.png`
> Every decision below is traceable to this screenshot. If in doubt, match the screenshot.
>
> **Tech target**: Three.js (WebGL2) + GLSL + GLB models. This is a **3D** game — all former 2D/Canvas conventions (outlines, sprites, parallax layers) are translated to 3D equivalents (rim light / fresnel, PBR materials, environment depth rings).

---

## 1. Style Guide

### Overall Look
- **Genre feel**: Premium mobile arcade water-slide racer. Think "Wave Race" meets "Aqua Park" meets a high-end App Store hero shot.
- **Mood**: Bright, sunny, tropical, joyful, high-energy. Midday lighting, zero gloom, zero grit.
- **Stylization**: Semi-stylized PBR — not photoreal, not toon-shaded. Low-poly-ish silhouettes with clean PBR surfaces, boosted color grading, and generous bloom. Closer to Pixar/Ubisoft-mobile than Forza.
- **Reference lock**: The screenshot shows hyper-saturated turquoise water, candy-orange tube walls with glossy highlights, lush green palms, and warm golden sun. Reproduce this exact color energy.

### Silhouette Strategy (replaces "outlines")
- Low-poly, readable silhouettes. Every gameplay object (jetski, wall, rival) must read as a shape against any background.
- **Rim lighting** via fresnel term in the shader: a subtle bright edge on jetskis, rival, and the inside lip of the orange walls. This is the 3D substitute for the old "outline on every object" rule.
- Rim color = warm white (`#FFF4D6`) on player/rival; sun-orange (`#FFB870`) on the orange wall tops.
- Rim intensity: subtle (0.25–0.35 mix), bloom does the rest of the "pop".

### Material Strategy
- **Single master PBR stack**: `MeshStandardMaterial` for most objects, one custom `ShaderMaterial` for water, one for the skybox gradient, optional toon-ramp variant for foliage.
- **Glossy plastics** (jetskis, wall tubes): low roughness (0.15–0.25), metalness 0 (plastic), high clearcoat feel faked via bloom on specular.
- **Matte naturals** (sand, rock, wood huts, palm trunks): roughness 0.75–0.95, metalness 0.
- **Foliage**: custom stylized shader — two-tone ramp (lit green + shadow green), slight wind wiggle in vertex shader.
- **Budget**: keep total unique materials ≤ 12. Reuse aggressively. Instancing for palms, rocks, flowers, foam particles.

### Proportions
- Jetskis: slightly chunky/chibi (1.1× wider than realistic, shortened nose). Rider ~1.3× head scale for readability.
- Environment props: stylized, slightly exaggerated (fat palm trunks, oversized flowers).
- Track walls: thick chunky tubes, very rounded cross-section (not thin pipes).

---

## 2. Master Color Palette (Named Tokens)

All tokens extracted by eye-dropping the reference screenshot. Use these as `CFG.PALETTE.*` constants — no hardcoding elsewhere.

### Sky & Atmosphere
| Token | Hex | Role |
|---|---|---|
| `sky_top` | `#2FA6E8` | Upper sky dome — deep tropical blue |
| `sky_mid` | `#6FC9F2` | Horizon band blue |
| `sky_haze` | `#BFE6F7` | Near-horizon haze / hemisphere sky color |
| `cloud_white` | `#FFFFFF` | Soft cumulus clouds (not pure white in fog) |
| `cloud_shadow` | `#D4E8F2` | Cloud underside |
| `sun_warm` | `#FFE7A8` | Directional sun light color |
| `sun_disc` | `#FFF6C2` | Sun disc / sky lens flare core |

### Water
| Token | Hex | Role |
|---|---|---|
| `water_shallow` | `#6FE3D6` | Bright turquoise — shallow/lit areas |
| `water_mid` | `#2BBFC9` | Mid-depth turquoise |
| `water_deep` | `#0E7A9B` | Deep water shadow in tube bottom |
| `water_rim` | `#A9F2E8` | Fresnel edge of water against walls |
| `foam` | `#FFFFFF` | Foam streaks |
| `foam_soft` | `#E8FAFB` | Foam fade / soft spray |

### Track Walls (orange tubes)
| Token | Hex | Role |
|---|---|---|
| `wall_orange` | `#FF6A1F` | Primary wall albedo — saturated orange |
| `wall_orange_hi` | `#FFB26B` | Top-lit highlight stripe |
| `wall_orange_shadow` | `#B33A08` | Wall underside / shadow |
| `wall_rim` | `#FFE3A8` | Fresnel rim on wall lip (bloom source) |
| `wall_stripe_white` | `#FFFFFF` | Optional white safety stripe (subtle) |

### Vegetation & Nature
| Token | Hex | Role |
|---|---|---|
| `palm_green` | `#3FA83B` | Palm frond lit color |
| `palm_green_dark` | `#1E5E24` | Palm frond shadow color (toon ramp) |
| `palm_trunk` | `#6B4A2B` | Palm trunk brown |
| `grass_green` | `#5FC247` | Ground grass / bush accents |
| `flower_red` | `#E83A2E` | Hibiscus red — right cliff flowers |
| `flower_pink` | `#FF6FA8` | Tropical pink blossoms |
| `flower_yellow` | `#FFD23A` | Occasional yellow bloom |

### Ground & Rock
| Token | Hex | Role |
|---|---|---|
| `sand` | `#F1DDA4` | Warm sandy lagoon beach |
| `sand_wet` | `#C9A968` | Wet sand at waterline |
| `rock_grey` | `#7C8A8F` | Cliff rock base |
| `rock_grey_dark` | `#4A575C` | Rock shadow / crevice |
| `rock_warm` | `#A08A72` | Sun-hit rock highlight |

### Architecture (huts)
| Token | Hex | Role |
|---|---|---|
| `hut_wood` | `#8A5A2C` | Stilted hut wood planks |
| `hut_wood_dark` | `#5A3618` | Hut shadow / support posts |
| `hut_thatch` | `#C9953E` | Thatched roof straw |
| `hut_thatch_dark` | `#7A5516` | Thatch shadow |

### Entities — Player Jetski
| Token | Hex | Role |
|---|---|---|
| `player_green` | `#B4FF2E` | Primary body — electric lime green |
| `player_green_dark` | `#5FA60D` | Body shadow / underside |
| `player_yellow` | `#FFD200` | Yellow accent stripes / fins |
| `player_black` | `#1A1A1A` | Seat / handlebars / dash |
| `rider_vest_orange` | `#FF7A1F` | Rider life vest (matches wall tone family) |
| `rider_skin` | `#D9A07A` | Rider skin tone |
| `rider_helmet_black` | `#222222` | Helmet / dark hair |

### Entities — Rival Jetski
| Token | Hex | Role |
|---|---|---|
| `rival_purple` | `#8A3CE0` | Primary body — vivid purple |
| `rival_purple_dark` | `#4B1B80` | Body shadow |
| `rival_accent_magenta` | `#E04BD6` | Accent stripe |
| `rival_black` | `#1A1A1A` | Seat / dark parts |

### Lighting (reference values)
| Token | Hex | Role |
|---|---|---|
| `light_sun` | `#FFE7A8` | Directional sun |
| `light_hemi_sky` | `#BFE6F7` | Hemisphere upper |
| `light_hemi_ground` | `#7BC96B` | Hemisphere lower (bounced green from foliage/water) |
| `light_ambient` | `#F0E6CC` | Warm fill ambient |

### FX & Particles
| Token | Hex | Role |
|---|---|---|
| `spray_white` | `#FFFFFF` | Jetski water spray core |
| `spray_blue` | `#CFF4FF` | Spray fade color |
| `boost_cyan` | `#5EF0FF` | Boost particle / trail |
| `boost_white` | `#FFFFFF` | Boost core |
| `waterfall_white` | `#FFFFFF` | Waterfall main stream |
| `waterfall_tint` | `#BCE9F2` | Waterfall shadow / veil |

### UI
| Token | Hex | Role |
|---|---|---|
| `ui_pill_bg` | `#0B1626` @ 55% | Dark translucent pill background |
| `ui_pill_stroke` | `#FFFFFF` @ 90% | Pill outline (1.5 px) |
| `ui_text_primary` | `#FFFFFF` | Main numeric text |
| `ui_text_accent_red` | `#FF4A4A` | "AIR TIME" accent red |
| `ui_text_accent_yellow` | `#FFD23A` | Highlighted values |
| `ui_boost_ring` | `#CFF4FF` | Boost ring ticks |
| `ui_boost_ring_bg` | `#0B1626` @ 70% | Boost ring backdrop |

---

## 3. Per-Entity Visual Specification

Every entity below maps directly to a visual element in the reference screenshot. For each: **Materials → Shading → Features → Animation**.

### 3.1 Player Jetski (green/yellow)
**Reference**: Large centered craft in screenshot — lime-green hull with yellow accents, black seat, rider in orange vest.

- **Model**: GLB, low-poly stylized jetski, ~1200–2500 tris. Chunky proportions, rounded nose, small rear fins.
- **Materials**:
  - Body: `MeshStandardMaterial` — albedo `player_green`, roughness 0.2, metalness 0.0. Painted plastic feel.
  - Accent stripes/fins: `player_yellow`, roughness 0.25.
  - Seat/handlebars: `player_black`, roughness 0.45.
  - Rider vest: `rider_vest_orange`, roughness 0.55.
- **Shading approach**: Standard PBR + fresnel rim (`wall_rim` warm white, intensity 0.3). Emissive off except when boosting (emissive pulses `boost_cyan` at 0.4).
- **Key features from reference**:
  - Bright lime body clearly reads against turquoise water.
  - Yellow slash accent along the side (screenshot shows bold yellow stripe on the flank).
  - Rider slightly leaning forward, orange vest with black helmet.
  - Strong specular hotspot on the hood (bloom amplifies it).
- **Animation**:
  - Idle bob: sinusoidal 0.03 m vertical, ±2° roll tied to water waves.
  - Lean: ±8° bank on left/right input, lerped.
  - Boost: emissive pulse + rear cyan jet particles.
  - Hit: full-body albedo flash to `#FFFFFF` for 80 ms, then back.
- **Trail / spray**:
  - Twin V-shaped foam wakes trailing from rear — `foam` particles, ~40 live, 0.6 s lifetime, shrinking alpha, slight upward lift.
  - Fine mist: `spray_blue`, 20 particles, 0.4 s, additive blending.

### 3.2 Rival Jetski (purple)
**Reference**: Smaller craft mid-right in screenshot, purple hull.

- **Model**: Same base mesh as player (GLB variant or material swap).
- **Materials**:
  - Body: `rival_purple`, roughness 0.2, metalness 0.0.
  - Accent: `rival_accent_magenta`.
  - Seat: `rival_black`.
- **Shading approach**: PBR + fresnel rim (`#FFC8FA` subtle pink-white, intensity 0.25).
- **Features from reference**:
  - Clearly smaller in frame — position further ahead to convey depth.
  - Same chunky silhouette as player.
  - No rider visible in screenshot at this distance — keep it optional / generic.
- **Animation**: Same bob/lean rules as player. Drifts left/right slightly as AI dodges.
- **Trail**: Slightly thinner wake than player, same `foam` color.

### 3.3 Track Walls (orange tubes)
**Reference**: The bright candy-orange tube-like walls that hug both sides of the water channel.

- **Geometry**: Extruded tube along `CatmullRomCurve3`. Rounded cross-section (half-cylinder lip facing inward, curving over the top). Thick — wall radius comparable to half the track width at its peak.
- **Materials**:
  - Main: `MeshStandardMaterial`, albedo `wall_orange`, roughness 0.15, metalness 0.0 → reads as glossy painted plastic.
  - Optional darker inner band near waterline: `wall_orange_shadow`.
- **Shading approach**: Strong fresnel rim (`wall_rim`, intensity 0.45) along the top lip — this is the primary bloom source in the scene. The glossy specular streak on top of each wall in the reference comes from this rim + bloom combo.
- **Key features from reference**:
  - Walls visibly gradient from bright orange top to slightly darker underside.
  - Very glossy — you can see a long streaked highlight running along the top of each wall.
  - At turns, the outer wall banks higher than the inner.
  - Optional subtle white stripe on inner lip (present in the screenshot as the water-foam contact line) — handled by the water foam shader, not the wall itself.
- **Animation**: None. Static geometry. The "motion" comes from camera and water.

### 3.4 Water Surface
**Reference**: Turquoise channel water with flowing white foam streaks pointing along travel direction, some wavy distortion, bright highlights where sun hits.

- **Geometry**: Ribbon mesh extruded along the same spline as the track, inset slightly so walls overlap the edge.
- **Shader**: Custom `ShaderMaterial` (GLSL).
- **Shading approach**: Layered look — not PBR.
  - Base: gradient between `water_deep` (bottom of UV) → `water_mid` → `water_shallow` (top/surface hit).
  - Fresnel edge near walls adds `water_rim`.
  - Foam: grayscale foam texture scrolled along the spline tangent direction; thresholded to produce streak shapes; color `foam` with soft falloff `foam_soft`.
  - Specular pops: small bloom-ready hot pixels driven by `pow(noise, 16) * sunDir`.
- **Animation**:
  - UV distortion: `uv.x += sin(time + uv.y * freq) * amp; uv.y += cos(time + uv.x * freq) * amp` (per instruction.md). `freq ≈ 8.0`, `amp ≈ 0.012`.
  - Foam scroll speed tied to player speed.
- **Visual goals → see §6 (Water Shader Visual Goals)**.

### 3.5 Palm Trees
**Reference**: Tall slender palms scattered left and right, with arcing fronds; visible in both midground island and cliffside.

- **Model**: 2–3 GLB variants (tall, medium, leaning). Instanced.
- **Materials**:
  - Trunk: `palm_trunk`, roughness 0.85.
  - Fronds: custom two-tone toon-ish shader — `palm_green` lit / `palm_green_dark` shadow, sharp ramp, slight translucency fake via brighter `palm_green` on back-lit fronds.
- **Features from reference**: Long, curved fronds; trunks lean slightly; grouped in clusters, never alone.
- **Animation**: Vertex wind wiggle — `sin(time + worldPos.x) * 0.04` on frond tips. Instanced, cheap.

### 3.6 Rocks / Cliff (right side)
**Reference**: Rocky cliff face on the right with waterfalls cascading and tiki huts perched on top.

- **Model**: A few GLB rock chunks, instanced and rotated. Large cliff base is a single hand-modeled GLB.
- **Materials**: `MeshStandardMaterial`, albedo `rock_grey` with vertex color variation toward `rock_warm` on sun-hit faces. Roughness 0.9.
- **Shading approach**: Matte PBR. Hemisphere light provides the blue-sky top / green-bounce bottom which gives rocks their tropical feel.
- **Features from reference**: Chunky, faceted, stylized — not noisy photoreal rock. Moss/vegetation patches on top edges using `grass_green`.

### 3.7 Huts (stilted wood + thatched tiki)
**Reference**: Left — sandy-lagoon stilted hut with wood deck and thatch roof. Right cliff-top — cluster of tiki huts. Midground island — small single hut.

- **Model**: 2 GLB hut variants (stilted overwater, cliff tiki).
- **Materials**:
  - Walls/posts: `hut_wood` albedo, roughness 0.8.
  - Roof: `hut_thatch` albedo, roughness 0.9, slight normal map for straw direction.
  - Shadow underside of roof: darker `hut_thatch_dark` via vertex color.
- **Features from reference**: Warm brown wood, golden thatch, stilts going into water on left hut. Small windows (black cutouts, emissive 0 — sun doesn't hit inside).

### 3.8 Waterfalls (right cliff)
**Reference**: Two or three thin waterfalls pouring from the cliff face into the channel/lagoon.

- **Geometry**: Vertical plane strips with custom shader. Billboarded.
- **Materials**: Custom shader — vertical UV scroll, alpha from gradient noise, color lerp `waterfall_tint` → `waterfall_white` top to bottom. Additive pop at the base where it meets water.
- **Features from reference**: Bright white, slightly translucent, generating a small foam burst at the base (emit `foam` particles).
- **Animation**: UV y-scroll 1.5 u/s. Base foam burst loops on 0.6 s.

### 3.9 Skybox
**Reference**: Bright tropical sky, saturated blue with soft white cumulus clouds, no harsh sun disc but warm glow.

- **Type**: Gradient sky shader on inverted sphere (not a cubemap — allows cheap color grading tweaks). Optional cheap cloud layer.
- **Shader**:
  - Vertical gradient: `sky_top` (zenith) → `sky_mid` (45°) → `sky_haze` (horizon).
  - Cloud layer: UV-scrolled low-frequency noise, thresholded, colored `cloud_white` with `cloud_shadow` underside. Very slow drift (0.005 u/s).
  - Sun position: warm glow patch using `sun_disc` color, soft gaussian, placed at directional light angle.
- **Features from reference**: No stars, no gloom, no gradient toward purple. Pure bright cheerful blue.

### 3.10 Midground Island
**Reference**: Small island visible in the middle-distance with a single hut, palms, some foam at waterline.

- **Composition**: Low-poly island dome (sand mesh) + 1 hut + 3 palms + foam ring particle emitter at waterline.
- **Materials**: `sand` for dome, `sand_wet` ring at waterline, reusing palm and hut assets.
- **Role**: Visual depth cue. Replaces what would have been a "midground parallax layer" in 2D.

### 3.11 Environment Depth Rings (replaces parallax)
Rather than 2D parallax layers, we use 3D depth rings:
- **Ring A — Foreground props** (0–30 m from camera): track walls, water, jetskis, occasional flower bushes.
- **Ring B — Midground island** (40–100 m): the small island with single hut.
- **Ring C — Side environments** (20–120 m): left sandy lagoon + stilted hut + palms; right rocky cliff + waterfalls + tiki huts + dense palms.
- **Ring D — Background silhouettes** (150–400 m): distant darker-green island silhouettes, lower saturation (multiply by `#BFE6F7` haze tint), no detail — fog-faded.
- **Ring E — Skybox** (∞): gradient dome + clouds.
- Distance fog `sky_haze` with exp² curve, near 100 m, far 500 m, density ~0.004. This desaturates Ring D and gives aerial perspective.

---

## 4. Lighting Recipe

Goal: bright sunny tropical midday — matches the warm direct light and saturated shadows in the screenshot.

### Directional Sun
- **Color**: `light_sun` (`#FFE7A8`) — warm cream.
- **Intensity**: 1.8 (in Three.js physicallyCorrectLights off mode; scale if on).
- **Angle**: elevation 55° above horizon, azimuth ~30° off camera-forward (sun slightly camera-right and ahead). This matches the screenshot where highlights hit the right side of objects and the right cliff is brighter.
- **Shadows**: PCF soft shadows on. Shadow map 2048². Shadow camera tight to a ~60 m rolling box around the player. Shadow bias -0.0005.
- **Shadow darkness**: ~0.35 — not black, warm (tint via ambient fill).

### Hemisphere Light
- **Sky color**: `light_hemi_sky` (`#BFE6F7`) — bluish fill from above.
- **Ground color**: `light_hemi_ground` (`#7BC96B`) — green bounce from foliage/water below.
- **Intensity**: 0.55.
- **Role**: Prevents shadow crush, gives foliage and rock undersides that tropical "bounce" feel.

### Ambient Light
- **Color**: `light_ambient` (`#F0E6CC`) warm cream.
- **Intensity**: 0.15. Just enough to lift pure-shadow regions.

### Rim / Fresnel (per-material, not a light)
- Player jetski: rim `#FFF4D6`, power 2.5, mix 0.30.
- Rival jetski: rim `#FFC8FA`, power 2.5, mix 0.25.
- Wall top lip: rim `#FFE3A8`, power 3.0, mix 0.45 (this is what bloom grabs onto).
- Water: rim `water_rim` `#A9F2E8`, power 4.0, mix 0.35 near wall edges.
- Foliage: no rim (already toon-lit).

### Practical notes
- No point lights in gameplay scene (cost).
- No spot lights. Sun + hemi + ambient only.
- Tone mapping: `ACESFilmic`, exposure 1.15.
- Output color space: `SRGB`.

---

## 5. Post-Processing Recipe

Goal: reproduce the glossy, punchy, slightly-HDR look of the reference screenshot. Bloom is the star.

### Bloom (critical)
- **Threshold**: 0.72 — catches the bright wall rims, sun highlights on water, rider vest tips, spray.
- **Intensity (strength)**: 1.0.
- **Radius**: 0.55 — soft, creamy falloff (not tight).
- **Smoothing**: 0.2.
- **Mip levels**: 5.
- **Targets**: full scene. Rim lights, specular hotspots, foam, and waterfalls all exceed threshold naturally — no per-material emissive cheats needed except for the boost cyan.

### Color Grading
- **Saturation**: +18% (multiply chroma by 1.18).
- **Contrast**: +10% around mid-gray 0.5.
- **Lift (shadows)**: tint +2% toward `#3A5A70` (cool shadows) — keeps darks from going muddy.
- **Gamma (mids)**: +3% toward `#FFF4D6` (warm mids) — sunny feel.
- **Gain (highlights)**: +4% toward `#FFF8E0`.
- **Temperature**: +5 (slightly warmer).
- **Tint**: -3 (slightly toward green) — boosts the turquoise.

### Vignette (optional, subtle)
- **Intensity**: 0.25.
- **Smoothness**: 0.55.
- **Color**: `#0B1626` at 60% — matches UI pill color for cohesion.
- **Purpose**: focus attention on center. Never go above 0.35 — screenshot does not have a heavy vignette.

### Anti-aliasing
- **Method**: SMAA or FXAA (cheap). Not TAA — we want crisp edges against bloom.

### Glitch (from instruction.md, stylistic only)
- **Use case**: Only on damage hit or boss-intro. Never idle.
- **Intensity**: short burst, 120 ms max.
- **Slice count**: 16.
- **Offset amplitude**: 0.015 uv.
- Do not use in gameplay frames — it would break the premium feel.

### Order of operations
1. Render scene (HDR linear)
2. Bloom pass
3. Color grading (LUT or uniform-based)
4. Vignette
5. Glitch (conditional)
6. SMAA
7. Output to canvas (sRGB)

---

## 6. Water Shader Visual Goals

Direct reproduction of the water in the reference screenshot.

### Color
- Shallow / lit: `water_shallow` `#6FE3D6`.
- Mid: `water_mid` `#2BBFC9`.
- Deep / wall-bottom shadow: `water_deep` `#0E7A9B`.
- Blend by: cross-track UV (center = shallow, edges = deep) multiplied by SSS-fake depth term. In a tube section, top of curve = shallow, bottom = deep.

### Foam Streaks
- Grayscale foam texture: long stretched noise, tileable.
- Scroll direction: along spline tangent (forward), speed = `playerSpeed * 0.8 + 0.3` u/s.
- Threshold to produce distinct streaks (`step(0.55, foamSample)`), soft-edged with `smoothstep(0.45, 0.65, foamSample)`.
- Color: `foam` `#FFFFFF` on streak, fading to `foam_soft` `#E8FAFB` on edges.
- Density boost near walls (fresnel-driven) and directly behind jetskis (from trail decal projection).

### UV Distortion (per instruction.md)
```
uv.x += sin(time + uv.y * 8.0) * 0.012
uv.y += cos(time + uv.x * 8.0) * 0.012
```
Applied to both the foam sample UV and the color-gradient sample UV. Gives the wavy shimmer seen in the screenshot.

### Fresnel Edge
- `fresnel = pow(1.0 - dot(N, V), 4.0)`.
- Multiplied by `water_rim` and added to final color with 0.35 mix.
- Creates the bright cyan halo where water meets the orange walls (visible in screenshot as the crisp bright line at the waterline).

### Specular Hotspots
- High-frequency noise raised to power 16, multiplied by `dot(N, sunDir)^32`, added as pure white.
- These exceed the bloom threshold and become the sparkles on the water surface seen in the reference.

### Final composition
```
col = mix(deep, shallow, depthMask)
col += fresnel * water_rim
col += foamMask * foam
col += sparkle * vec3(1.0)
```

---

## 7. HUD Visual Style

Matches the dark translucent pill HUD visible in the screenshot (POS 2/6, TIME, AIR TIME, Boost ring, minimap).

### Pill Container (base component)
- **Background**: `ui_pill_bg` `#0B1626` at 55% opacity.
- **Backdrop filter**: `blur(8px)` (CSS) or pre-blurred RT (canvas).
- **Stroke**: `ui_pill_stroke` `#FFFFFF` at 90% opacity, width 1.5 px.
- **Corner radius**: 18 px (very rounded — matches screenshot).
- **Padding**: 10 px vertical, 16 px horizontal.
- **Drop shadow**: `#000000` at 25%, blur 8 px, offset y +2 px.

### Typography
- **Family**: condensed bold sans — e.g. "Oswald", "Bebas Neue", or a similar tall condensed. Fallback `Impact, sans-serif`.
- **Sizes**:
  - Title/label: 12 px, letter-spacing +1, uppercase, color `#FFFFFF` at 80%.
  - Value (time, position): 28 px, color `ui_text_primary` white.
  - Accent value (AIR TIME "2.3 s"): 22 px, color `ui_text_accent_red` `#FF4A4A`.
- **Text shadow**: `#000000` at 60%, blur 4 px — keeps text readable on bright water.

### HUD Elements (mapping to screenshot)

1. **Top-left: Pause + Position pill**
   - Square rounded pause button (same pill style) with white `||` glyph.
   - Adjacent pill: label "POS" (small), value "2/6" (big). Matches screenshot exactly.

2. **Top-right: Time pill**
   - Label "TIME" (small), value "00:45.36" (big monospace-tabular).

3. **Mid-right: Air Time pill**
   - Label "AIR TIME" (small, red), value "2.3 s" (big, red `#FF4A4A`).
   - Only visible when `airborne === true`, fades in/out 150 ms.

4. **Bottom-right: Boost Ring**
   - Circular gauge, outer ring of `ui_boost_ring` ticks on `ui_boost_ring_bg`.
   - Inner label: "BOOST" white bold 16 px.
   - Active ticks glow `boost_cyan` `#5EF0FF` with bloom pickup.
   - Above boost ring: small square pill with jetski icon (power-up slot) — matches screenshot.

5. **Bottom-left: Mini-map**
   - Circular pill with the same dark translucent bg + white stroke.
   - Track shown as a snaking white line with player dot `player_green` and rival dot `rival_purple`.

### HUD Interaction States
- Press: scale 0.96, 80 ms ease-out.
- Hover (desktop): stroke opacity 100%.
- Disabled: alpha 0.4.

### HUD Anti-Patterns (do not)
- Do NOT use flat solid-color pills — must be translucent with blur.
- Do NOT use pure black or pure white at full opacity — always the tokens above.
- Do NOT add per-pill color tinting — consistency is mandatory. Only the text inside changes color.
- Do NOT render HUD through bloom — bloom applies to the world only; HUD composites after.

---

## 8. Effect Specifications

### 8.1 Water Spray (jetski rear)
- Source: rear of each jetski.
- Particles: ~40 live per jetski, `foam` + `spray_blue`, 0.5 s lifetime, shrinking alpha.
- Spawn rate scales with speed.
- Additive blend for mist, alpha blend for foam droplets.

### 8.2 Boost Trail
- Emits from exhaust when boosting.
- Particles: `boost_cyan` core, fading to `boost_white`, additive.
- Thin streaks rather than puffs — lifetime 0.35 s, speed matches player reverse velocity.
- Bloom threshold easily passed — produces glowing comet tail.

### 8.3 Wall Impact Splash
- On wall collision (if used): short foam burst, 20 particles, `foam` white, 0.4 s, outward radial.
- Screen shake 120 ms, amplitude 0.15.
- Optional glitch pass burst 80 ms.

### 8.4 Waterfall Base Burst
- Looping foam emitter at each waterfall base.
- 15 particles, 0.8 s lifetime, slight upward, `foam_soft`.

### 8.5 Speed Lines (optional, at high boost)
- Screen-space radial white lines, additive, alpha 0.25, fade in at boost > 80%, fade out instantly on release.
- Subtle — never obscure the track.

---

## 9. Silhouette & Readability Rules

- Player jetski must always be the highest-contrast element on screen. Lime green against turquoise water + orange walls gives automatic separation.
- Rival jetski must read as "different" instantly — purple is the complementary hue and works.
- Track walls must never match background. Orange against blue sky and green foliage is the maximal contrast choice.
- Obstacles (if added later) should use `ui_text_accent_yellow` `#FFD23A` accents to signal danger without clashing.
- Never place gameplay entities against a same-hue background (e.g., never a green jetski against a green palm midground — use DoF and depth rings to separate).

---

## 10. Anti-Patterns to Avoid

- **No pure `#000000` or `#FFFFFF`** in 3D gameplay surfaces. Shadows tint to `#0B1626` family, whites tint to `#FFF8E0`.
- **No flat untextured matte materials.** Every surface has at least a gradient, roughness variation, or vertex color.
- **No unlit materials for gameplay objects** except skybox and HUD. Water is the only custom-shaded exception.
- **No tight bloom** (radius < 0.3) — we want soft creamy bloom like the reference.
- **No desaturated frames.** Minimum scene-average saturation target ≈ 65%.
- **No cool/gloomy lighting.** Sun must always be warm cream, never neutral white, never blue.
- **No toon outlines drawn as post FX.** Silhouette comes from fresnel rim + bloom only.
- **No per-frame material creation.** All materials preallocated (per instruction.md performance rules).
- **No more than 12 unique materials** total in the gameplay scene.
- **No HUD element without rounded corners.** Minimum radius 12 px, preferred 18 px.
- **No text without drop shadow** over the world — readability over bright water requires it.
- **No linear animation curves.** All tweens use ease-out or ease-in-out.
- **No glitch effect in idle gameplay.** Glitch is a damage/transition accent only.
- **No fog color mismatched to sky.** Fog must be `sky_haze` so distant silhouettes blend seamlessly.

---

## 11. Reference Traceability Checklist

Every claim in this pack can be traced to `on-rails-view.png`:

| Visual claim | Evidence in screenshot |
|---|---|
| Sky is saturated tropical blue | Upper-left sky region |
| Clouds are soft white cumulus | Visible above horizon left |
| Water is turquoise with streaked foam | Entire channel, especially around player wake |
| Walls are candy orange with glossy top streak | Both left and right walls, full length |
| Player is lime green + yellow + orange-vest rider | Center foreground craft |
| Rival is purple | Mid-right smaller craft |
| Left has sandy lagoon + stilted hut + palms | Left third of frame |
| Right has rocky cliff + waterfalls + tiki huts + dense palms + red/pink flowers | Right third of frame |
| Midground island with hut | Visible between player and horizon |
| Strong bloom on wall rims and water highlights | Bright glowing edge of orange walls + water sparkles |
| Warm sunny lighting, warm highlights | Cream-colored hotspots on walls and hull |
| HUD is dark translucent pills with white stroke and blur | Top-left POS, top-right TIME, mid-right AIR TIME, bottom-right BOOST ring, bottom-left minimap |
| HUD text uses condensed bold sans with drop shadow | All HUD elements |
| AIR TIME uses red accent | Mid-right pill |

---

**End of Art Direction Pack.** Every downstream graphics agent must consult this document and cite tokens from §2 for all color decisions.
