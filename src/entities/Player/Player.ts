import { Group, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { CFG } from '@/config';
import { buildJetskiMesh } from '@/entities/Jetski/buildJetskiMesh';
import type { Road } from '@/world/Road';
import type { Input } from '@/core/Input';

export type PlayerState = 'riding' | 'airborne';

export class Player {
  readonly group: Group;
  readonly position = new Vector3();
  readonly velocity = new Vector3();

  state: PlayerState = 'riding';
  t = CFG.rivals.playerStartT;
  lateralOffset = 0;
  lateralTarget = 0;
  steerYaw = 0;          // smoothed -1..+1 steer input for nose yaw
  speed = CFG.track.baseSpeed * CFG.player.baseSpeedMul;
  boostCharge = 0.5;
  boostActive = false;
  airTime = 0;
  airTimeLast = 0;

  private readonly tmpLook = new Matrix4();
  private readonly tmpQuat = new Quaternion();
  private readonly tmpTarget = new Vector3();
  private readonly tmpWorldUp = new Vector3(0, 1, 0);

  constructor(private readonly road: Road, meshOverride?: Group) {
    // If a pre-loaded GLB mesh is provided, use it as the jet ski body.
    // Otherwise fall back to the procedural placeholder. The procedural
    // fallback already includes a rider; with a GLB we leave rider rendering
    // to whatever the GLB provides.
    this.group = meshOverride ?? buildJetskiMesh({
      primary: 'player_green',
      secondary: 'player_yellow',
      includeRider: true,
    });
    this.group.position.copy(this.road.getPointAt(this.t, this.position));
  }

  update(dt: number, input: Input): void {
    // Steering intent — smooth-damped, never a snap
    const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.lateralTarget = MathUtils.clamp(
      this.lateralTarget + steerInput * dt * 3.5,
      -CFG.player.lateralMax,
      CFG.player.lateralMax,
    );
    // Auto-center when no input
    if (steerInput === 0) {
      this.lateralTarget = MathUtils.damp(this.lateralTarget, 0, 1.5, dt);
    }
    this.lateralOffset = MathUtils.damp(
      this.lateralOffset,
      this.lateralTarget,
      CFG.player.lateralDampCoef,
      dt,
    );

    // Smooth nose yaw: while a steer key is held the target is ±1, on
    // release it damps back toward 0 and the nose realigns with forward.
    this.steerYaw = MathUtils.damp(this.steerYaw, steerInput, 5, dt);

    // Boost — ignition / drain / exhale
    const wantsBoost = input.boost && this.boostCharge > 0.02;
    this.boostActive = wantsBoost;
    const cruiseSpeed = CFG.track.baseSpeed * CFG.player.baseSpeedMul;
    const targetSpeed = cruiseSpeed * (this.boostActive ? CFG.player.boostMultiplier : 1);
    const rampCoef = this.boostActive ? 1 / CFG.player.boostRampUp : 1 / CFG.player.boostRampDown;
    this.speed = MathUtils.damp(this.speed, targetSpeed, rampCoef, dt);

    if (this.boostActive) {
      this.boostCharge = Math.max(0, this.boostCharge - CFG.player.boostDrainRate * dt);
    } else {
      this.boostCharge = Math.min(1, this.boostCharge + CFG.player.boostRegen * dt);
    }

    // Advance along spline
    this.t += (this.speed * dt) / this.road.length;
    if (this.t > 1) this.t = 1;

    // Compute world position from curve + lateral binormal offset
    const frame = this.road.getFrameAt(this.t);
    this.road.getPointAt(this.t, this.position);
    const halfW = this.road.width * 0.5;
    this.position.addScaledVector(frame.binormal, this.lateralOffset * halfW * 0.75);
    // Lift off the floor plane along WORLD up so the hull always sits above
    // the water (frame.normal can be tilted by roll, which we don't want for
    // the hull float height).
    this.position.y += 0.55;

    this.group.position.copy(this.position);

    // Orientation: forward = tangent, up = world Y (so the jetski is upright
    // on straights and the scene stops feeling 90° rotated). Lean/bank comes
    // from an explicit roll quaternion around the tangent axis, and an extra
    // yaw around world-up turns the nose into the steer direction.
    this.tmpTarget.copy(this.position).add(frame.tangent);
    this.tmpLook.lookAt(this.position, this.tmpTarget, this.tmpWorldUp);
    this.tmpQuat.setFromRotationMatrix(this.tmpLook);

    // Lean / roll around the tangent (bank into the turn)
    const leanRad = MathUtils.degToRad(-this.lateralOffset * CFG.player.leanMaxDeg);
    const leanQ = new Quaternion().setFromAxisAngle(frame.tangent, leanRad);
    this.tmpQuat.premultiply(leanQ);

    // Nose yaw around world Y. Positive Y rotation in three.js turns -Z
    // (our forward) toward -X, so steering RIGHT (steerInput +1) must map
    // to a NEGATIVE yaw for the nose to tilt right.
    const yawRad = -this.steerYaw * 0.35; // up to ~20°
    const yawQ = new Quaternion().setFromAxisAngle(this.tmpWorldUp, yawRad);
    this.tmpQuat.premultiply(yawQ);

    this.group.quaternion.slerp(this.tmpQuat, 0.3);

    // Air-time zones (level pack §7) — scripted so Canyon Plunge always shows 2.3 s.
    // Each zone interpolates accumulated airTime so the HUD literal matches the spec
    // regardless of player speed within the drop.
    let inAirZone = false;
    for (const zone of CFG.airZones) {
      if (this.t >= zone.enter && this.t < zone.exit) {
        inAirZone = true;
        const progress = (this.t - zone.enter) / (zone.exit - zone.enter);
        this.airTime = progress * zone.expectedS;
        if (this.state !== 'airborne') {
          this.state = 'airborne';
        }
        // Visual lift — small ballistic arc above the rail
        const arc = Math.sin(progress * Math.PI) * (zone.expectedS * 0.9);
        this.position.y += arc;
        this.group.position.y = this.position.y;
        break;
      }
    }
    if (!inAirZone && this.state === 'airborne') {
      this.airTimeLast = this.airTime;
      this.state = 'riding';
      this.airTime = 0;
    }
  }

  addBoostCharge(amount: number): void {
    this.boostCharge = Math.min(1, this.boostCharge + amount);
  }
}
