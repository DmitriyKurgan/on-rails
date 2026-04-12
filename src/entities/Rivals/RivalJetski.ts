import { Group, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import type { ColorToken } from '@/config';
import { CFG } from '@/config';
import { buildJetskiMesh } from '@/entities/Jetski/buildJetskiMesh';
import { tintJetski } from '@/loaders/AssetLoader';
import type { Road } from '@/world/Road';

export interface RivalInit {
  role: string;
  color: ColorToken;
  t: number;
  lateral: number;
  speedMul: number;
  meshOverride?: Group;
}

export class RivalJetski {
  readonly group: Group;
  readonly position = new Vector3();
  t: number;
  lateral: number;
  readonly speedMul: number;
  readonly role: string;
  readonly color: ColorToken;
  private lateralTarget: number;
  private noiseSeed: number;

  private readonly tmpLook = new Matrix4();
  private readonly tmpQuat = new Quaternion();
  private readonly tmpTarget = new Vector3();
  private readonly tmpWorldUp = new Vector3(0, 1, 0);

  constructor(private readonly road: Road, init: RivalInit) {
    if (init.meshOverride) {
      this.group = init.meshOverride;
      tintJetski(this.group, init.color);
    } else {
      this.group = buildJetskiMesh({
        primary: init.color,
        secondary: 'player_yellow',
        includeRider: false,
      });
    }
    this.t = init.t;
    this.lateral = init.lateral;
    this.lateralTarget = init.lateral;
    this.speedMul = init.speedMul;
    this.role = init.role;
    this.color = init.color;
    this.noiseSeed = Math.random() * 1000;
    this.road.getPointAt(this.t, this.position);
    this.group.position.copy(this.position);
  }

  update(dt: number, elapsed: number, playerT: number, playerLateral: number): void {
    // Perlin-ish noise as weave target
    const wave = Math.sin((elapsed + this.noiseSeed) * 0.6 + this.t * 3.0) * 0.55;
    this.lateralTarget = MathUtils.clamp(wave, -CFG.player.lateralMax, CFG.player.lateralMax);

    // Avoid the player when close in t-space
    const dt_t = Math.abs(this.t - playerT);
    if (dt_t < 0.005 && Math.abs(this.lateral - playerLateral) < CFG.rivals.avoidDist) {
      const push = this.lateral >= playerLateral ? +1 : -1;
      this.lateralTarget = MathUtils.clamp(this.lateralTarget + push * 0.4, -CFG.player.lateralMax, CFG.player.lateralMax);
    }

    this.lateral = MathUtils.damp(this.lateral, this.lateralTarget, 4, dt);

    this.t += (CFG.track.baseSpeed * this.speedMul * dt) / this.road.length;
    if (this.t > 1) this.t = 1;

    const frame = this.road.getFrameAt(this.t);
    this.road.getPointAt(this.t, this.position);
    const halfW = this.road.width * 0.5;
    this.position.addScaledVector(frame.binormal, this.lateral * halfW * 0.75);
    this.position.y += 0.5;
    this.group.position.copy(this.position);

    this.tmpTarget.copy(this.position).add(frame.tangent);
    this.tmpLook.lookAt(this.position, this.tmpTarget, this.tmpWorldUp);
    this.tmpQuat.setFromRotationMatrix(this.tmpLook);
    this.group.quaternion.slerp(this.tmpQuat, 0.28);
  }
}
