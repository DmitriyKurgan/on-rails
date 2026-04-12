import { Group } from 'three';
import { CFG, type ColorToken } from '@/config';
import type { Road } from '@/world/Road';
import type { Player } from '@/entities/Player/Player';
import { RivalJetski, type RivalInit } from './RivalJetski';

// Manages 5 rival jetskis and live race position (LIT-GAME-001/002/004).
export class RivalManager {
  readonly group = new Group();
  readonly rivals: RivalJetski[] = [];

  constructor(
    private readonly road: Road,
    meshFactory?: () => Group | null,
  ) {
    for (const spec of CFG.rivals.starts) {
      const init: RivalInit = {
        role: spec.role,
        color: spec.color as ColorToken,
        t: spec.t,
        lateral: spec.lateral,
        speedMul: spec.speedMul,
        meshOverride: meshFactory?.() ?? undefined,
      };
      const rival = new RivalJetski(this.road, init);
      this.rivals.push(rival);
      this.group.add(rival.group);
    }
  }

  update(dt: number, elapsed: number, player: Player): void {
    for (const r of this.rivals) {
      r.update(dt, elapsed, player.t, player.lateralOffset);
    }
  }

  // Current player position = 1 + number of rivals with greater t than player
  playerPosition(player: Player): number {
    let ahead = 0;
    for (const r of this.rivals) if (r.t > player.t) ahead++;
    return ahead + 1;
  }

  rivalTs(): number[] {
    return this.rivals.map((r) => r.t);
  }
}
