import { MathUtils, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { CFG } from '@/config';

const WORLD_UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, -1);

export interface RoadFrame {
  tangent: Vector3;
  normal: Vector3;
  binormal: Vector3;
}

export interface RoadSampler {
  getPointAt(t: number, out?: Vector3): Vector3;
  getFrameAt(t: number): RoadFrame;
}

// Follow camera that NEVER snaps. Position uses Vector3.lerp, orientation uses
// Quaternion.slerp assembled via Matrix4.lookAt (never camera.lookAt directly,
// per the spec rule 3 in the workflow brief).
export class CameraController {
  private readonly camera: PerspectiveCamera;
  private readonly tmpOffset = new Vector3();
  private readonly tmpTargetPos = new Vector3();
  private readonly tmpLookAt = new Vector3();
  private readonly tmpMatrix = new Matrix4();
  private readonly tmpQuat = new Quaternion();

  private fovTarget = CFG.camera.fov;
  private shakeT = 0;
  private shakeAmp = 0;
  private rollTarget = 0;
  private rollCurrent = 0;

  constructor(camera: PerspectiveCamera) {
    this.camera = camera;
    this.camera.fov = CFG.camera.fov;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, playerT: number, playerPos: Vector3, road: RoadSampler): void {
    const frame = road.getFrameAt(playerT);
    const [ox, oy, oz] = CFG.camera.followOffset;

    // Camera uses WORLD up for Y offset (not frame.normal) so horizon stays
    // anchored to gravity. The track binormal still drives lateral position
    // so the camera banks with the rails on curves.
    this.tmpOffset
      .set(0, 0, 0)
      .addScaledVector(frame.binormal, ox)
      .addScaledVector(WORLD_UP, oy)
      .addScaledVector(frame.tangent, -oz);

    this.tmpTargetPos.copy(playerPos).add(this.tmpOffset);
    this.camera.position.lerp(this.tmpTargetPos, CFG.camera.lerpAlphaPos);

    const lookT = Math.min(playerT + CFG.camera.lookaheadT, 1);
    road.getPointAt(lookT, this.tmpLookAt);
    // Lift the look-at target along world up so horizon sits in the upper
    // third of the frame (reference screenshot framing).
    this.tmpLookAt.addScaledVector(WORLD_UP, CFG.camera.lookTargetLift);
    this.tmpMatrix.lookAt(this.camera.position, this.tmpLookAt, WORLD_UP);
    this.tmpQuat.setFromRotationMatrix(this.tmpMatrix);
    this.camera.quaternion.slerp(this.tmpQuat, CFG.camera.lerpAlphaRot);

    // Camera roll into turns — gives a dynamic racing feel
    this.rollCurrent = MathUtils.damp(this.rollCurrent, this.rollTarget, 4, dt);
    if (Math.abs(this.rollCurrent) > 0.001) {
      const rollQ = new Quaternion().setFromAxisAngle(FORWARD, MathUtils.degToRad(this.rollCurrent));
      this.camera.quaternion.multiply(rollQ);
    }

    // FOV breathing (boost kick/exhale)
    if (Math.abs(this.camera.fov - this.fovTarget) > 0.01) {
      this.camera.fov = MathUtils.damp(this.camera.fov, this.fovTarget, 8, dt);
      this.camera.updateProjectionMatrix();
    }

    // Shake (landing / damage)
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(this.shakeT, 0) * this.shakeAmp;
      this.camera.position.x += (Math.random() * 2 - 1) * k;
      this.camera.position.y += (Math.random() * 2 - 1) * k;
    }
  }

  setFov(target: number): void {
    this.fovTarget = target;
  }

  setRoll(degrees: number): void {
    this.rollTarget = degrees;
  }

  shake(amp: number, durationMs: number): void {
    this.shakeAmp = amp;
    this.shakeT = durationMs / 1000;
  }

  onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
