// Centralized numeric configuration. Source: spec/literal_values_registry.json (LIT-*)
// and spec/art_direction_pack.md recipes. No module outside @/config may introduce its own literals.

export const CFG = {
  render: {
    antialias: true,           // LIT-RENDER-001 — passed through to composer MSAA, not renderer
    toneMappingExposure: 0.9,  // lower exposure = less washed out
    shadowMapEnabled: false,   // was LIT-RENDER-005 (disabled for composer compatibility)
    dprCap: 2,                 // LIT-DIM-004
  },
  camera: {
    fov: 58,                   // LIT-DIM-001
    near: 0.1,
    far: 3000,
    followOffset: [0, 2.2, 4.5] as [number, number, number],
    lookaheadT: 0.012,
    lookTargetLift: 0.3,
    lerpAlphaPos: 0.26,
    lerpAlphaRot: 0.28,
    boostFov: 76,              // wider FOV push for speed feel
    boostFovRamp: 0.25,
    steerRollDeg: 6,           // camera roll into turns (degrees)
  },
  track: {
    segments: 1400,
    width: 30,                 // wide channel fills the screen
    wallHeight: 1.8,           // height of the shaped wall profile above water level
    length: 2000,              // ~ level pack §1
    baseSpeed: 16.7,           // level pack §1 — u/s
  },
  player: {
    seedPosition: 2,           // LIT-GAME-005
    lateralOffsetRange: [-1, 1] as [number, number], // LIT-GAME-007
    lateralMax: 0.9,           // keeps player off the tube walls at ±1
    lateralDampCoef: 10,
    leanMaxDeg: 12,
    detachThreshold: -0.05,    // tangent.y threshold to go airborne
    detachMinSpeed: 10,
    baseSpeedMul: 1.5,         // player cruising speed relative to CFG.track.baseSpeed
    boostMultiplier: 1.55,
    boostRampUp: 0.5,
    boostRampDown: 0.4,
    boostDrainRate: 0,         // infinite boost — no drain
    boostRegen: 999,           // instant refill if somehow drained
  },
  race: {
    totalRacers: 6,            // LIT-GAME-001
    aiRivalCount: 5,           // LIT-GAME-002
    minVisibleRivals: 1,       // LIT-GAME-004
  },
  rivals: {
    leaderSpeedMul: 1.08,
    tailSpeedMul: 0.92,
    midSpeedMul: 1.0,
    avoidDist: 0.35,           // lateral units
    trafficJamRadius: 40,      // around boost pickups
    colors: ['rival_purple', 'rival_red', 'rival_blue', 'rival_yellow', 'rival_turquoise'] as const,
    // Level pack §5 — first 40 u. NOTE: the pack's own table is self-contradictory:
    // it labels the player as seedPosition=2 but lists Mid-pack A at t=0.010 which
    // would put the player 3rd. We resolve in favour of the REQ/LIT (POS 2/6 hard
    // requirement) and shift Mid-A behind the player so only the purple Leader is
    // ahead at race start.
    starts: [
      { role: 'leader', color: 'rival_purple',    t: 0.0200, lateral: +0.20, speedMul: 1.08 },
      { role: 'mid_a',  color: 'rival_red',       t: 0.0070, lateral: -0.45, speedMul: 1.00 },
      { role: 'mid_b',  color: 'rival_blue',      t: 0.0050, lateral: +0.55, speedMul: 1.00 },
      { role: 'mid_c',  color: 'rival_yellow',    t: 0.0030, lateral: -0.20, speedMul: 0.98 },
      { role: 'tail',   color: 'rival_turquoise', t: 0.0000, lateral: +0.30, speedMul: 0.92 },
    ] as const,
    playerStartT: 0.0090,
  },
  water: {
    frequency: 8.0,            // LIT-WATER-001/002
    amplitude: 0.012,          // art pack §6
    foamScroll: 0.8,
    foamThreshold: 0.55,
  },
  bloom: {
    enabled: true,             // LIT-PP-001
    threshold: 0.78,           // raised — only brightest highlights bloom, less washout
    intensity: 0.9,            // toned down bloom
    radius: 0.6,               // soft creamy spread
    smoothing: 0.2,
  },
  grading: {
    saturation: 0.32,          // vivid tropical colors
    contrast: 0.22,            // higher contrast — deeper shadows, brighter highlights
    vignetteDarkness: 0.3,     // focus attention on center
  },
  lighting: {
    directionalColor: 'light_sun',       // LIT-LIGHT-002
    directionalIntensity: 2.0,           // softer sun
    hemisphereSkyColor: 'light_hemi_sky',
    hemisphereGroundColor: 'light_hemi_ground',
    hemisphereIntensity: 0.65,           // LIT-LIGHT-003
    ambientColor: 'light_ambient',
    ambientIntensity: 0.18,              // lower ambient = deeper shadows = more contrast
    shadowMapSize: 2048,
    shadowBias: -0.0005,
  },
  particles: {
    waterTrailLifetimeMinMs: 400, // slightly longer for visible trail
    waterTrailLifetimeMaxMs: 800,
    waterTrailPoolSize: 256,
    splashPoolSize: 48,
    speedLinesPoolSize: 64,
  },
  physics: {
    gravity: 22,               // u/s^2 — level pack §7 canyon plunge tuning
    airMinForHudS: 0.3,        // gameplay blueprint §4
    landingShake: 0.18,
  },
  feel: {
    glitchOnHitMs: 120,
    glitchOnBoostMs: 200,
    landingShake: 0.18,
  },
  hud: {
    airTimeFadeInMs: 150,
    airTimeFadeOutMs: 150,
    minimapDiameterPx: 120,
  },
  performance: {
    targetFps: 60,             // LIT-GAME-008
    drawCallsMax: 150,         // LIT-DIM-005
  },
  pickups: {
    // Level pack §6 — side-alternating
    ts: [0.15, 0.35, 0.55, 0.75, 0.92] as const,
    laterals: [-0.55, +0.60, -0.50, +0.45, -0.55] as const,
    boostGain: 0.5,
  },
  airZones: [
    // Level pack §7
    { label: 'Waterfall Drop', enter: 0.345, exit: 0.420, expectedS: 1.1 },
    { label: 'Canyon Plunge',  enter: 0.740, exit: 0.810, expectedS: 2.3 },
  ] as const,
  controls: {
    keys: ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space'] as const, // LIT-GAME-006
  },
  fog: {
    near: 80,
    far: 600,
    density: 0.004,
  },
  events: {
    // LIT-EVT-001
    channels: ['time', 'position', 'boostCharge', 'airTime', 'playerT', 'rivalsT'] as const,
  },
  models: {
    jetski: {
      url: 'assets/models/kawasaki_310xultra_jet_ski.glb',
      targetLength: 3.0,
      rotationYOffset: 0,
      yOffset: -0.1,
    },
    driver: {
      url: 'assets/models/race_driver.glb',
      targetHeight: 2.2,
      yOffset: 1.0,
    },
    palm: {
      url: 'assets/models/Palm Tree.glb',
      targetHeight: 36.0,
    },
    baobab: {
      url: 'assets/models/Boab.glb',
      targetHeight: 16.0,
    },
    mountain: {
      url: 'assets/models/Mountain.glb',
      targetHeight: 22.0,
    },
  },
  textures: {
    waterNormals: 'assets/textures/waternormals.jpg',
  },
};
