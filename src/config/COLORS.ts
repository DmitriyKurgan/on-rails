// Palette tokens — source: spec/art_direction_pack.md §2
// Every hex in the game MUST come from this file. Any other hex literal is a bug.

export const COLORS = {
  // Sky & atmosphere
  sky_top:          0x2FA6E8,
  sky_mid:          0x6FC9F2,
  sky_haze:         0xBFE6F7,
  cloud_white:      0xFFFFFF,
  cloud_shadow:     0xD4E8F2,
  sun_warm:         0xFFE7A8,
  sun_disc:         0xFFF6C2,

  // Water
  water_shallow:    0x6FE3D6,
  water_mid:        0x2BBFC9,
  water_deep:       0x0E7A9B,
  water_rim:        0xA9F2E8,
  water_foam:       0xFFFFFF,
  water_foam_soft:  0xE8FAFB,

  // Track walls (orange tubes)
  wall_orange:      0xFF6A1F,
  wall_orange_hi:   0xFFB26B,
  wall_orange_shadow: 0xB33A08,
  wall_rim:         0xFFE3A8,
  wall_stripe_white: 0xFFFFFF,

  // Vegetation
  palm_green:       0x3FA83B,
  palm_green_dark:  0x1E5E24,
  palm_trunk:       0x6B4A2B,
  grass_green:      0x5FC247,
  flower_red:       0xE83A2E,
  flower_pink:      0xFF6FA8,
  flower_yellow:    0xFFD23A,

  // Ground & rock
  sand:             0xF1DDA4,
  sand_wet:         0xC9A968,
  sand_dune:        0xE9C87B,
  rock_grey:        0x7C8A8F,
  rock_grey_dark:   0x4A575C,
  rock_warm:        0xA08A72,

  // Architecture (huts)
  hut_wood:         0x8A5A2C,
  hut_wood_dark:    0x5A3618,
  hut_thatch:       0xC9953E,
  hut_thatch_dark:  0x7A5516,

  // Player jetski
  player_green:       0xB4FF2E, // LIT-COLOR-001
  player_green_dark:  0x5FA60D,
  player_yellow:      0xFFD200, // LIT-COLOR-002
  player_black:       0x1A1A1A,
  rider_vest_orange:  0xFF7A1F,
  rider_skin:         0xD9A07A,
  rider_helmet_black: 0x222222,

  // Rival jetski
  rival_purple:        0x8A3CE0, // LIT-COLOR-003 — Leader in reference screenshot
  rival_purple_dark:   0x4B1B80,
  rival_accent_magenta: 0xE04BD6,
  rival_red:           0xE83A2E,
  rival_blue:          0x2F7FE8,
  rival_yellow:        0xFFD23A,
  rival_turquoise:     0x2BBFC9,
  rival_black:         0x1A1A1A,

  // Lighting (reference values)
  light_sun:         0xFFE7A8, // LIT-COLOR-007, LIT-LIGHT-002
  light_hemi_sky:    0xBFE6F7,
  light_hemi_ground: 0x7BC96B,
  light_ambient:     0xF0E6CC,

  // FX & particles
  spray_white:       0xFFFFFF,
  spray_blue:        0xCFF4FF,
  boost_cyan:        0x5EF0FF,
  boost_white:       0xFFFFFF,
  waterfall_white:   0xFFFFFF,
  waterfall_tint:    0xBCE9F2,

  // HUD
  ui_pill_bg:          0x0B1626,
  ui_pill_stroke:      0xFFFFFF,
  ui_text_primary:     0xFFFFFF,
  ui_text_accent_red:  0xFF4A4A,
  ui_text_accent_yellow: 0xFFD23A,
  ui_boost_ring:       0xCFF4FF,
  ui_boost_ring_bg:    0x0B1626,
} as const;

export type ColorToken = keyof typeof COLORS;

// Helper: convert stored 0xRRGGBB integer to a CSS hex string.
export function toCss(token: ColorToken, alpha?: number): string {
  const v = COLORS[token];
  const hex = '#' + v.toString(16).padStart(6, '0');
  if (alpha === undefined) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}
