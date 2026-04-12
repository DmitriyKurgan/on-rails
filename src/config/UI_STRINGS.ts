// HUD string literals — source: spec/literal_values_registry.json §uiStrings (LIT-UI-001..008)
// These strings MUST NOT be duplicated anywhere else in the codebase.

export const UI_STRINGS = {
  pos: 'POS',                 // LIT-UI-001
  time: 'TIME',               // LIT-UI-003
  airTime: 'AIR TIME',        // LIT-UI-005
  boost: 'BOOST',             // LIT-UI-007
  pauseGlyph: '\u2016',       // LIT-UI-008  ‖
  airTimeUnit: ' s',          // space before 's' per LIT-UI-006
  // Seed / hero-moment anchors from the reference screenshot. Retained as literals
  // for the spec-alignment audit; runtime HUD uses the format helpers below.
  posSeed: '2/6',             // LIT-UI-002
  timeSeed: '00:45.36',       // LIT-UI-004
  airTimeSeed: '2.3 s',       // LIT-UI-006
} as const;

export const UI_FORMATS = {
  // "POS 2/6" — format for LIT-UI-002
  posValue(current: number, total: number): string {
    return `${current}/${total}`;
  },
  // "00:45.36" — mm:ss.cc format for LIT-UI-004
  timeValue(seconds: number): string {
    const clamped = Math.max(0, seconds);
    const mm = Math.floor(clamped / 60);
    const ss = Math.floor(clamped % 60);
    const cc = Math.floor((clamped - Math.floor(clamped)) * 100);
    return `${pad2(mm)}:${pad2(ss)}.${pad2(cc)}`;
  },
  // "2.3 s" — space before 's' mandated by LIT-UI-006
  airTimeValue(seconds: number): string {
    return `${seconds.toFixed(1)}${UI_STRINGS.airTimeUnit}`;
  },
} as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
