# Normalized Game Specification
## Generated: 2026-04-11
## Source: `d:/Work/AI/on-rails/instruction.md` + `d:/Work/AI/on-rails/assets/on-rails-view.png` + context from `d:/Work/AI/on-rails/implementation.md`

> CRITICAL OVERRIDE: Target stack is **3D — Three.js + GLSL + GLB**, NOT 2D Canvas2D. All "pixel" / "sprite" terminology from the upstream plugin is translated to 3D world units, meshes, materials, and shaders. Where a 2D concept has no equivalent, the field is marked `N/A for 3D`.

---

### 1. META
- **Title**: On-Rails (working title — not explicitly stated in instruction.md; derived from folder name `on-rails` and the "on-rails hybrid" genre note)
- **Genre**: Arcade Racing / Endless On-Rails Hybrid / Water-Slide Racer
- **Sub-genre**: Tropical water-slide jetski racer, third-person, spline-driven
- **Mood**: premium, bright, tropical, high-energy, glossy
- **Art Style**: stylized PBR, saturated tropical palette (turquoise / orange / lime / magenta), strong bloom, cel-adjacent stylization with smooth shading
- **Orientation**: landscape (reference screenshot is ~3:2 landscape; mobile/arcade target)
- **Canvas / Viewport**: full-window WebGL canvas. 2D "pixel dimensions" — N/A for 3D. Reference aspect ≈ 3:2 (screenshot ≈ 600x400). Render target: full window, DPR clamped to `min(devicePixelRatio, 2)`.
- **World unit scale**: 1 unit ≈ 1 meter (implicit Three.js convention)
- **One-liner**: A premium-feel third-person jetski racer down a tropical water slide on a spline-based on-rails track, with animated shader water, bloom, a 6-racer field, boost, air-time tricks and an arcade HUD.

---

### 2. REQUIREMENTS TABLE

Type codes: `mechanic | visual | audio | ui | technical | narrative`
Priority codes: `must` (explicit) | `should` (genre-implied) | `could` (nice-to-have)
Source codes: `explicit` (user said it) | `implicit` (genre) | `inferred` (logical) | `screenshot` (from on-rails-view.png)

#### 2.1 Core mechanics (REQ-001 – REQ-099)

| ID | Category | Requirement | Source | Type | Priority |
|----|----------|-------------|--------|------|----------|
| REQ-001 | core | Game is an arcade racing / endless / on-rails hybrid | explicit (instruction.md §GAME CONCEPT) | mechanic | must |
| REQ-002 | core | Water-slide / tropical theme | explicit | visual | must |
| REQ-003 | movement | Automatic forward movement (player does not throttle) | explicit | mechanic | must |
| REQ-004 | movement | Player controls only horizontal (lateral) movement along the track | explicit | mechanic | must |
| REQ-005 | movement | Optional boost system | explicit + screenshot (BOOST button) | mechanic | must |
| REQ-006 | movement | Obstacle avoidance gameplay | explicit | mechanic | must |
| REQ-007 | track | Spline-based track built from `THREE.CatmullRomCurve3` | explicit | technical | must |
| REQ-008 | track | Track mesh generated along spline (extruded / tube) | explicit | technical | must |
| REQ-009 | track | Smooth curves | explicit | mechanic | must |
| REQ-010 | track | Vertical drops (jumps) | explicit | mechanic | must |
| REQ-011 | track | Banking (tilted turns) | explicit | mechanic | must |
| REQ-012 | track | Tube sections (enclosed trough shape) | explicit | visual | must |
| REQ-013 | player | Jetski model delivered as GLB | explicit | technical | must |
| REQ-014 | player | Player has a speed parameter | explicit | mechanic | must |
| REQ-015 | player | Player position is bound to the track (cannot leave spline domain) | explicit | mechanic | must |
| REQ-016 | player | Player controls: left / right | explicit | mechanic | must |
| REQ-017 | player | Player control: boost (optional activation) | explicit | mechanic | must |
| REQ-018 | player | Horizontal offset clamped inside track width | explicit | mechanic | must |
| REQ-019 | camera | Third-person follow camera | explicit | technical | must |
| REQ-020 | camera | Smooth lerp movement (no snapping — only interpolation) | explicit (CRITICAL) | technical | must |
| REQ-021 | camera | Slight tilt on turns (roll with banking) | explicit | visual | must |
| REQ-022 | camera | Camera always looks at player | explicit | technical | must |
| REQ-023 | racing | Multi-racer field with AI opponents | screenshot (`POS 2/6`) | mechanic | must |
| REQ-024 | racing | Total field size = 6 racers (player + 5 rivals) | screenshot (`POS 2/6`) | mechanic | must |
| REQ-025 | racing | At least one rival jetski visible ahead of player | screenshot (purple jetski in front) | mechanic | must |
| REQ-026 | racing | Player race position is tracked dynamically (here: 2nd) | screenshot | mechanic | must |
| REQ-027 | racing | Race has a running timer displayed as `MM:SS.CC` | screenshot (`TIME 00:45.36`) | mechanic | must |
| REQ-028 | racing | Air time is measured and surfaced when player is airborne | screenshot (`AIR TIME 2.3 s`) | mechanic | must |
| REQ-029 | physics | Ballistic (gravity-driven) free-flight during jumps | inferred (air time implies off-spline ballistics) | mechanic | must |
| REQ-030 | physics | Player re-attaches to spline on landing | inferred | mechanic | must |
| REQ-031 | physics | Gravity constant in world units | implicit (racing with jumps) | mechanic | must |
| REQ-032 | physics | Collision with track side walls (orange tubes) clamps lateral offset | inferred | mechanic | should |
| REQ-033 | physics | Collision / contact with rivals (pushback or nudge) | implicit (racing genre) | mechanic | should |
| REQ-034 | boost | Boost has a finite charge/meter | screenshot (arc indicator around BOOST button) | mechanic | must |
| REQ-035 | boost | Boost charge depletes while active and regenerates / is picked up | implicit | mechanic | should |
| REQ-036 | boost | Boost multiplies forward speed while active | implicit | mechanic | must |
| REQ-037 | boost | Boost activation triggers visual feedback (speed-lines / FOV push / glitch) | implicit + explicit (glitch on boost) | visual | should |
| REQ-038 | powerup | Collectible / pickup power-up item exists (bottle icon in HUD) | screenshot (bottle icon above BOOST) | mechanic | should |
| REQ-039 | powerup | Picking up a power-up refills or grants boost | inferred (bottle adjacent to BOOST UI) | mechanic | should |
| REQ-040 | ai | Rival jetskis travel along the same spline with their own `t` and lateral offset | inferred | mechanic | must |
| REQ-041 | ai | Rival AI avoids the player laterally | inferred | mechanic | should |
| REQ-042 | ai | Rival speeds include noise so overtakes happen | inferred | mechanic | should |
| REQ-043 | loop | Core loop: race along the slide → avoid obstacles → use boost → finish / lap | explicit + inferred | mechanic | must |
| REQ-044 | session | Game must have start, running, pause, finish states | inferred + screenshot (pause button) | mechanic | must |
| REQ-045 | session | Pause button in HUD halts simulation | screenshot (pause `‖` icon top-left) | ui | must |

#### 2.2 Visual requirements (REQ-100 – REQ-199)

| ID | Category | Requirement | Source | Type | Priority |
|----|----------|-------------|--------|------|----------|
| REQ-100 | render | Three.js WebGLRenderer, antialias on | explicit | technical | must |
| REQ-101 | render | sRGB output color space | inferred (premium look) | technical | must |
| REQ-102 | render | ACES Filmic tone mapping, exposure ≈ 1.1 | inferred (from implementation.md, consistent with "premium") | technical | should |
| REQ-103 | track-visual | Trough has two **orange-red** side tubes (torus-like) | screenshot | visual | must |
| REQ-104 | track-visual | Trough floor is blue/turquoise animated water | screenshot | visual | must |
| REQ-105 | track-visual | Side tubes have glossy / low-roughness material with emissive boost for bloom | inferred (bright highlights on reference) | visual | must |
| REQ-106 | water | Water shader: UV distortion `uv.x += sin(time + uv.y*freq)*amp; uv.y += cos(time + uv.x*freq)*amp;` | explicit (instruction.md §WATER SYSTEM) | visual | must |
| REQ-107 | water | Water color: turquoise | explicit | visual | must |
| REQ-108 | water | Smooth waves | explicit | visual | must |
| REQ-109 | water | Animated distortion driven by `uTime` | explicit | visual | must |
| REQ-110 | water | White foam streaks along movement direction | screenshot | visual | must |
| REQ-111 | water | Shallow → deep color gradient | inferred (stylized water) | visual | should |
| REQ-112 | water | Fresnel edge highlight for bloom response | inferred | visual | should |
| REQ-113 | water | Optional reflections | explicit (optional) | visual | could |
| REQ-114 | water | Optional foam particles | explicit (optional) | visual | could |
| REQ-115 | env | Tropical island setting | explicit | visual | must |
| REQ-116 | env | Palm trees placed along both banks | explicit + screenshot | visual | must |
| REQ-117 | env | Rocks as environment props | explicit | visual | must |
| REQ-118 | env | Vegetation (bushes, flowers) | explicit + screenshot (pink/magenta flowers right side) | visual | must |
| REQ-119 | env | Skybox (tropical sky with clouds) | explicit + screenshot | visual | must |
| REQ-120 | env | Left bank: lagoon with palms and a stilt hut (beach hut on piles) | screenshot | visual | must |
| REQ-121 | env | Right bank: tall cliff with waterfalls, tiki huts, palms, tropical flowers | screenshot | visual | must |
| REQ-122 | env | Multiple waterfalls cascading down the right-side cliff | screenshot | visual | must |
| REQ-123 | env | Background distant islands / horizon visible past left bank | screenshot | visual | should |
| REQ-124 | env | Clear tropical sky with soft clouds | screenshot | visual | must |
| REQ-125 | env | Props use `InstancedMesh` for repeated items (palms, rocks, flowers) | explicit (performance) | technical | must |
| REQ-126 | env | Stylized shading on environment | explicit | visual | must |
| REQ-127 | env | Strong saturated color palette (turquoise + orange + lime + magenta) | explicit | visual | must |
| REQ-128 | lights | Directional Light (sun), warm tone (`#fff3d6` approx), intensity ≈ 2.5 | explicit + inferred | visual | must |
| REQ-129 | lights | Hemisphere Light (sky turquoise / ground sandy), intensity ≈ 0.6 | explicit + inferred | visual | must |
| REQ-130 | lights | Ambient Light fill (weak) | explicit | visual | must |
| REQ-131 | lights | Bright tropical look with strong highlights | explicit | visual | must |
| REQ-132 | lights | Optional shadows (PCFSoftShadowMap, cascaded/followed) | explicit (optional) | visual | should |
| REQ-133 | lights | Optional ambient occlusion | explicit (optional) | visual | could |
| REQ-134 | post | Bloom on highlights (water blicks, tube rims) | explicit (CRITICAL) | visual | must |
| REQ-135 | post | Color grading: saturation ↑ | explicit | visual | must |
| REQ-136 | post | Color grading: contrast ↑ | explicit | visual | must |
| REQ-137 | post | Optional stylistic glitch effect (horizontal slice distortion) | explicit (optional) | visual | could |
| REQ-138 | post | Glitch shader: `slice = floor(uv.y*N); offset = sin(slice+time)*intensity; uv.x += offset;` | explicit | technical | could |
| REQ-139 | post | Optional vignette | inferred (premium look) | visual | could |
| REQ-140 | fx | Water splash particles behind player jetski | inferred + explicit (particles list) | visual | must |
| REQ-141 | fx | Side splash particles during hard turns | inferred | visual | should |
| REQ-142 | fx | Speed lines / radial motion effect during boost | inferred | visual | should |
| REQ-143 | fx | Splash + short glitch burst on airborne landing | inferred | visual | could |
| REQ-144 | style | Use gradients, NOT flat colors | explicit | visual | must |
| REQ-145 | style | Smooth animations with easing on camera + player | explicit | visual | must |
| REQ-146 | style | Avoid too many materials | explicit | technical | must |
| REQ-147 | style | Avoid too many textures | explicit | technical | must |
| REQ-148 | style | NEVER create shaders dynamically each frame | explicit | technical | must |
| REQ-149 | player-visual | Player jetski is green & yellow (lime body with yellow accents) | screenshot | visual | must |
| REQ-150 | player-visual | Player jetski carries a visible rider (torso, life vest) | screenshot | visual | must |
| REQ-151 | rival-visual | At least one rival jetski in purple/magenta livery | screenshot | visual | must |
| REQ-152 | rival-visual | Rival jetskis use distinct colors across the 6-racer field | inferred | visual | should |
| REQ-153 | track-visual | Side tubes rendered as continuous `TubeGeometry` along spline | inferred | technical | must |
| REQ-154 | track-visual | Foam streaks on the water floor run longitudinally and scroll with time | screenshot + inferred | visual | must |
| REQ-155 | outline | 2D sprite outline — N/A for 3D. Use emissive rim / fresnel for silhouette pop instead | translation | visual | could |

#### 2.3 Audio requirements (REQ-200 – REQ-299)

| ID | Category | Requirement | Source | Type | Priority |
|----|----------|-------------|--------|------|----------|
| REQ-200 | sfx | Jetski engine loop | implicit (racing) | audio | should |
| REQ-201 | sfx | Water rushing / splash ambient | implicit | audio | should |
| REQ-202 | sfx | Boost activation whoosh | implicit | audio | should |
| REQ-203 | sfx | Landing impact on airborne recovery | implicit | audio | could |
| REQ-204 | sfx | Power-up pickup chime | implicit | audio | could |
| REQ-205 | sfx | Pass-by / overtake doppler on rivals | implicit | audio | could |
| REQ-206 | sfx | UI click on pause / boost button | implicit | audio | could |
| REQ-207 | ambient | Tropical background loop (birds, distant surf) | implicit | audio | could |
| REQ-208 | music | Upbeat arcade racing music — style unspecified | implicit (premium arcade racer) | audio | could |
| REQ-209 | tech | Audio delivered via `THREE.Audio` / `PositionalAudio` | explicit (optional in instruction.md) | technical | could |

#### 2.4 UI / HUD requirements (REQ-300 – REQ-399)

All HUD elements below are read literally from `assets/on-rails-view.png`.

| ID | Category | Requirement | Source | Type | Priority |
|----|----------|-------------|--------|------|----------|
| REQ-300 | hud | HUD is a DOM overlay on top of the WebGL canvas | inferred (implementation.md §Stage 10) | technical | should |
| REQ-301 | hud | HUD uses dark translucent "pill" backgrounds with white border and blur | screenshot | visual | must |
| REQ-302 | hud-topleft | Pause button icon `‖` (two vertical bars) in the top-left corner | screenshot | ui | must |
| REQ-303 | hud-topleft | `POS` label + current position pill `2/6` next to pause button | screenshot | ui | must |
| REQ-304 | hud-topleft | Position format is `<current>/<total>` | screenshot | ui | must |
| REQ-305 | hud-topright | `TIME` label in top-right | screenshot | ui | must |
| REQ-306 | hud-topright | Time value literal at capture: `00:45.36` (format `MM:SS.CC`) | screenshot | ui | must |
| REQ-307 | hud-topright | Below TIME: orange-tinted `AIR TIME` pill | screenshot | ui | must |
| REQ-308 | hud-topright | Air time literal at capture: `2.3 s` (format `<seconds>.<deci> s`) | screenshot | ui | must |
| REQ-309 | hud-topright | AIR TIME pill is only shown while player is airborne (otherwise hidden) | inferred | ui | should |
| REQ-310 | hud-bottomleft | Circular mini-map showing a top-down projection of the spline | screenshot | ui | must |
| REQ-311 | hud-bottomleft | Mini-map displays a white curving path representing the track | screenshot | visual | must |
| REQ-312 | hud-bottomleft | Mini-map displays the player as a colored dot on the path | screenshot | ui | must |
| REQ-313 | hud-bottomleft | Mini-map displays rivals as additional dots | inferred | ui | should |
| REQ-314 | hud-bottomright | Circular power-up slot with a bottle icon (boost pickup) | screenshot | ui | must |
| REQ-315 | hud-bottomright | Large circular `BOOST` button with label text inside | screenshot | ui | must |
| REQ-316 | hud-bottomright | BOOST button has a circular arc / tick-marked progress ring indicating boost charge | screenshot | ui | must |
| REQ-317 | hud-bottomright | BOOST charge ring drains while boost is active and fills while charging | inferred | ui | should |
| REQ-318 | hud | HUD typography: bold white sans-serif with subtle stroke / glow | screenshot | visual | must |
| REQ-319 | hud | HUD listens to an `EventBus` for `time`, `position`, `boostCharge`, `airTime`, `playerT`, `rivalsT` | inferred (implementation.md) | technical | should |
| REQ-320 | hud | HUD must be legible on landscape mobile aspect ratios | inferred | ui | should |
| REQ-321 | hud | BOOST button and pause button respond to touch input on mobile | inferred | ui | should |
| REQ-322 | hud | Pause button toggles a paused state (freezes simulation + dims scene) | inferred | ui | should |

#### 2.5 Technical constraints (REQ-400 – REQ-499)

| ID | Category | Requirement | Source | Type | Priority |
|----|----------|-------------|--------|------|----------|
| REQ-400 | tech | Runs in a web browser (HTML + JS) | explicit | technical | must |
| REQ-401 | tech | Uses Three.js (WebGL renderer) | explicit | technical | must |
| REQ-402 | tech | Uses GLSL shaders (water, glitch) | explicit | technical | must |
| REQ-403 | tech | Uses GLTF/GLB models | explicit | technical | must |
| REQ-404 | tech | TypeScript source, Vite bundler (implementation baseline) | inferred (implementation.md) | technical | should |
| REQ-405 | tech | React Three Fiber is OPTIONAL, not required | explicit | technical | could |
| REQ-406 | tech | Engine responsibilities: init renderer, init scene, init camera, start loop | explicit | technical | must |
| REQ-407 | tech | Game loop has `update()` (player, camera, world, shaders) then `render()` (scene + post) | explicit | technical | must |
| REQ-408 | tech | Target 60 FPS on a mid-range laptop | inferred + implementation.md | technical | must |
| REQ-409 | tech | Instancing for trees, rocks, props | explicit | technical | must |
| REQ-410 | tech | Reuse materials across instances | explicit | technical | must |
| REQ-411 | tech | Limit draw calls | explicit | technical | must |
| REQ-412 | tech | Use texture atlases | explicit | technical | must |
| REQ-413 | tech | Avoid unnecessary shaders | explicit | technical | must |
| REQ-414 | tech | Do NOT create materials/geometries inside `update()` | explicit + inferred | technical | must |
| REQ-415 | tech | DPR cap `min(devicePixelRatio, 2)` | inferred | technical | should |
| REQ-416 | tech | Shadow camera follows player (scoped shadow volume) | inferred | technical | could |
| REQ-417 | tech | Frustum culling + windowed prop streaming around player | inferred | technical | should |
| REQ-418 | tech | Code is modular and scalable per `instruction.md` folder tree | explicit | technical | must |
| REQ-419 | tech | Structure: `core/`, `graphics/`, `world/`, `entities/`, `effects/`, `shaders/`, `assets/`, `loaders/`, `config/`, `utils/`, `main.ts`, `App.ts` | explicit | technical | must |
| REQ-420 | tech | Output must NOT be a prototype — production-quality, clean, extensible | explicit | technical | must |
| REQ-421 | tech | Textures required per material: albedo, normal, roughness | explicit | technical | must |
| REQ-422 | tech | Single HTML entry point (`index.html`) — "single HTML file, no external deps" from plugin default does NOT apply (Vite + npm modules are used) | translation | technical | should |
| REQ-423 | tech | Must work when served via `vite dev` / static host (not required to work on `file://`) | translation | technical | should |
| REQ-424 | tech | Deterministic seed for prop placement so layout is stable across runs | inferred (implementation.md) | technical | should |
| REQ-425 | tech | No per-frame allocations in hot path | inferred | technical | should |
| REQ-426 | tech | Responsive resize handler (window resize → renderer + camera aspect) | inferred | technical | must |

#### 2.6 Special / unique (REQ-500+)

| ID | Category | Requirement | Source | Type | Priority |
|----|----------|-------------|--------|------|----------|
| REQ-500 | fidelity | Final image must visually match `assets/on-rails-view.png` (reference checklist below) | explicit (implementation.md reference-analysis) | visual | must |
| REQ-501 | fidelity | Pipeline order: Bloom → Color Grading (saturation + contrast) → optional Glitch → optional Vignette | explicit | technical | must |
| REQ-502 | mvp | MVP plan spans 7 days (scene+cam, movement, spline, env, water+lights, post, polish) | explicit | narrative | should |
| REQ-503 | feel | "Smooth and responsive" feel across camera, player, and HUD | explicit | mechanic | must |
| REQ-504 | feel | "Premium mobile/arcade racing" quality bar | explicit | narrative | must |

---

### 3. ENTITIES

3D translations:
- `Size` → bounding box in **world units (meters)**
- `Colors` → hex of base/emissive material tints
- `HP` → hit points if applicable, else N/A
- `Speed` → forward speed along spline in units/second, or movement parameters
- `Behavior` → high-level gameplay/AI description

| ID | Name | Size (world units) | Colors | HP | Speed | Behavior | Source |
|----|------|--------------------|--------|-----|-------|----------|--------|
| E001 | Player Jetski | ≈ 2.4L × 1.0W × 1.1H | body `#9BE03A` lime + accents `#F7E02C` yellow + dark hull `#1A1A1A` | N/A (1 life per run) | base ≈ 35 u/s, boost ≈ 55 u/s (TBD) | Auto-advances along spline; lateral offset −1..+1 smooth-damped by input; tilts on banking; detaches to ballistic on steep drops | explicit + screenshot |
| E002 | Player Rider | ≈ 0.6 × 0.6 × 1.0 (torso visible) | skin tone + dark wetsuit + orange/red life-vest | N/A | follows jetski | Parented to jetski mesh, torso bob animation optional | screenshot |
| E003 | Rival Jetski A (Purple) | same as E001 | body `#6A3FD4` purple/magenta + white accents | N/A | similar to player, ±5-15% jitter | Own `t` and lateral offset; lane-avoidance AI; visible ahead of player in capture | screenshot |
| E004 | Rival Jetski B | same as E001 | distinct color (e.g. cyan `#2AD1C7`) | N/A | jittered | Racing AI | inferred |
| E005 | Rival Jetski C | same as E001 | distinct color (e.g. red `#E4412C`) | N/A | jittered | Racing AI | inferred |
| E006 | Rival Jetski D | same as E001 | distinct color (e.g. yellow `#F2C20A`) | N/A | jittered | Racing AI | inferred |
| E007 | Rival Jetski E | same as E001 | distinct color (e.g. orange `#FF7A1F`) | N/A | jittered | Racing AI | inferred |
| E008 | Track Floor (Water surface) | width ≈ 8 u, length = spline length | shallow `#5FE4D8`, deep `#0E6CA6`, foam `#FFFFFF` | — | static | `ShaderMaterial` (water.glsl), animated via `uTime`, scrolls foam streaks | explicit + screenshot |
| E009 | Track Side Tube Left | radius ≈ 0.9 u, length = spline length | base `#FF5A1C`, emissive `#FF8A3A` low, roughness ≈ 0.25 | — | static | `TubeGeometry` along CatmullRomCurve3 offset by half-width on binormal; bloom-friendly | screenshot |
| E010 | Track Side Tube Right | same as E009 | same | — | static | same, mirrored | screenshot |
| E011 | Spline Curve | — | — | — | — | Logical `CatmullRomCurve3` driving positions for player/AI/camera; exposes `getPointAt`, `getTangentAt`, `getFrameAt` | explicit |
| E012 | Skybox | enclosing sphere / cube | sky `#7CC7FF` → `#D8F2FF`, clouds `#FFFFFF` | — | static | CubeTexture or `Sky` shader, tropical | explicit + screenshot |
| E013 | Distant Islands | very large, background | greens `#2F7D3E` + beach `#F4E3B2` | — | parallax / static | Low-poly far mesh, fog blend | screenshot |
| E014 | Palm Tree | ≈ 4-8 u tall | trunk `#7A4A22`, fronds `#2FAE3A` to `#8BD94A` | — | static | `InstancedMesh`, seeded scatter, per-instance scale/rot jitter | explicit + screenshot |
| E015 | Rock | ≈ 1-3 u | grey `#7E8280`, moss `#3E7A3A` accents | — | static | `InstancedMesh` | explicit |
| E016 | Flower Bush | ≈ 0.6-1.2 u | magenta `#E83A9A`, pink `#F7A8D0`, lime `#9BE03A` | — | static | `InstancedMesh`, right-bank emphasis | screenshot |
| E017 | Tiki Hut (cliff) | ≈ 3-5 u | thatch `#C8842A`, wood `#7A4A22` | — | static | GLB prop on right cliff | screenshot |
| E018 | Stilt Beach Hut (lagoon) | ≈ 4 u | wood `#7A4A22`, thatch `#C8842A` | — | static | GLB prop on left lagoon with pylons into water | screenshot |
| E019 | Waterfall (right cliff) | vertical plane ≈ 3-8 u tall | turquoise `#6FE7D4`, white foam `#FFFFFF` | — | animated | Reuses water shader with vertical UV scroll; foam plane at base | screenshot |
| E020 | Lagoon Water (left side) | large plane | turquoise `#39C9BE` | — | animated | Same water shader, slower time scale | screenshot |
| E021 | Background Cloud Layer | skybox-bound | white `#FFFFFF` | — | slow drift (optional) | Part of skybox | screenshot |
| E022 | Player Wake Particles | tiny | white `#FFFFFF` | — | 0.3-0.6 s life | `Points` with shader, spawn behind player | inferred |
| E023 | Splash Particles (landing / side) | tiny | white `#FFFFFF` | — | short life | Burst on turn / landing | inferred |
| E024 | Speed Lines Effect | screen-space | white `#FFFFFF` transparent | — | while boost active | Radial sprites or post pass | inferred |
| E025 | Boost Pickup (bottle) | ≈ 0.6 u | blue `#2A9BE7` bottle + white label | — | static along track | Collectible; grants boost charge on contact | screenshot |
| E026 | Obstacle (generic) | TBD | TBD | — | static | Avoidable hazard along slide (rocks, logs, barrels) — content TBD | implicit (obstacle avoidance REQ-006) |
| E027 | Sun Directional Light | — | warm `#FFF3D6`, intensity ≈ 2.5 | — | — | Casts shadows from above-side angle | explicit |
| E028 | Hemisphere Light | — | sky `#7CC7FF` / ground `#E8D9A8`, intensity ≈ 0.6 | — | — | Tropical sky fill | explicit |
| E029 | Ambient Light | — | `#FFFFFF` low intensity | — | — | Base fill | explicit |
| E030 | Pause Button (HUD) | DOM — N/A for 3D | bg `rgba(12,18,28,0.55)`, stroke `#FFFFFF`, icon `#FFFFFF` | — | — | Click/tap → pause state | screenshot |
| E031 | Position Pill (HUD) | DOM | same pill style, text `#FFFFFF` | — | — | Shows `POS 2/6` | screenshot |
| E032 | Time Readout (HUD) | DOM | text `#FFFFFF` | — | — | Shows `TIME 00:45.36` | screenshot |
| E033 | Air Time Pill (HUD) | DOM | orange tint `#FF7A1F` text, dark pill bg | — | — | Shows `AIR TIME 2.3 s` only when airborne | screenshot |
| E034 | Mini-Map Widget (HUD) | DOM / SVG | bg `rgba(12,18,28,0.55)`, path `#FFFFFF`, player dot `#9BE03A`, rival dots per-color | — | — | Top-down spline projection with live dots | screenshot |
| E035 | Power-up Slot (HUD) | DOM | pill bg, bottle icon `#2A9BE7` | — | — | Shows held pickup | screenshot |
| E036 | Boost Button Widget (HUD) | DOM / SVG | bg `rgba(12,18,28,0.55)`, ring `#FFFFFF` ticks, label `BOOST` `#FFFFFF` | — | — | Tap/space to boost; ring shows charge via `stroke-dasharray` | screenshot |

---

### 4. INTERACTIONS MATRIX

| Actor | Target | Interaction | Result | Source |
|-------|--------|-------------|--------|--------|
| Player (keyboard `A` / `←`) | Player Jetski | hold | Lateral offset target ← −1 (left); smooth-damped | explicit |
| Player (keyboard `D` / `→`) | Player Jetski | hold | Lateral offset target ← +1 (right); smooth-damped | explicit |
| Player (keyboard `Space` / BOOST button tap) | Player Jetski | press | If boost charge > 0 → enter boosting state, speed *= multiplier, FX on | explicit + screenshot |
| Player (pause button / `P` / `Esc`) | Game State | press | Toggle paused state | screenshot + inferred |
| Game Loop (automatic) | Player Jetski | every tick | `t += speed * dt / curveLength` along spline | explicit |
| Player Jetski | Side Tube (E009/E010) | lateral overflow | Lateral offset is clamped; soft visual bounce | inferred |
| Player Jetski | Rival Jetski | collision | Pushback / nudge + speed penalty (genre default) | implicit |
| Player Jetski | Boost Pickup (E025) | proximity contact | Pickup consumed, boost meter refilled, pickup chime | inferred |
| Player Jetski | Steep downhill segment | auto | Detach to ballistic (airborne) state; air timer starts | inferred (REQ-028) |
| Player Jetski (airborne) | Spline surface | re-contact | Reattach to curve; splash FX; short glitch burst | inferred |
| Rival Jetski | Spline | every tick | `t` advances with speed + jitter | inferred |
| Rival Jetski | Player Jetski | proximity | Adjust lateral offset to avoid | inferred |
| Camera | Player Jetski | every tick | Smooth lerp to follow-offset position; lookAt player; roll by track banking | explicit |
| Water Shader | Scene | every tick | `uTime += dt` → animates waves and foam scroll | explicit |
| GameLoop | HUD (EventBus) | every tick | Emits `time`, `position`, `boostCharge`, `airTime`, `playerT`, `rivalsT` | inferred |
| HUD MiniMap | Spline | on update | Projects current `playerT` and `rivalsT` onto SVG path | inferred |
| HUD Boost Ring | Boost Charge | on update | Updates `stroke-dasharray` to reflect fraction 0..1 | inferred |
| Boost State | Post Composer | on enter | Optional glitch effect pass enabled briefly; speed lines overlay on | inferred |
| Window Resize | Renderer + Camera | on resize | Renderer size + camera aspect updated | inferred |
| Track Spline | Player / Camera / AI | query | `getPointAt(t)`, `getTangentAt(t)`, `getFrameAt(t)` return positions + frames | explicit |

---

### 5. STATE MACHINE

| State | Transitions To | Trigger |
|-------|---------------|---------|
| boot | loading | auto after engine init |
| loading | menu | all assets (GLB + textures + skybox) loaded |
| menu | playing | "Play" button click / tap |
| playing | paused | pause button / `P` key / `Esc` / tab hidden |
| playing | airborne | player enters steep drop section + high velocity downward tangent |
| airborne | playing | player mesh re-contacts spline surface |
| playing | finished | player `t` reaches curve end (or lap count met) |
| paused | playing | "Continue" button |
| paused | menu | "Menu" button |
| finished | menu | "Menu" button |
| finished | playing | "Retry" button |

Sub-state flag (orthogonal to `playing` / `airborne`):
| Flag | Set by | Cleared by |
|------|--------|-----------|
| `boosting` | boost input + charge > 0 | charge = 0 OR input released |

---

### 6. VISUAL SPEC

- **Background**:
  - Tropical sky cube / procedural Sky — blue gradient `#7CC7FF → #D8F2FF` with soft white clouds
  - Far fog (turquoise tint `#7FD8D0`) for depth
  - Distant islands on the horizon with palm silhouettes
- **Track**:
  - Floor: animated turquoise water, shallow `#5FE4D8` → deep `#0E6CA6`, white foam streaks scrolling forward, fresnel edge glow
  - Side walls: two continuous orange-red tubes (`#FF5A1C`) with slight emissive, low roughness, bloom-friendly highlights
  - Track width: ≈ 8 u (tunable)
- **Player Jetski**:
  - Lime green body `#9BE03A` with yellow `#F7E02C` accents, black seat `#1A1A1A`
  - Rider with orange/red life vest, dark wetsuit
  - Subtle tilt on lateral movement (roll proportional to lateral velocity)
  - Wake particles trailing behind
- **Rival Jetskis**:
  - Distinct colors per slot — purple (confirmed from reference), plus cyan, red, yellow, orange
  - Same mesh as player with per-instance material tint
- **Environment**:
  - Left bank: lagoon island, palms (`InstancedMesh`), stilt beach hut
  - Right bank: tall rocky cliff, multiple waterfalls, tiki huts, palms, tropical flowers (magenta + pink)
  - Instanced palms/rocks/flowers scattered with seeded noise
- **Lighting**:
  - Warm sun directional `#FFF3D6` @ 2.5 from top-side, soft PCF shadows
  - Hemisphere sky/ground `#7CC7FF / #E8D9A8` @ 0.6
  - Low ambient fill
- **Effects**:
  - Bloom (threshold ≈ 0.7, intensity ≈ 1.2, radius ≈ 0.6)
  - Hue/Saturation +0.25, Brightness/Contrast +0.15, subtle vignette
  - Optional horizontal-slice glitch on boost / crash
  - Water shader: sin/cos UV distortion + foam streak pattern
  - Particles: jetski wake, side splashes, landing burst, boost speed lines
- **UI / HUD** (positions refer to the reference screenshot):
  - Top-left corner: pause button `‖` + pill `POS 2/6`
  - Top-right corner: `TIME 00:45.36` above an orange-tinted pill `AIR TIME 2.3 s`
  - Bottom-left corner: circular mini-map with white curving path, player and rival dots
  - Bottom-right corner: circular power-up slot (bottle icon) stacked above a large circular `BOOST` button with tick-marked charge ring
  - Pill style: dark translucent `rgba(12,18,28,0.55)` background with white 1-2px border and optional backdrop blur
  - Typography: bold white sans-serif
- **Outline** (2D plugin default of "N px outline on all game objects"): **N/A for 3D.** Substitute: optional emissive rim / fresnel on player + rivals + side tubes to achieve silhouette pop.

---

### 7. AUDIO SPEC

- **SFX**:
  - Jetski engine loop (pitched by speed)
  - Water rushing loop
  - Boost whoosh
  - Landing splash impact
  - Pickup chime
  - Rival pass-by doppler
  - UI clicks (pause / boost)
- **Ambient**: tropical island ambience — birds, distant surf, wind (loopable)
- **Music**: upbeat arcade / tropical electronic (style unspecified in source — flagged ambiguity). If not authored, leave music off.
- **Tech**: all audio optional; if present, use `THREE.Audio` / `THREE.PositionalAudio`.

---

### 8. PROGRESSION

- **Difficulty curve**: not specified. Reasonable default — track difficulty rises along length: smoother opening, then tighter banks, more obstacles, steeper drops toward the finish. (Ambiguity A4.)
- **Scoring**: not specified. Implicit racer scoring = final position (1/6 to 6/6) and lap time. Optional points: boost-pickups collected, total air time, obstacles avoided.
- **Persistence**: not specified. Reasonable default (localStorage): best lap time, best finishing position, settings (sound on/off, graphics tier). (Ambiguity A5.)
- **Race length**: not specified. Default — single spline, finite, ~60-90 seconds nominal at base speed. (Ambiguity A6.)

---

### 9. TECHNICAL CONSTRAINTS

- Three.js + GLSL + GLB is **mandatory**.
- TypeScript + Vite is the intended build toolchain (from implementation.md context).
- Target 60 FPS on a mid-range laptop.
- Canvas is the full browser window (no fixed pixel size).
- DPR capped at `min(devicePixelRatio, 2)`.
- Folder tree MUST follow `instruction.md §PROJECT ARCHITECTURE` — `src/core`, `src/graphics`, `src/world`, `src/entities/Player`, `src/effects/postprocessing`, `src/shaders`, `src/assets`, `src/loaders`, `src/config`, `src/utils`, `main.ts`, `App.ts`.
- Engine lifecycle: init renderer → init scene → init camera → start loop.
- Game loop order: `update(player → camera → world → shaders)` then `render(composer)`.
- Instancing mandatory for repeating props.
- Materials must be reused; shaders must not be compiled per-frame.
- No per-frame allocations in hot path; no material/geometry creation inside `update()`.
- Must work when served via `vite dev` or a static host. "Single HTML file, no external deps" (from the plugin default) **does not apply** — the project uses npm modules.
- Must NOT ship as a prototype — code must be modular, clean, and extensible for a production-quality result.

---

### 10. FEATURE FLAGS

```json
{
  "is3D": true,
  "is2D": false,
  "engine": "three",
  "usesGLSLShaders": true,
  "usesGLBAssets": true,
  "usesPostProcessing": true,
  "usesBloom": true,
  "usesColorGrading": true,
  "usesGlitchEffect": true,
  "usesInstancing": true,
  "usesSplineTrack": true,
  "usesCatmullRomCurve3": true,
  "usesTubeGeometry": true,
  "usesCustomWaterShader": true,
  "usesSkybox": true,
  "usesHemisphereLight": true,
  "usesDirectionalLight": true,
  "usesAmbientLight": true,
  "usesShadows": true,
  "usesAmbientOcclusion": false,
  "usesReflections": false,
  "usesFoamParticles": true,
  "usesWakeParticles": true,
  "usesSpeedLines": true,
  "hasBoost": true,
  "hasBoostCharge": true,
  "hasPowerUpPickup": true,
  "hasAirTime": true,
  "hasMiniMap": true,
  "hasPause": true,
  "hasLap": false,
  "hasMultipleAI": true,
  "aiCount": 5,
  "totalRacers": 6,
  "hasPlayerHealth": false,
  "hasScore": false,
  "hasTimer": true,
  "hasFinishLine": true,
  "hasRetry": true,
  "hasMenu": true,
  "hudLayer": "DOM",
  "targetFps": 60,
  "orientation": "landscape",
  "platform": ["desktop", "mobile"],
  "controls": {
    "keyboard": ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyP", "Escape"],
    "touch": ["swipe-steer", "boost-button", "pause-button"]
  },
  "bundler": "vite",
  "language": "typescript",
  "framework": "three",
  "optionalReactThreeFiber": true,
  "singleHtmlFile": false,
  "worksOnFileProtocol": false
}
```

---

### 11. AMBIGUITIES

| # | Question | Default if unanswered |
|---|----------|----------------------|
| A1 | Exact number of rivals — screenshot shows `POS 2/6` but instruction.md does not state field size explicitly. Is 6 fixed? | Yes, fix at 6 racers (1 player + 5 AI) |
| A2 | Is the track a single finite slide, endless procedural, or a looping circuit? Instruction.md says "Endless / On-rails hybrid" but reference has a linear slide with a start/finish feel. | Finite authored spline; replayable with "Retry" |
| A3 | Is lap count > 1? | 1 lap (single run) |
| A4 | Difficulty curve definition (obstacle density, rival aggression over time) | Linear ramp: easier first third, hardest final third |
| A5 | What persists to localStorage? | Best time, best finishing position, audio/graphics settings |
| A6 | Target race length in seconds | ≈ 75 seconds at base speed |
| A7 | What obstacles exist on-track? Only instruction.md mentions "obstacle avoidance" — content list is missing. | Rocks, floating logs, barrels as instanced GLB props placed via seeded scatter |
| A8 | Does boost deplete over time or require pickups? | Both: slow passive regen + faster refill on bottle pickup |
| A9 | Boost multiplier magnitude | ×1.6 forward speed while active |
| A10 | Air time — purely cosmetic or does it score/award boost? | Cosmetic display; awards small boost charge on landing |
| A11 | Do rival collisions damage the player or only nudge? | Soft nudge + brief speed penalty, no health system |
| A12 | Is there a health / damage system at all? | No — failure = finishing last / out of time |
| A13 | Is there a timer-based failure (e.g. checkpoint time)? | No hard fail; race ends when player reaches finish |
| A14 | Music style / licensing | No music until specified — SFX only |
| A15 | Target devices (desktop primary? mobile primary?) | Both; landscape layout mandatory |
| A16 | Glitch effect — always on low intensity, or only on boost / crash? | Only on boost activation and hard landings |
| A17 | Shadows on all props or player-only? | Player + near track only (followed shadow camera) |
| A18 | Exact track width, banking angles, drop heights | Track width 8 u, max banking 35°, drops 3-6 u |
| A19 | Are power-up bottle types varied (boost / shield / magnet)? | Single type = boost refill |
| A20 | Localization of HUD strings (`POS`, `TIME`, `AIR TIME`, `BOOST`) | English only |
| A21 | Pause behaviour (freeze simulation + show menu, or just freeze?) | Freeze + show pause menu overlay with Continue / Restart / Menu |
| A22 | Who is the rider model? Fixed character or customizable? | Fixed (single rider model) |
| A23 | Title / branding text | "On-Rails" as working title until specified |

---

### 12. PROMPT DETAILS (exact quotes)

From `instruction.md`:
- "The result must feel like a premium mobile/arcade racing game."
- "Arcade Racing"
- "Endless / On-rails hybrid"
- "Water slide / tropical theme"
- "automatic forward movement"
- "player controls horizontal movement"
- "optional boost system"
- "obstacle avoidance"
- "Three.js (WebGL renderer)"
- "GLSL shaders"
- "GLTF/GLB models"
- "React Three Fiber (if using React)" (optional)
- "initialize renderer", "initialize scene", "initialize camera", "start game loop"
- "update player / update camera / update world / update shaders"
- "render scene with postprocessing"
- "third-person follow camera"
- "smooth lerp movement"
- "slight tilt on turns"
- "always look at player"
- "NO snapping (only smooth interpolation)"
- "jet ski model (GLB)"
- "speed parameter"
- "position bound to track"
- "left / right movement"
- "boost (optional)"
- "forward movement is automatic"
- "horizontal offset inside track"
- "CatmullRomCurve3"
- "generate mesh along spline"
- "smooth curves", "vertical drops", "banking (tilted turns)", "tube sections"
- "tropical island", "palm trees", "rocks", "vegetation", "skybox"
- "instancing for repeated objects", "stylized shading", "strong color palette"
- "uv.x += sin(time + uv.y * frequency) * amplitude"
- "uv.y += cos(time + uv.x * frequency) * amplitude"
- "turquoise color", "smooth waves", "animated distortion"
- "reflections" (optional), "foam particles" (optional)
- "Directional Light (sun)", "Ambient Light", "Hemisphere Light"
- "shadows" (optional), "ambient occlusion" (optional)
- "bright tropical look", "strong highlights"
- "POST-PROCESSING (CRITICAL)"
- "Bloom — glow on highlights"
- "Color Grading — increase saturation / adjust contrast"
- "Glitch Effect (optional stylistic)"
- "slice = floor(uv.y * N)", "offset = sin(slice + time) * intensity", "uv.x += offset"
- "horizontal distortion", "screen slicing", "dynamic shifts"
- "use gradients (not flat colors)"
- "bright tropical palette (turquoise, green, orange)"
- "particles (water splash, speed effects)"
- "smooth animations with easing"
- "too many materials" (do not)
- "too many textures" (do not)
- "dynamic shader creation per frame" (do not)
- "jet ski (player)", "track segments", "environment props"
- "GLB"
- "albedo", "normal", "roughness"
- "use instancing (trees, props)", "reuse materials", "limit draw calls", "use texture atlases", "avoid unnecessary shaders"
- "Day 1: scene + camera / player (simple mesh)"
- "Day 2: movement system"
- "Day 3: spline track"
- "Day 4: environment"
- "Day 5: water + lighting"
- "Day 6: post-processing"
- "Day 7: polish"
- "run in browser (HTML + JS)"
- "use Three.js"
- "be modular and scalable"
- "look visually polished"
- "feel smooth and responsive"
- "The output must NOT be a prototype."
- "It must be structured, clean, and extensible."

From `assets/on-rails-view.png` (literal HUD strings and visual observations):
- "POS" / "2/6" (top-left, pill below a pause `‖` icon)
- "TIME" / "00:45.36" (top-right)
- "AIR TIME" / "2.3 s" (orange pill, top-right under TIME)
- "BOOST" (bottom-right, inside large circular button with tick-mark ring)
- Pause icon `‖` (top-left)
- Bottle icon (blue, bottom-right above BOOST — boost pickup)
- Mini-map circular widget (bottom-left) with white curved path
- Two orange-red side tubes forming the slide
- Turquoise water with white foam streaks on the slide floor
- Green/yellow player jetski with rider (center)
- Purple rival jetski ahead
- Left bank: lagoon with palms and stilt hut
- Right bank: rocky cliff with multiple waterfalls, tiki huts, palms, pink/magenta tropical flowers
- Clear tropical sky with soft white clouds
- Background distant islands on the horizon

---

### 13. REFERENCE FIDELITY CHECKLIST (must all be satisfied)

- [ ] Orange-red side tubes with gloss / bloom highlights
- [ ] Turquoise animated water floor with white foam streaks
- [ ] Green-yellow player jetski, rider with life vest, third-person rear-high camera
- [ ] At least one purple rival jetski ahead of the player
- [ ] Left bank: lagoon, palms, stilt beach hut
- [ ] Right bank: cliff with waterfalls, tiki huts, palms, magenta flowers
- [ ] Clear tropical sky with clouds, background islands
- [ ] Strong bloom, high saturation, high contrast
- [ ] HUD: pause + POS 2/6 (top-left), TIME 00:45.36 + AIR TIME 2.3 s (top-right), mini-map (bottom-left), power-up bottle + BOOST ring button (bottom-right)
- [ ] 60 FPS, no camera snaps, only smooth interpolation

