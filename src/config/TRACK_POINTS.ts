import { Vector3, MathUtils } from 'three';

// 26 control points from spec/level_design_pack.md §2 — "Coral Kahuna Slide".
// `roll` stored in radians (converted from the degrees in the level pack).

export interface TrackPoint {
  label: string;
  pos: Vector3;
  rollDeg: number;
  tApprox: number;
}

const raw: Array<{ label: string; x: number; y: number; z: number; rollDeg: number; t: number }> = [
  // Extreme roller-coaster profile. Four hero drops, each about 3× the
  // previous pass. Drop Z spans stretched so slopes stay under ~60° and the
  // follow camera can still track the player through vertical sections.
  { label: 'start_line',         x:   0, y: 180, z:     0, rollDeg:   0, t: 0.000 },
  { label: 'start_straight_out', x:   0, y: 170, z:   -60, rollDeg:   0, t: 0.030 },
  { label: 'gentle_right_1',     x:  12, y: 158, z:  -120, rollDeg:  -6, t: 0.060 },
  { label: 'gentle_right_2',     x:  32, y: 148, z:  -175, rollDeg: -10, t: 0.090 },
  { label: 'lagoon_bend_apex',   x:  56, y: 144, z:  -215, rollDeg: -14, t: 0.120 }, // flat bend
  { label: 'lagoon_bend_exit',   x:  76, y: 120, z:  -275, rollDeg: -10, t: 0.150 }, // -24 warm-up slope
  { label: 'left_bank_entry',    x:  80, y: 110, z:  -350, rollDeg:   0, t: 0.180 },
  { label: 'left_bank_apex',     x:  60, y:  42, z:  -430, rollDeg: +18, t: 0.210 }, // -68 DROP 1 (mini-mega)
  { label: 'left_bank_exit',     x:  30, y:  38, z:  -500, rollDeg: +10, t: 0.240 }, // recovery
  { label: 'cliff_sprint_enter', x:  10, y:  36, z:  -560, rollDeg:   0, t: 0.270 },
  { label: 'cliff_sprint_mid',   x:  -8, y:  36, z:  -640, rollDeg:   0, t: 0.310 },
  { label: 'drop1_lip',          x: -18, y:  40, z:  -720, rollDeg:   0, t: 0.345 }, // lift hump
  { label: 'drop1_bottom',       x: -28, y:-130, z:  -830, rollDeg:  -4, t: 0.380 }, // -170 DROP 2 (waterfall)
  { label: 'tube_enter',         x: -32, y:-138, z:  -910, rollDeg:   0, t: 0.420 },
  { label: 'tube_mid_left',      x: -36, y:-144, z:  -990, rollDeg: +22, t: 0.470 },
  { label: 'tube_mid_right',     x: -28, y:-144, z: -1070, rollDeg: -22, t: 0.515 }, // flat tube recovery
  { label: 'tube_exit',          x: -14, y:-138, z: -1150, rollDeg:   0, t: 0.555 }, // tiny rise
  { label: 's_curve_a',          x:  10, y:-160, z: -1220, rollDeg: -12, t: 0.600 }, // -22
  { label: 's_curve_b',          x:  34, y:-248, z: -1300, rollDeg: +14, t: 0.645 }, // -88 DROP 3
  { label: 's_curve_c',          x:  18, y:-252, z: -1380, rollDeg:  -8, t: 0.690 },
  { label: 'drop2_lip',          x:   0, y:-244, z: -1460, rollDeg:   0, t: 0.740 }, // lift hump
  { label: 'drop2_airborne_mid', x: -10, y:-360, z: -1560, rollDeg:   0, t: 0.775 },
  { label: 'drop2_bottom',       x: -22, y:-460, z: -1660, rollDeg:  +6, t: 0.810 }, // -216 DROP 4 (MEGA)
  { label: 'chicane_left',       x: -20, y:-470, z: -1760, rollDeg: +16, t: 0.860 },
  { label: 'chicane_right',      x:  -2, y:-480, z: -1850, rollDeg: -16, t: 0.910 },
  { label: 'finish_straight',    x:  12, y:-490, z: -1940, rollDeg:   0, t: 0.960 },
  { label: 'finish_arch',        x:  20, y:-500, z: -2020, rollDeg:   0, t: 1.000 },
];

export const TRACK_POINTS: TrackPoint[] = raw.map((r) => ({
  label: r.label,
  pos: new Vector3(r.x, r.y, r.z),
  rollDeg: r.rollDeg,
  tApprox: r.t,
}));

export const TRACK_POSITIONS: Vector3[] = TRACK_POINTS.map((p) => p.pos.clone());
export const TRACK_ROLLS_RAD: number[] = TRACK_POINTS.map((p) => MathUtils.degToRad(p.rollDeg));
