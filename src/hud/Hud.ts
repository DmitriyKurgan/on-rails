import { CFG, UI_FORMATS, UI_STRINGS } from '@/config';
import type { EventBus } from '@/core/EventBus';
import type { Road } from '@/world/Road';

export class Hud {
  private readonly root: HTMLElement;
  private readonly posValue: HTMLElement;
  private readonly timeValue: HTMLElement;
  private readonly airtimePill: HTMLElement;
  private readonly airtimeValue: HTMLElement;
  private readonly boostRing: SVGCircleElement;
  private readonly minimapPlayer: SVGCircleElement;
  private readonly minimapRivals: SVGCircleElement[] = [];
  private readonly minimapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(root: HTMLElement, bus: EventBus, road: Road) {
    this.root = root;
    this.root.innerHTML = '';

    // --- Top-left: pause glyph + POS pill ---
    const topLeft = document.createElement('div');
    topLeft.className = 'hud-cluster top-left';

    const pause = document.createElement('div');
    pause.className = 'hud-pill hud-pause';
    pause.textContent = UI_STRINGS.pauseGlyph;
    topLeft.appendChild(pause);

    const posPill = document.createElement('div');
    posPill.className = 'hud-pill';
    const posLabel = document.createElement('span');
    posLabel.className = 'hud-label';
    posLabel.textContent = UI_STRINGS.pos;
    const posVal = document.createElement('span');
    posVal.className = 'hud-value';
    posVal.textContent = UI_FORMATS.posValue(CFG.player.seedPosition, CFG.race.totalRacers);
    posPill.appendChild(posLabel);
    posPill.appendChild(posVal);
    topLeft.appendChild(posPill);
    this.posValue = posVal;

    // --- Top-right: TIME + AIR TIME ---
    const topRight = document.createElement('div');
    topRight.className = 'hud-cluster top-right';

    const timePill = document.createElement('div');
    timePill.className = 'hud-pill';
    const timeLabel = document.createElement('span');
    timeLabel.className = 'hud-label';
    timeLabel.textContent = UI_STRINGS.time;
    const timeVal = document.createElement('span');
    timeVal.className = 'hud-value';
    timeVal.textContent = UI_FORMATS.timeValue(0);
    timePill.appendChild(timeLabel);
    timePill.appendChild(timeVal);
    topRight.appendChild(timePill);
    this.timeValue = timeVal;

    const airPill = document.createElement('div');
    airPill.className = 'hud-pill hud-airtime';
    const airLabel = document.createElement('span');
    airLabel.className = 'hud-label';
    airLabel.textContent = UI_STRINGS.airTime;
    const airVal = document.createElement('span');
    airVal.className = 'hud-value';
    airVal.textContent = UI_FORMATS.airTimeValue(0);
    airPill.appendChild(airLabel);
    airPill.appendChild(airVal);
    topRight.appendChild(airPill);
    this.airtimePill = airPill;
    this.airtimeValue = airVal;

    // --- Bottom-right: power-up slot + BOOST ---
    const bottomRight = document.createElement('div');
    bottomRight.className = 'hud-cluster bottom-right';

    const powerup = document.createElement('div');
    powerup.className = 'hud-powerup';
    powerup.textContent = '\u{1F9EA}';
    bottomRight.appendChild(powerup);

    const boostBtn = document.createElement('div');
    boostBtn.className = 'hud-pill hud-boost-btn';
    const boostLabel = document.createElement('span');
    boostLabel.className = 'hud-value';
    boostLabel.textContent = UI_STRINGS.boost;
    boostBtn.appendChild(boostLabel);

    const boostRingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    boostRingSvg.setAttribute('viewBox', '0 0 100 100');
    boostRingSvg.classList.add('hud-boost-ring');
    const ringBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ringBg.setAttribute('cx', '50');
    ringBg.setAttribute('cy', '50');
    ringBg.setAttribute('r', '44');
    ringBg.setAttribute('fill', 'none');
    ringBg.setAttribute('stroke', 'rgba(11,22,38,0.7)');
    ringBg.setAttribute('stroke-width', '6');
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', '50');
    ring.setAttribute('cy', '50');
    ring.setAttribute('r', '44');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', 'var(--hud-boost-ring)');
    ring.setAttribute('stroke-width', '6');
    ring.setAttribute('stroke-linecap', 'round');
    ring.setAttribute('stroke-dasharray', '276');
    ring.setAttribute('stroke-dashoffset', '276');
    ring.setAttribute('transform', 'rotate(-90 50 50)');
    boostRingSvg.appendChild(ringBg);
    boostRingSvg.appendChild(ring);
    boostBtn.appendChild(boostRingSvg);
    this.boostRing = ring;

    bottomRight.appendChild(boostBtn);

    // --- Bottom-left: minimap ---
    const bottomLeft = document.createElement('div');
    bottomLeft.className = 'hud-cluster bottom-left';
    const minimap = document.createElement('div');
    minimap.className = 'hud-minimap';

    const mapSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mapSvg.setAttribute('viewBox', '0 0 100 100');

    // Compute minimap bounds from the track curve (XZ projection)
    const pts = road.curve.getSpacedPoints(80);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const pad = 6;
    this.minimapBounds = { minX, maxX, minZ, maxZ };
    const xRange = maxX - minX || 1;
    const zRange = maxZ - minZ || 1;

    const proj = (x: number, z: number): [number, number] => [
      pad + ((x - minX) / xRange) * (100 - pad * 2),
      pad + ((z - minZ) / zRange) * (100 - pad * 2),
    ];

    let pathD = '';
    pts.forEach((p, i) => {
      const [px, py] = proj(p.x, p.z);
      pathD += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
    });
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(255,255,255,0.9)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    mapSvg.appendChild(path);

    // Rival dots (5)
    for (let i = 0; i < CFG.race.aiRivalCount; i++) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2.4');
      dot.setAttribute('fill', 'var(--hud-rival-dot)');
      mapSvg.appendChild(dot);
      this.minimapRivals.push(dot);
    }
    // Player dot
    const playerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    playerDot.setAttribute('r', '3.2');
    playerDot.setAttribute('fill', 'var(--hud-player-dot)');
    playerDot.setAttribute('stroke', 'white');
    playerDot.setAttribute('stroke-width', '0.8');
    mapSvg.appendChild(playerDot);
    this.minimapPlayer = playerDot;

    (minimap as HTMLElement).appendChild(mapSvg);
    bottomLeft.appendChild(minimap);

    this.root.append(topLeft, topRight, bottomLeft, bottomRight);

    // Subscribe to event bus
    bus.on('hud:time', ({ seconds }) => {
      this.timeValue.textContent = UI_FORMATS.timeValue(seconds);
    });
    bus.on('hud:pos', ({ current, total }) => {
      this.posValue.textContent = UI_FORMATS.posValue(current, total);
    });
    bus.on('hud:boost', ({ charge }) => {
      const dash = 276;
      this.boostRing.setAttribute('stroke-dashoffset', String(dash * (1 - charge)));
    });
    bus.on('hud:airtime', ({ seconds, visible }) => {
      this.airtimeValue.textContent = UI_FORMATS.airTimeValue(seconds);
      this.airtimePill.classList.toggle('visible', visible);
    });
    bus.on('hud:minimap', ({ playerT, rivalsT }) => {
      const project = (t: number): [number, number] => {
        const p = road.curve.getPointAt(Math.max(0, Math.min(1, t)));
        const xRange2 = this.minimapBounds.maxX - this.minimapBounds.minX || 1;
        const zRange2 = this.minimapBounds.maxZ - this.minimapBounds.minZ || 1;
        return [
          pad + ((p.x - this.minimapBounds.minX) / xRange2) * (100 - pad * 2),
          pad + ((p.z - this.minimapBounds.minZ) / zRange2) * (100 - pad * 2),
        ];
      };
      const [px, py] = project(playerT);
      this.minimapPlayer.setAttribute('cx', px.toFixed(1));
      this.minimapPlayer.setAttribute('cy', py.toFixed(1));
      rivalsT.forEach((t, i) => {
        const dot = this.minimapRivals[i];
        if (!dot) return;
        const [rx, ry] = project(t);
        dot.setAttribute('cx', rx.toFixed(1));
        dot.setAttribute('cy', ry.toFixed(1));
      });
    });
  }
}
