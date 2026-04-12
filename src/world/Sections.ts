// Level pack §3 — section table. Consumed by AI director, camera biases, and HUD landmark cues.

export interface TrackSection {
  name: string;
  tStart: number;
  tEnd: number;
  features: readonly string[];
  intensity: number;
  propDensity: 'low' | 'medium' | 'high' | 'very_high';
}

export const SECTIONS: readonly TrackSection[] = [
  { name: 'Start Straight',     tStart: 0.000, tEnd: 0.060, features: ['straight'],                          intensity: 0.10, propDensity: 'low' },
  { name: 'Lagoon Bend',        tStart: 0.060, tEnd: 0.180, features: ['gentle_right', 'slight_banking'],    intensity: 0.30, propDensity: 'medium' },
  { name: 'Left Banking Curve', tStart: 0.180, tEnd: 0.270, features: ['banking'],                           intensity: 0.45, propDensity: 'medium' },
  { name: 'Cliff Sprint',       tStart: 0.270, tEnd: 0.345, features: ['straight', 'narrow'],                intensity: 0.55, propDensity: 'high' },
  { name: 'Waterfall Drop',     tStart: 0.345, tEnd: 0.420, features: ['vertical_drop', 'airborne'],         intensity: 0.70, propDensity: 'high' },
  { name: 'Tiki Tube',          tStart: 0.420, tEnd: 0.555, features: ['tube', 'banked_corkscrew'],          intensity: 0.75, propDensity: 'very_high' },
  { name: 'S-Curve Cove',       tStart: 0.555, tEnd: 0.740, features: ['s_curves', 'gentle_banking'],        intensity: 0.60, propDensity: 'medium' },
  { name: 'Canyon Plunge',      tStart: 0.740, tEnd: 0.810, features: ['vertical_drop', 'airborne_2_3s'],    intensity: 0.95, propDensity: 'low' },
  { name: 'Finish Chicane',     tStart: 0.810, tEnd: 0.960, features: ['chicane', 'pickup_lane'],            intensity: 0.80, propDensity: 'high' },
  { name: 'Finish Arch',        tStart: 0.960, tEnd: 1.000, features: ['straight', 'confetti'],              intensity: 0.20, propDensity: 'medium' },
] as const;

export function sectionAt(t: number): TrackSection {
  for (const s of SECTIONS) {
    if (t >= s.tStart && t < s.tEnd) return s;
  }
  return SECTIONS[SECTIONS.length - 1];
}
